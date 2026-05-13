import * as anchor from "@coral-xyz/anchor";
import BN from "bn.js";
import { Buffer } from "buffer";
import {
  Connection,
  Ed25519Program,
  Keypair,
  PublicKey,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { createHash } from "crypto";
import nacl from "tweetnacl";
import * as fs from "fs";
import * as path from "path";

const DEFAULT_RPC_URL = "https://api.devnet.solana.com";
const DEFAULT_PROGRAM_ID = "3ZaZPotJCG3fzUvVjbZLLDYcvn8zwdg73n8DC9uwfcX6";
const TRUSTED_AI_AUTHORITY = "GQ7UU2BurgDEmzfkEfxKY9LwHwzNgPMxyanhbig2hfRZ";
const AI_AUTHORITY_SEED = "guardian_ai_authority_seed_32bytes!";
const EXECUTE_WITH_VERIFIED_DECISION_DISCRIMINATOR = Buffer.from([
  0x15, 0xb6, 0x02, 0x2a, 0xf4, 0x63, 0x19, 0xd9,
]);

type DecisionValue = 0 | 1 | 2 | 3;

interface DecisionPackage {
  decision: DecisionValue;
  amount: bigint;
  recipient: PublicKey;
  nonce: bigint;
  expiry_timestamp: bigint;
  delay_seconds: bigint;
  partial_amount: bigint;
}

function u64ToBuffer(value: bigint): Buffer {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64LE(value);
  return buffer;
}

function i64ToBuffer(value: bigint): Buffer {
  const buffer = Buffer.alloc(8);
  buffer.writeBigInt64LE(value);
  return buffer;
}

function nowSeconds(): bigint {
  return BigInt(Math.floor(Date.now() / 1000));
}

const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function decodeBase58(value: string): Uint8Array {
  const input = value.trim();
  if (input.length === 0) {
    return new Uint8Array();
  }

  let num = BigInt(0);
  for (let i = 0; i < input.length; i += 1) {
    const character = input[i];
    const digit = BASE58_ALPHABET.indexOf(character);
    if (digit < 0) {
      throw new Error(`Invalid base58 character: ${character}`);
    }

    num = num * BigInt(58) + BigInt(digit);
  }

  const bytes: number[] = [];
  while (num > BigInt(0)) {
    bytes.push(Number(num % BigInt(256)));
    num /= BigInt(256);
  }

  for (let i = 0; i < input.length && input[i] === "1"; i += 1) {
    bytes.push(0);
  }

  return Uint8Array.from(bytes.reverse());
}

function readJsonKeypair(filePath: string): Keypair {
  const resolvedPath = path.resolve(filePath);
  const raw = fs.readFileSync(resolvedPath, "utf8");
  const secretKey = Uint8Array.from(JSON.parse(raw));
  if (secretKey.length !== 64) {
    throw new Error(
      `Expected a 64-byte Solana keypair file at ${resolvedPath}, got ${secretKey.length} bytes`,
    );
  }

  return Keypair.fromSecretKey(secretKey);
}

function readSignerKeypair(): Keypair {
  const base58SecretKey = process.env.GUARDIAN_SIGNER_SECRET_KEY_BASE58;
  if (base58SecretKey && base58SecretKey.trim() !== "") {
    const secretKey = decodeBase58(base58SecretKey);
    // Accept either a 64-byte secretKey or a 32-byte seed (derive full secretKey)
    if (secretKey.length === 64) {
      return Keypair.fromSecretKey(secretKey);
    }
    if (secretKey.length === 32) {
      const kp = nacl.sign.keyPair.fromSeed(secretKey);
      return Keypair.fromSecretKey(kp.secretKey);
    }

    throw new Error(
      `GUARDIAN_SIGNER_SECRET_KEY_BASE58 must decode to 32-byte seed or 64-byte secretKey, got ${secretKey.length}`,
    );
  }

  const signerKeypairPath = process.env.GUARDIAN_SIGNER_KEYPAIR_PATH;
  if (!signerKeypairPath) {
    throw new Error(
      "Set GUARDIAN_SIGNER_SECRET_KEY_BASE58 or GUARDIAN_SIGNER_KEYPAIR_PATH",
    );
  }

  return readJsonKeypair(signerKeypairPath);
}

function readRecipientPublicKey(): PublicKey {
  const recipientAddress = process.env.GUARDIAN_RECIPIENT_PUBKEY;
  if (!recipientAddress || recipientAddress.trim() === "") {
    throw new Error("GUARDIAN_RECIPIENT_PUBKEY is required");
  }

  const trimmed = recipientAddress.trim();
  try {
    return new PublicKey(trimmed);
  } catch (error) {
    const decoded = decodeBase58(trimmed);
    if (decoded.length === 64) {
      return Keypair.fromSecretKey(Uint8Array.from(decoded)).publicKey;
    }

    throw new Error(
      `GUARDIAN_RECIPIENT_PUBKEY must be a valid Solana public key or 64-byte secret key, got ${decoded.length} decoded bytes`,
    );
  }
}

function deriveFallbackRecipientFromSigner(signer: Keypair): PublicKey {
  const seedMaterial = createHash("sha256")
    .update(Buffer.from("guardian_fallback_recipient"))
    .update(signer.secretKey)
    .digest();
  return Keypair.fromSeed(seedMaterial.subarray(0, 32)).publicKey;
}

function resolveLocalIdlPath(): string | undefined {
  const envPath = process.env.GUARDIAN_IDL_PATH;
  if (envPath && envPath.trim() !== "") {
    return path.resolve(envPath.trim());
  }

  const defaultPath = path.resolve(process.cwd(), "target", "idl", "guardian_executor.json");
  if (fs.existsSync(defaultPath)) {
    return defaultPath;
  }

  return undefined;
}

function envBigInt(name: string): bigint | undefined {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    return undefined;
  }
  return BigInt(value.trim());
}

function envNumber(name: string): number | undefined {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    return undefined;
  }
  const parsed = Number(value.trim());
  if (!Number.isFinite(parsed)) {
    throw new Error(`Environment variable ${name} must be a finite number`);
  }
  return parsed;
}

function readDecisionValue(name: string): DecisionValue | undefined {
  const value = envNumber(name);
  if (value === undefined) {
    return undefined;
  }
  if (![0, 1, 2, 3].includes(value)) {
    throw new Error(`${name} must be one of 0, 1, 2, or 3`);
  }
  return value as DecisionValue;
}

async function ensureSignerFunding(connection: Connection, signer: Keypair): Promise<void> {
  if (process.env.GUARDIAN_SKIP_AIRDROP === "1") {
    return;
  }

  const balanceLamports = BigInt(await connection.getBalance(signer.publicKey, "confirmed"));
  if (balanceLamports >= BigInt(1_000_000_000)) {
    return;
  }

  const attempts = [1_000_000_000, 500_000_000, 100_000_000];
  for (const lamports of attempts) {
    if (balanceLamports >= BigInt(lamports)) {
      return;
    }

    try {
      console.log(
        "[devnet-test] requesting devnet airdrop for signer:",
        signer.publicKey.toBase58(),
        "lamports:",
        lamports,
      );
      const signature = await connection.requestAirdrop(signer.publicKey, lamports);
      const latestBlockhash = await connection.getLatestBlockhash("confirmed");
      await connection.confirmTransaction(
        {
          signature,
          blockhash: latestBlockhash.blockhash,
          lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        },
        "confirmed",
      );
      const fundedBalance = await connection.getBalance(signer.publicKey, "confirmed");
      console.log("[devnet-test] signer balance after airdrop:", fundedBalance);
      return;
    } catch (error) {
      console.log("[devnet-test] airdrop attempt failed for", lamports, "lamports:", error);
    }
  }

  console.log(
    "[devnet-test] continuing without funding; simulation may fail if the signer has no devnet lamports",
  );
}

function createAiAuthority(): Keypair {
  const seedBuffer = Buffer.from(AI_AUTHORITY_SEED);
  const seed = new Uint8Array(seedBuffer.slice(0, 32));
  const keypair = nacl.sign.keyPair.fromSeed(seed);
  return Keypair.fromSecretKey(keypair.secretKey);
}

function computeDecisionHash(decisionData: DecisionPackage): Buffer {
  const payload = Buffer.concat([
    Buffer.from([decisionData.decision]),
    u64ToBuffer(decisionData.amount),
    decisionData.recipient.toBuffer(),
    u64ToBuffer(decisionData.nonce),
    i64ToBuffer(decisionData.expiry_timestamp),
  ]);

  return createHash("sha256").update(payload).digest();
}

function signDecisionHash(decisionHash: Buffer, aiSecretKey: Uint8Array): Buffer {
  if (decisionHash.length !== 32) {
    throw new Error(`decision hash must be 32 bytes, got ${decisionHash.length}`);
  }

  let secretKey: Uint8Array;
  if (aiSecretKey.length === 32) {
    secretKey = nacl.sign.keyPair.fromSeed(aiSecretKey).secretKey;
  } else if (aiSecretKey.length === 64) {
    secretKey = aiSecretKey;
  } else {
    throw new Error(`aiSecretKey must be 32 or 64 bytes, got ${aiSecretKey.length}`);
  }

  const signature = nacl.sign.detached(decisionHash, secretKey);
  if (signature.length !== 64) {
    throw new Error(`signature must be 64 bytes, got ${signature.length}`);
  }

  return Buffer.from(signature);
}

function createEd25519Instruction(
  decisionHash: Buffer,
  signature: Buffer,
  aiPublicKey: PublicKey,
): TransactionInstruction {
  if (signature.length !== 64) {
    throw new Error(`signature must be 64 bytes, got ${signature.length}`);
  }

  return (Ed25519Program as any).createInstructionWithPublicKey({
    publicKey: aiPublicKey.toBuffer(),
    message: decisionHash,
    signature,
  });
}

function encodeInstructionData(
  decisionData: DecisionPackage,
  signature: Buffer,
): Buffer {
  const instructionData = Buffer.alloc(8 + 1 + 8 + 32 + 8 + 8 + 8 + 8 + 64);
  let offset = 0;

  EXECUTE_WITH_VERIFIED_DECISION_DISCRIMINATOR.copy(instructionData, offset);
  offset += 8;

  instructionData.writeUInt8(decisionData.decision, offset);
  offset += 1;

  u64ToBuffer(decisionData.amount).copy(instructionData, offset);
  offset += 8;

  decisionData.recipient.toBuffer().copy(instructionData, offset);
  offset += 32;

  u64ToBuffer(decisionData.nonce).copy(instructionData, offset);
  offset += 8;

  i64ToBuffer(decisionData.expiry_timestamp).copy(instructionData, offset);
  offset += 8;

  i64ToBuffer(decisionData.delay_seconds).copy(instructionData, offset);
  offset += 8;

  u64ToBuffer(decisionData.partial_amount).copy(instructionData, offset);
  offset += 8;

  signature.copy(instructionData, offset);
  return instructionData;
}

function deriveNoncePda(
  programId: PublicKey,
  signer: PublicKey,
  nonce: bigint,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("nonce"), signer.toBuffer(), u64ToBuffer(nonce)],
    programId,
  );
}

function deriveDelayedTxPda(
  programId: PublicKey,
  signer: PublicKey,
  recipient: PublicKey,
  nonce: bigint,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("delayed"),
      signer.toBuffer(),
      recipient.toBuffer(),
      u64ToBuffer(nonce),
    ],
    programId,
  );
}

function deriveDecisionPackage(params: {
  signerBalanceLamports: bigint;
  recipientExists: boolean;
  recipient: PublicKey;
  amountLamports: bigint;
  nonce?: bigint;
  expiryTimestamp?: bigint;
  delaySeconds?: bigint;
  partialAmount?: bigint;
  forceDecision?: DecisionValue;
}): DecisionPackage {
  const now = nowSeconds();
  const nonce = params.nonce ?? now;
  const expiryTimestamp =
    params.expiryTimestamp ?? now + BigInt(365 * 24 * 60 * 60);
  const amountLamports = params.amountLamports;
  const balanceRatio =
    params.signerBalanceLamports === BigInt(0)
      ? 100
      : Number((amountLamports * BigInt(100)) / params.signerBalanceLamports);

  let decision: DecisionValue = params.forceDecision ?? 0;
  let delaySeconds = params.delaySeconds ?? BigInt(0);
  let partialAmount = params.partialAmount ?? BigInt(0);

  if (params.forceDecision === undefined) {
    if (amountLamports > params.signerBalanceLamports) {
      decision = 1;
    } else if (!params.recipientExists && balanceRatio > 35) {
      decision = 1;
    } else if (!params.recipientExists || balanceRatio > 35) {
      decision = 2;
      delaySeconds = BigInt(3600);
    } else if (balanceRatio > 15) {
      decision = 3;
      partialAmount = amountLamports / BigInt(2);
    } else {
      decision = 0;
    }
  }

  if (decision === 3 && partialAmount === BigInt(0)) {
    partialAmount = amountLamports / BigInt(2);
  }

  return {
    decision,
    amount: amountLamports,
    recipient: params.recipient,
    nonce,
    expiry_timestamp: expiryTimestamp,
    delay_seconds: delaySeconds,
    partial_amount: partialAmount,
  };
}

function logDecisionPackage(decisionData: DecisionPackage): void {
  console.log("[devnet-test] decision package:", {
    decision: decisionData.decision,
    amount: decisionData.amount.toString(),
    recipient: decisionData.recipient.toBase58(),
    nonce: decisionData.nonce.toString(),
    expiry_timestamp: decisionData.expiry_timestamp.toString(),
    delay_seconds: decisionData.delay_seconds.toString(),
    partial_amount: decisionData.partial_amount.toString(),
  });
}

async function main(): Promise<void> {
  const rpcUrl = process.env.GUARDIAN_RPC_URL ?? DEFAULT_RPC_URL;
  const programIdInput = process.env.GUARDIAN_PROGRAM_ID ?? DEFAULT_PROGRAM_ID;

  const programId = new PublicKey(programIdInput);
  const connection = new Connection(rpcUrl, "confirmed");
  const signer = readSignerKeypair();
  const configuredRecipient = readRecipientPublicKey();
  const recipient =
    configuredRecipient.equals(signer.publicKey)
      ? deriveFallbackRecipientFromSigner(signer)
      : configuredRecipient;
  const aiAuthority = createAiAuthority();

  if (aiAuthority.publicKey.toBase58() !== TRUSTED_AI_AUTHORITY) {
    throw new Error(
      `Derived AI authority ${aiAuthority.publicKey.toBase58()} does not match trusted authority ${TRUSTED_AI_AUTHORITY}`,
    );
  }

  const wallet = {
    publicKey: signer.publicKey,
    signTransaction: async (transaction: Transaction) => {
      transaction.partialSign(signer);
      return transaction;
    },
    signAllTransactions: async (transactions: Transaction[]) => {
      transactions.forEach((transaction) => transaction.partialSign(signer));
      return transactions;
    },
  };

  const provider = new anchor.AnchorProvider(connection, wallet as any, {
    commitment: "confirmed",
  });
  anchor.setProvider(provider);

  console.log("[devnet-test] rpc:", rpcUrl);
  console.log("[devnet-test] signer:", signer.publicKey.toBase58());
  console.log("[devnet-test] recipient:", recipient.toBase58());
  if (configuredRecipient.equals(signer.publicKey)) {
    console.log(
      "[devnet-test] recipient matched signer; using fallback recipient:",
      recipient.toBase58(),
    );
  }
  console.log("[devnet-test] ai authority:", aiAuthority.publicKey.toBase58());
  console.log("[devnet-test] bootstrap program id:", programId.toBase58());

  // Try to load IDL from chain first; fall back to local IDL file if provided
  let program: anchor.Program;
  try {
    const onchainIdl = await anchor.Program.fetchIdl(programId, provider);
    if (onchainIdl) {
      program = new anchor.Program(onchainIdl as any, provider);
      console.log("[devnet-test] loaded IDL from chain");
    } else {
      throw new Error("no on-chain idl");
    }
  } catch (err) {
    const idlPath = resolveLocalIdlPath();
    if (idlPath) {
      const raw = fs.readFileSync(path.resolve(idlPath), "utf8");
      const localIdl = JSON.parse(raw);
      program = new anchor.Program(localIdl as any, provider);
      console.log("[devnet-test] loaded IDL from file:", idlPath);
    } else {
      throw new Error(`IDL not found for program: ${programId.toBase58()}`);
    }
  }

  const signerBalanceLamports = BigInt(await connection.getBalance(signer.publicKey, "confirmed"));
  await ensureSignerFunding(connection, signer);
  const fundedSignerBalanceLamports = BigInt(
    await connection.getBalance(signer.publicKey, "confirmed"),
  );
  if (fundedSignerBalanceLamports === BigInt(0)) {
    throw new Error(
      [
        `Signer ${signer.publicKey.toBase58()} has 0 lamports on devnet`,
        "Devnet airdrop was rate-limited, so the transaction cannot be simulated or sent yet",
        "Fund this keypair externally, switch to a funded keypair, or set GUARDIAN_SKIP_AIRDROP=1 and provide SOL by another path",
      ].join("; "),
    );
  }
  const recipientInfo = await connection.getAccountInfo(recipient, "confirmed");
  const recipientExists = recipientInfo !== null;
  const amountLamports =
    envBigInt("GUARDIAN_AMOUNT_LAMPORTS") ?? BigInt(100000000);
  const forceDecision = readDecisionValue("GUARDIAN_DECISION");
  const nonce = envBigInt("GUARDIAN_NONCE");
  const expiryTimestamp = envBigInt("GUARDIAN_EXPIRY_TIMESTAMP");
  const delaySeconds = envBigInt("GUARDIAN_DELAY_SECONDS");
  const partialAmount = envBigInt("GUARDIAN_PARTIAL_AMOUNT");

  const decisionData = deriveDecisionPackage({
    signerBalanceLamports: fundedSignerBalanceLamports,
    recipientExists,
    recipient,
    amountLamports,
    nonce,
    expiryTimestamp,
    delaySeconds,
    partialAmount,
    forceDecision,
  });

  const balanceRatio =
    fundedSignerBalanceLamports === BigInt(0)
      ? 100
      : Number((decisionData.amount * BigInt(100)) / fundedSignerBalanceLamports);

  console.log("[devnet-test] signer balance lamports:", fundedSignerBalanceLamports.toString());
  console.log("[devnet-test] recipient exists:", recipientExists);
  console.log("[devnet-test] balance ratio %:", balanceRatio.toFixed(2));
  logDecisionPackage(decisionData);

  const decisionHash = computeDecisionHash(decisionData);
  const signature = signDecisionHash(decisionHash, aiAuthority.secretKey);
  const ed25519Instruction = createEd25519Instruction(
    decisionHash,
    signature,
    aiAuthority.publicKey,
  );
  console.log(
    "[devnet-test] ed25519 instruction data:",
    ed25519Instruction.data.toString("hex"),
  );

  const [noncePda, nonceBump] = deriveNoncePda(
    programId,
    signer.publicKey,
    decisionData.nonce,
  );
  const [delayedTxPda, delayedBump] = deriveDelayedTxPda(
    programId,
    signer.publicKey,
    recipient,
    decisionData.nonce,
  );

  console.log("[devnet-test] nonce pda:", noncePda.toBase58(), "bump:", nonceBump);
  console.log("[devnet-test] delayed tx pda:", delayedTxPda.toBase58(), "bump:", delayedBump);
  console.log("[devnet-test] decision hash:", decisionHash.toString("hex"));
  console.log("[devnet-test] signature:", signature.toString("hex"));

  const manualInstructionData = encodeInstructionData(decisionData, signature);
  console.log("[devnet-test] manual instruction data:", manualInstructionData.toString("hex"));

  const anchorInstruction = await program.methods
    .executeWithVerifiedDecision(
      decisionData.decision,
      new BN(decisionData.amount.toString()),
      recipient,
      new BN(decisionData.nonce.toString()),
      new BN(decisionData.expiry_timestamp.toString()),
      new BN(decisionData.delay_seconds.toString()),
      new BN(decisionData.partial_amount.toString()),
      Array.from(signature),
    )
    .accounts({
      signer: signer.publicKey,
      aiAuthority: aiAuthority.publicKey,
      recipient,
      instructionSysvar: SYSVAR_INSTRUCTIONS_PUBKEY,
      noncePda: noncePda,
      delayedTx: delayedTxPda,
      systemProgram: SystemProgram.programId,
    })
    .instruction();

  console.log("[devnet-test] anchor instruction data:", anchorInstruction.data.toString("hex"));

  if (!manualInstructionData.equals(anchorInstruction.data)) {
    throw new Error(
      [
        "Instruction serialization mismatch detected.",
        `manual:  ${manualInstructionData.toString("hex")}`,
        `anchor:  ${anchorInstruction.data.toString("hex")}`,
      ].join("\n"),
    );
  }

  const expectedKeys = [
    { pubkey: signer.publicKey.toBase58(), isSigner: true, isWritable: true },
    { pubkey: aiAuthority.publicKey.toBase58(), isSigner: false, isWritable: false },
    { pubkey: recipient.toBase58(), isSigner: false, isWritable: true },
    { pubkey: SYSVAR_INSTRUCTIONS_PUBKEY.toBase58(), isSigner: false, isWritable: false },
    { pubkey: noncePda.toBase58(), isSigner: false, isWritable: true },
    { pubkey: delayedTxPda.toBase58(), isSigner: false, isWritable: true },
    { pubkey: SystemProgram.programId.toBase58(), isSigner: false, isWritable: false },
  ];
  const actualKeys = anchorInstruction.keys.map((key) => ({
    pubkey: key.pubkey.toBase58(),
    isSigner: key.isSigner,
    isWritable: key.isWritable,
  }));

  console.log("[devnet-test] anchor instruction keys:", actualKeys);

  if (JSON.stringify(expectedKeys) !== JSON.stringify(actualKeys)) {
    throw new Error(
      `Instruction account meta mismatch.\nexpected: ${JSON.stringify(expectedKeys, null, 2)}\nactual: ${JSON.stringify(actualKeys, null, 2)}`,
    );
  }

  const tx = new Transaction().add(ed25519Instruction, anchorInstruction);
  const latestBlockhash = await connection.getLatestBlockhash("confirmed");
  tx.feePayer = signer.publicKey;
  tx.recentBlockhash = latestBlockhash.blockhash;
  tx.partialSign(signer);

  console.log("[devnet-test] simulating transaction...");
  const simulation = await connection.simulateTransaction(tx);
  console.log("[devnet-test] simulation logs:");
  for (const log of simulation.value.logs ?? []) {
    console.log(log);
  }

  if (simulation.value.err) {
    throw new Error(
      `Simulation failed: ${JSON.stringify(simulation.value.err)}\nLogs:\n${(simulation.value.logs ?? []).join("\n")}`,
    );
  }

  console.log("[devnet-test] sending transaction...");
  const txSignature = await connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
    maxRetries: 3,
  });

  console.log("[devnet-test] sent transaction signature:", txSignature);

  const confirmation = await connection.confirmTransaction(
    {
      signature: txSignature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    },
    "confirmed",
  );

  console.log("[devnet-test] confirmation status:", confirmation.value.err ?? "confirmed");

  if (confirmation.value.err) {
    throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
  }

  console.log(
    "[devnet-test] explorer url:",
    `https://explorer.solana.com/tx/${txSignature}?cluster=devnet`,
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error("[devnet-test] fatal error:");
  console.error(message);
  process.exitCode = 1;
});