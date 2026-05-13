import BN from "bn.js";
import { AnchorProvider } from "@coral-xyz/anchor";
import { Buffer } from "buffer";
import * as Crypto from "expo-crypto";
import nacl from "tweetnacl";
import {
  Connection,
  Ed25519Program,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import guardianIdl from "../../../../target/idl/guardian_executor.json";
import {
  GuardianAnalysisResult,
  GuardianDecisionPackage,
  GuardianExecutionOptions,
  GuardianExecutionResult,
} from "./types";
import { walletService } from "./walletService";

const programId = new PublicKey((guardianIdl as { address: string }).address);
const EXECUTE_WITH_VERIFIED_DECISION_DISCRIMINATOR = Buffer.from([
  0x15,
  0xb6,
  0x02,
  0x2a,
  0xf4,
  0x63,
  0x19,
  0xd9,
]);

function u64LEBytes(value: bigint): Uint8Array {
  const buffer = new ArrayBuffer(8);
  new DataView(buffer).setBigUint64(0, value, true);
  return new Uint8Array(buffer);
}

function i64LEBytes(value: bigint): Uint8Array {
  const buffer = new ArrayBuffer(8);
  new DataView(buffer).setBigInt64(0, value, true);
  return new Uint8Array(buffer);
}

function nowSecondsBigInt(): bigint {
  return BigInt(Math.floor(Date.now() / 1000));
}

interface GuardianWalletAdapter {
  publicKey: PublicKey;
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
  signAllTransactions: (transactions: Transaction[]) => Promise<Transaction[]>;
}

function createWalletAdapter(keypair: Keypair): GuardianWalletAdapter {
  return {
    publicKey: keypair.publicKey,
    signTransaction: async (transaction) => {
      transaction.partialSign(keypair);
      return transaction;
    },
    signAllTransactions: async (transactions) => {
      transactions.forEach((transaction) => transaction.partialSign(keypair));
      return transactions;
    },
  };
}

function createProvider(
  connection: Connection,
  keypair: Keypair,
): AnchorProvider {
  const wallet = createWalletAdapter(keypair);
  return new AnchorProvider(connection, wallet as unknown as any, {
    commitment: "confirmed",
  });
}

export function toLamports(amountSol: number): bigint {
  return BigInt(Math.round(amountSol * LAMPORTS_PER_SOL));
}

export async function computeDecisionHash(
  decisionData: GuardianDecisionPackage,
): Promise<Uint8Array> {
  const decisionBuf = new Uint8Array(1);
  decisionBuf[0] = Number(decisionData.decision);

  const amountBuf = new ArrayBuffer(8);
  new DataView(amountBuf).setBigUint64(0, decisionData.amount, true);
  const amountU8 = new Uint8Array(amountBuf);

  const recipientBuf = decisionData.recipient.toBuffer();

  const nonceBuf = new ArrayBuffer(8);
  new DataView(nonceBuf).setBigUint64(0, decisionData.nonce, true);
  const nonceU8 = new Uint8Array(nonceBuf);

  const expiryBuf = new ArrayBuffer(8);
  new DataView(expiryBuf).setBigInt64(
    0,
    BigInt(decisionData.expiry_timestamp),
    true,
  );
  const expiryU8 = new Uint8Array(expiryBuf);

  const concat = new Uint8Array(
    decisionBuf.length +
      amountU8.length +
      recipientBuf.length +
      nonceU8.length +
      expiryU8.length,
  );

  concat.set(decisionBuf, 0);
  concat.set(amountU8, decisionBuf.length);
  concat.set(recipientBuf, decisionBuf.length + amountU8.length);
  concat.set(
    nonceU8,
    decisionBuf.length + amountU8.length + recipientBuf.length,
  );
  concat.set(
    expiryU8,
    decisionBuf.length + amountU8.length + recipientBuf.length + nonceU8.length,
  );

  // Try Web Crypto first (browser / React Native with global crypto)
  try {
    const subtle =
      (globalThis as any).crypto?.subtle ||
      (globalThis as any).msCrypto?.subtle;
    if (subtle && typeof subtle.digest === "function") {
      const hashed = await subtle.digest("SHA-256", concat.buffer);
      return new Uint8Array(hashed);
    }
  } catch (e) {
    // fall through to other methods
  }

  // Expo native crypto is the most reliable option on device builds.
  try {
    const hashed = await Crypto.digest(
      Crypto.CryptoDigestAlgorithm.SHA256,
      concat,
    );
    return new Uint8Array(hashed);
  } catch (e) {
    // fall through
  }

  // Try Node's crypto module if available
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nodeCrypto = require("crypto");
    const hashBuffer = nodeCrypto
      .createHash("sha256")
      .update(Buffer.from(concat))
      .digest();
    return new Uint8Array(hashBuffer);
  } catch (e) {
    // fall through
  }

  // Fallback to dynamic import of @noble/hashes submodule
  try {
    const { sha256 } = await import("@noble/hashes/sha256");
    return new Uint8Array(sha256(concat));
  } catch (e) {
    throw new Error("No suitable SHA-256 implementation available");
  }
}

export function signDecisionHash(
  decisionHash: Uint8Array,
  aiSecretKey: Uint8Array,
): Uint8Array {
  let secretKey: Uint8Array;
  if (aiSecretKey.length === 32) {
    secretKey = nacl.sign.keyPair.fromSeed(aiSecretKey).secretKey;
  } else if (aiSecretKey.length === 64) {
    secretKey = aiSecretKey;
  } else {
    throw new Error("aiSecretKey must be 32 or 64 bytes");
  }

  return nacl.sign.detached(decisionHash, secretKey);
}

export function createEd25519Instruction(
  decisionHash: Uint8Array,
  signature: Uint8Array,
  aiPublicKey: PublicKey,
): TransactionInstruction {
  if (signature.length !== 64) {
    throw new Error("signature must be 64 bytes");
  }

  return (Ed25519Program as any).createInstructionWithPublicKey({
    publicKey: aiPublicKey.toBuffer(),
    message: decisionHash,
    signature,
  });
}

/**
 * Manually encode the DecisionPackage struct into bytes, bypassing Anchor's encoder.
 * This ensures precise byte-alignment matching the Rust struct layout.
 * Layout: discriminator(8) + decision(1) + amount(8) + recipient(32) + nonce(8) +
 *         expiry_timestamp(8) + delay_seconds(8) + partial_amount(8) + signature(64)
 */
// function encodeDecisionPackageManual(
//   decisionData: GuardianDecisionPackage,
//   signature: Uint8Array,
// ): Buffer {
//   // 8-byte discriminator for execute_with_verified_decision
//   const discriminator = Buffer.from([
//     0x15, 0xb6, 0x02, 0x2a, 0xf4, 0x63, 0x19, 0xd9,
//   ]);

//   // Allocate buffer: 8 (discriminator) + 1 (decision) + 8 (amount) + 32 (recipient)
//   //                  + 8 (nonce) + 8 (expiry) + 8 (delay) + 8 (partial) + 64 (sig)
//   const buf = Buffer.alloc(145);
//   let offset = 0;

//   // Copy discriminator
//   discriminator.copy(buf, offset);
//   offset += 8;

//   // decision (u8)
//   buf[offset] = Number(decisionData.decision);
//   offset += 1;

//   // amount (u64, little-endian)
//   const amountBuf = new ArrayBuffer(8);
//   new DataView(amountBuf).setBigUint64(0, decisionData.amount, true);
//   buf.set(new Uint8Array(amountBuf), offset);
//   offset += 8;

//   // recipient (Pubkey, 32 bytes)
//   buf.set(decisionData.recipient.toBuffer(), offset);
//   offset += 32;

//   // nonce (u64, little-endian)
//   const nonceBuf = new ArrayBuffer(8);
//   new DataView(nonceBuf).setBigUint64(0, decisionData.nonce, true);
//   buf.set(new Uint8Array(nonceBuf), offset);
//   offset += 8;

//   // expiry_timestamp (i64, little-endian, signed)
//   const expiryBuf = new ArrayBuffer(8);
//   new DataView(expiryBuf).setBigInt64(
//     0,
//     BigInt(decisionData.expiry_timestamp),
//     true,
//   );
//   buf.set(new Uint8Array(expiryBuf), offset);
//   offset += 8;

//   // delay_seconds (i64, little-endian, signed)
//   const delaySec = BigInt(decisionData.delay_seconds ?? 0);
//   const delayBuf = new ArrayBuffer(8);
//   new DataView(delayBuf).setBigInt64(0, delaySec, true);
//   buf.set(new Uint8Array(delayBuf), offset);
//   offset += 8;

//   // partial_amount (u64, little-endian)
//   const partialBuf = new ArrayBuffer(8);
//   new DataView(partialBuf).setBigUint64(
//     0,
//     BigInt(decisionData.partial_amount ?? 0n),
//     true,
//   );
//   buf.set(new Uint8Array(partialBuf), offset);
//   offset += 8;

//   // signature ([u8; 64])
//   buf.set(signature, offset);

//   return buf;
// }

export async function buildGuardianTransaction(
  connection: Connection,
  decisionData: GuardianDecisionPackage,
  signature: Uint8Array,
  aiPublicKey: PublicKey,
  signer: Keypair,
  recipient: PublicKey,
  noncePDA: PublicKey,
  delayedTxPDA: PublicKey,
): Promise<{
  success: boolean;
  transactionSignature?: string;
  decisionHash: string;
  signature: string;
  error?: string;
}> {
  try {
    const decisionHash = await computeDecisionHash(decisionData);
    const ed25519Instruction = createEd25519Instruction(
      decisionHash,
      signature,
      aiPublicKey,
    );

    const instructionData = Buffer.alloc(8 + 1 + 8 + 32 + 8 + 8 + 8 + 8 + 64);
    let offset = 0;

    EXECUTE_WITH_VERIFIED_DECISION_DISCRIMINATOR.copy(instructionData, offset);
    offset += 8;

    instructionData.writeUInt8(Number(decisionData.decision), offset);
    offset += 1;

    Buffer.from(u64LEBytes(decisionData.amount)).copy(instructionData, offset);
    offset += 8;

    decisionData.recipient.toBuffer().copy(instructionData, offset);
    offset += 32;

    Buffer.from(u64LEBytes(decisionData.nonce)).copy(instructionData, offset);
    offset += 8;

    Buffer.from(i64LEBytes(BigInt(decisionData.expiry_timestamp))).copy(
      instructionData,
      offset,
    );
    offset += 8;

    Buffer.from(i64LEBytes(BigInt(decisionData.delay_seconds ?? 0))).copy(
      instructionData,
      offset,
    );
    offset += 8;

    Buffer.from(u64LEBytes(decisionData.partial_amount ?? 0n)).copy(
      instructionData,
      offset,
    );
    offset += 8;

    Buffer.from(signature).copy(instructionData, offset);

    const anchorInstruction = new TransactionInstruction({
      programId,
      keys: [
        { pubkey: signer.publicKey, isSigner: true, isWritable: true },
        { pubkey: aiPublicKey, isSigner: false, isWritable: false },
        { pubkey: recipient, isSigner: false, isWritable: true },
        { pubkey: SYSVAR_INSTRUCTIONS_PUBKEY, isSigner: false, isWritable: false },
        { pubkey: noncePDA, isSigner: false, isWritable: true },
        { pubkey: delayedTxPDA, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: instructionData,
    });

    const tx = new Transaction().add(ed25519Instruction).add(anchorInstruction);

    const latest = await connection.getLatestBlockhash("confirmed");
    tx.feePayer = signer.publicKey;
    tx.recentBlockhash = latest.blockhash;
    tx.sign(signer);

    const txSig = await connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
    });
    const confirmation = await connection.confirmTransaction(
      {
        signature: txSig,
        blockhash: latest.blockhash,
        lastValidBlockHeight: latest.lastValidBlockHeight,
      },
      "confirmed",
    );

    if (confirmation.value.err) {
      return {
        success: false,
        decisionHash: Buffer.from(decisionHash).toString("hex"),
        signature: Buffer.from(signature).toString("hex"),
        error: JSON.stringify(confirmation.value.err),
      };
    }

    return {
      success: true,
      transactionSignature: txSig,
      decisionHash: Buffer.from(decisionHash).toString("hex"),
      signature: Buffer.from(signature).toString("hex"),
    };
  } catch (error) {
    const errObj: any = error;
    let extra = "";
    if (errObj?.logs) {
      extra = `\nRPC logs:\n${JSON.stringify(errObj.logs, null, 2)}`;
    }

    return {
      success: false,
      decisionHash: "",
      signature: Buffer.from(signature).toString("hex"),
      error:
        error instanceof Error
          ? `${error.message}${error.stack ? `\n${error.stack}` : ""}${extra}`
          : String(error),
    };
  }
}

export class GuardianTransactionBuilder {
  async deriveNoncePDA(
    signer: PublicKey,
    nonce: bigint,
  ): Promise<[PublicKey, number]> {
    return PublicKey.findProgramAddress(
      [Buffer.from("nonce"), signer.toBuffer(), Buffer.from(u64LEBytes(nonce))],
      programId,
    );
  }

  async deriveDelayedTxPDA(
    signer: PublicKey,
    recipient: PublicKey,
    nonce: bigint,
  ): Promise<[PublicKey, number]> {
    return PublicKey.findProgramAddress(
      [
        Buffer.from("delayed"),
        signer.toBuffer(),
        recipient.toBuffer(),
        Buffer.from(u64LEBytes(nonce)),
      ],
      programId,
    );
  }

  buildDecisionPackage(
    analysis: GuardianAnalysisResult,
    overrides?: Partial<GuardianExecutionOptions>,
  ): GuardianDecisionPackage {
    const recipient = new PublicKey(analysis.transaction.recipient);
    const amount =
      overrides?.approvalAmountLamports ?? analysis.decisionPackage.amount;
    const delaySeconds =
      overrides?.delaySecondsOverride ??
      analysis.decisionPackage.delay_seconds ??
      0;
    const isPartial = amount < analysis.decisionPackage.amount;
    const partialAmount = isPartial
      ? amount
      : (analysis.decisionPackage.partial_amount ?? 0n);

    // Ensure expiry timestamp is in seconds and not expired. If expired, bump by 1 hour.
    const now = nowSecondsBigInt();
    let expiry = BigInt(
      analysis.decisionPackage.expiry_timestamp ?? now + 3600n,
    );
    if (expiry < now) {
      expiry = now + 3600n;
    }

    return {
      decision: analysis.decisionValue,
      amount,
      recipient,
      nonce: analysis.decisionPackage.nonce,
      expiry_timestamp: Number(expiry),
      delay_seconds: delaySeconds,
      partial_amount: partialAmount,
    };
  }

  async execute(
    connection: Connection,
    analysis: GuardianAnalysisResult,
    overrides?: Partial<GuardianExecutionOptions>,
  ): Promise<GuardianExecutionResult> {
    const signer = await walletService.getUserWallet();
    const aiAuthority = await walletService.getAiAuthorityWallet();

    const decisionData = this.buildDecisionPackage(analysis, overrides);
    console.log(
      "[Guardian] decision expiry:",
      decisionData.expiry_timestamp.toString(),
      "now:",
      nowSecondsBigInt().toString(),
    );
    const decisionHash = await computeDecisionHash(decisionData);
    const signature = signDecisionHash(decisionHash, aiAuthority.secretKey);
    const recipient = new PublicKey(analysis.transaction.recipient);
    const nonceValue = decisionData.nonce;

    const [noncePDA] = await this.deriveNoncePDA(signer.publicKey, nonceValue);
    const [delayedTxPDA] = await this.deriveDelayedTxPDA(
      signer.publicKey,
      recipient,
      nonceValue,
    );

    console.log("[Guardian] executionPath:", analysis.decision);
    console.log(
      "[Guardian] decisionHash:",
      Buffer.from(decisionHash).toString("hex"),
    );

    // Log chain time for debugging expiry mismatches
    try {
      const slot = await connection.getSlot();
      const blockTime = await connection.getBlockTime(slot);
      console.log("[Guardian] chain slot:", slot, "chain time:", blockTime);
    } catch (e) {
      console.log(
        "[Guardian] unable to fetch chain time",
        (e as any)?.message ?? e,
      );
    }

    const result = await buildGuardianTransaction(
      connection,
      decisionData,
      signature,
      aiAuthority.publicKey,
      signer,
      recipient,
      noncePDA,
      delayedTxPDA,
    );

    const confirmationStatus = result.success ? "CONFIRMED" : "FAILED";
    console.log(
      "[Guardian] txSignature:",
      result.transactionSignature ?? "none",
    );
    console.log("[Guardian] confirmationResult:", confirmationStatus);

    return {
      success: result.success,
      decision: analysis.decision,
      transactionSignature: result.transactionSignature,
      explorerUrl: result.transactionSignature
        ? `https://explorer.solana.com/tx/${result.transactionSignature}?cluster=devnet`
        : undefined,
      decisionHash: result.decisionHash,
      signature: result.signature,
      status: confirmationStatus,
      error: result.error,
    };
  }
}

export const guardianTransactionBuilder = new GuardianTransactionBuilder();
