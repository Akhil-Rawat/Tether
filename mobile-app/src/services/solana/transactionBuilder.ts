import { AnchorProvider, Program, Idl } from '@coral-xyz/anchor';
import { Buffer } from 'buffer';
import nacl from 'tweetnacl';
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
} from '@solana/web3.js';
import guardianIdl from '../../../../target/idl/guardian_executor.json';
import {
  GUARDIAN_PROGRAM_ID,
  GuardianAnalysisResult,
  GuardianDecisionPackage,
  GuardianExecutionOptions,
  GuardianExecutionResult,
} from './types';
import { walletService } from './walletService';

const programId = new PublicKey(GUARDIAN_PROGRAM_ID);

function u64LEBytes(value: bigint): Uint8Array {
  const buffer = new ArrayBuffer(8);
  new DataView(buffer).setBigUint64(0, value, true);
  return new Uint8Array(buffer);
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

function createProvider(connection: Connection, keypair: Keypair): AnchorProvider {
  const wallet = createWalletAdapter(keypair);
  return new AnchorProvider(
    connection,
    wallet as unknown as any,
    { commitment: 'confirmed' }
  );
}

export function toLamports(amountSol: number): bigint {
  return BigInt(Math.round(amountSol * LAMPORTS_PER_SOL));
}

export async function computeDecisionHash(decisionData: GuardianDecisionPackage): Promise<Uint8Array> {
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
  new DataView(expiryBuf).setBigInt64(0, BigInt(decisionData.expiry_timestamp), true);
  const expiryU8 = new Uint8Array(expiryBuf);

  const concat = new Uint8Array(
    decisionBuf.length + amountU8.length + recipientBuf.length + nonceU8.length + expiryU8.length
  );

  concat.set(decisionBuf, 0);
  concat.set(amountU8, decisionBuf.length);
  concat.set(recipientBuf, decisionBuf.length + amountU8.length);
  concat.set(nonceU8, decisionBuf.length + amountU8.length + recipientBuf.length);
  concat.set(expiryU8, decisionBuf.length + amountU8.length + recipientBuf.length + nonceU8.length);

  // Try Web Crypto first (browser / React Native with global crypto)
  try {
    const subtle = (globalThis as any).crypto?.subtle || (globalThis as any).msCrypto?.subtle;
    if (subtle && typeof subtle.digest === 'function') {
      const hashed = await subtle.digest('SHA-256', concat.buffer);
      return new Uint8Array(hashed);
    }
  } catch (e) {
    // fall through to other methods
  }

  // Try Node's crypto module if available
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nodeCrypto = require('crypto');
    const hashBuffer = nodeCrypto.createHash('sha256').update(Buffer.from(concat)).digest();
    return new Uint8Array(hashBuffer);
  } catch (e) {
    // fall through
  }

  // Fallback to dynamic import of @noble/hashes submodule
  try {
    const { sha256 } = await import('@noble/hashes/sha256');
    return new Uint8Array(sha256(concat));
  } catch (e) {
    throw new Error('No suitable SHA-256 implementation available');
  }
}

export function signDecisionHash(decisionHash: Uint8Array, aiSecretKey: Uint8Array): Uint8Array {
  let secretKey: Uint8Array;
  if (aiSecretKey.length === 32) {
    secretKey = nacl.sign.keyPair.fromSeed(aiSecretKey).secretKey;
  } else if (aiSecretKey.length === 64) {
    secretKey = aiSecretKey;
  } else {
    throw new Error('aiSecretKey must be 32 or 64 bytes');
  }

  return nacl.sign.detached(decisionHash, secretKey);
}

export function createEd25519Instruction(
  decisionHash: Uint8Array,
  signature: Uint8Array,
  aiPublicKey: PublicKey
): TransactionInstruction {
  if (signature.length !== 64) {
    throw new Error('signature must be 64 bytes');
  }

  return (Ed25519Program as any).createInstructionWithPublicKey(
    aiPublicKey.toBuffer(),
    decisionHash,
    signature
  );
}

export async function buildGuardianTransaction(
  connection: Connection,
  program: Program,
  decisionData: GuardianDecisionPackage,
  signature: Uint8Array,
  aiPublicKey: PublicKey,
  signer: Keypair,
  recipient: PublicKey,
  noncePDA: PublicKey,
  delayedTxPDA: PublicKey
): Promise<{ success: boolean; transactionSignature?: string; decisionHash: string; signature: string; error?: string }> {
  try {
    const decisionHash = await computeDecisionHash(decisionData);
    const ed25519Instruction = createEd25519Instruction(decisionHash, signature, aiPublicKey);

    const anchorInstruction = await program.methods
      .executeWithVerifiedDecision(
        {
          decision: Number(decisionData.decision),
          amount: decisionData.amount,
          recipient: decisionData.recipient,
          nonce: decisionData.nonce,
          expiry_timestamp: decisionData.expiry_timestamp,
          delay_seconds: decisionData.delay_seconds,
          partial_amount: decisionData.partial_amount,
        },
        [...signature]
      )
      .accounts({
        signer: signer.publicKey,
        ai_authority: aiPublicKey,
        recipient,
        instruction_sysvar: SYSVAR_INSTRUCTIONS_PUBKEY,
        nonce_pda: noncePDA,
        delayed_tx: delayedTxPDA,
        system_program: SystemProgram.programId,
      })
      .instruction();

    const tx = new Transaction().add(ed25519Instruction).add(anchorInstruction);

    const latest = await connection.getLatestBlockhash('confirmed');
    tx.feePayer = signer.publicKey;
    tx.recentBlockhash = latest.blockhash;
    tx.sign(signer);

    const txSig = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false });
    const confirmation = await connection.confirmTransaction(
      {
        signature: txSig,
        blockhash: latest.blockhash,
        lastValidBlockHeight: latest.lastValidBlockHeight,
      },
      'confirmed'
    );

    if (confirmation.value.err) {
      return {
        success: false,
        decisionHash: Buffer.from(decisionHash).toString('hex'),
        signature: Buffer.from(signature).toString('hex'),
        error: JSON.stringify(confirmation.value.err),
      };
    }

    return {
      success: true,
      transactionSignature: txSig,
      decisionHash: Buffer.from(decisionHash).toString('hex'),
      signature: Buffer.from(signature).toString('hex'),
    };
  } catch (error) {
    return {
      success: false,
      decisionHash: '',
      signature: Buffer.from(signature).toString('hex'),
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export class GuardianTransactionBuilder {
  async deriveNoncePDA(signer: PublicKey, nonce: bigint): Promise<[PublicKey, number]> {
    return PublicKey.findProgramAddress(
      [Buffer.from('nonce'), signer.toBuffer(), Buffer.from(u64LEBytes(nonce))],
      programId
    );
  }

  async deriveDelayedTxPDA(
    signer: PublicKey,
    recipient: PublicKey,
    nonce: bigint
  ): Promise<[PublicKey, number]> {
    return PublicKey.findProgramAddress(
      [
        Buffer.from('delayed'),
        signer.toBuffer(),
        recipient.toBuffer(),
        Buffer.from(u64LEBytes(nonce)),
      ],
      programId
    );
  }

  buildDecisionPackage(
    analysis: GuardianAnalysisResult,
    overrides?: Partial<GuardianExecutionOptions>
  ): GuardianDecisionPackage {
    const recipient = new PublicKey(analysis.transaction.recipient);
    const amount = overrides?.approvalAmountLamports ?? analysis.decisionPackage.amount;
    const delaySeconds = overrides?.delaySecondsOverride ?? analysis.decisionPackage.delay_seconds;
    const isPartial = amount < analysis.decisionPackage.amount;

    return {
      decision: analysis.decisionValue,
      amount,
      recipient,
      nonce: analysis.decisionPackage.nonce,
      expiry_timestamp: analysis.decisionPackage.expiry_timestamp,
      delay_seconds: delaySeconds,
      partial_amount: isPartial ? amount : analysis.decisionPackage.partial_amount,
    };
  }

  async execute(
    connection: Connection,
    analysis: GuardianAnalysisResult,
    overrides?: Partial<GuardianExecutionOptions>
  ): Promise<GuardianExecutionResult> {
    const signer = await walletService.getUserWallet();
    const aiAuthority = await walletService.getAiAuthorityWallet();
    const provider = createProvider(connection, signer);
    const program = new Program(guardianIdl as Idl, provider);

    const decisionData = this.buildDecisionPackage(analysis, overrides);
    const decisionHash = await computeDecisionHash(decisionData);
    const signature = signDecisionHash(decisionHash, aiAuthority.secretKey);
    const recipient = new PublicKey(analysis.transaction.recipient);
    const nonceValue = decisionData.nonce;

    const [noncePDA] = await this.deriveNoncePDA(signer.publicKey, nonceValue);
    const [delayedTxPDA] = await this.deriveDelayedTxPDA(signer.publicKey, recipient, nonceValue);

    console.log('[Guardian] executionPath:', analysis.decision);
    console.log('[Guardian] decisionHash:', Buffer.from(decisionHash).toString('hex'));

    const result = await buildGuardianTransaction(
      connection,
      program,
      decisionData,
      signature,
      aiAuthority.publicKey,
      signer,
      recipient,
      noncePDA,
      delayedTxPDA
    );

    const confirmationStatus = result.success ? 'CONFIRMED' : 'FAILED';
    console.log('[Guardian] txSignature:', result.transactionSignature ?? 'none');
    console.log('[Guardian] confirmationResult:', confirmationStatus);

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
