import { PublicKey } from '@solana/web3.js';
import type { DecisionType, TransactionStatus } from '../../types';
import type { PhishingAnalysisResult } from '../ocr/types';

export const GUARDIAN_DEVNET_RPC_URL = 'https://api.devnet.solana.com';
export const GUARDIAN_PROGRAM_ID = 'EBWBHWJ5ocXEbrxqoJ6MGoeopLeLLoa4Uhy3HSD1M46n';
export const GUARDIAN_EXPLORER_CLUSTER = 'devnet';

export type GuardianDecisionValue = 0 | 1 | 2 | 3;

export interface GuardianTransactionInput {
  recipient: string;
  amountSol: number;
}

export interface GuardianThreatContext {
  phishingAnalysis?: PhishingAnalysisResult | null;
}

export interface GuardianDecisionPackage {
  decision: GuardianDecisionValue;
  amount: bigint;
  recipient: PublicKey;
  nonce: bigint;
  expiry_timestamp: number;
  delay_seconds: number;
  partial_amount: bigint;
}

export interface GuardianScores {
  confidence: number;
  riskScore: number;
  deviationScore: number;
  impactScore: number;
}

export interface GuardianAnalysisResult {
  id: string;
  transactionId: string;
  transaction: {
    id: string;
    recipient: string;
    amountSol: number;
    amountLamports: bigint;
    status: TransactionStatus;
  };
  decision: DecisionType;
  decisionValue: GuardianDecisionValue;
  decisionPackage: GuardianDecisionPackage;
  decisionHash: string;
  signature: string;
  scores: GuardianScores;
  reasoning: string;
  riskFactors: string[];
  behaviorAnalysis: string;
  balanceLamports: bigint;
  recipientExists: boolean;
  confirmationRequired: boolean;
  recommendedAction: string;
  createdAt: number;
}

export interface GuardianExecutionOptions {
  analysis: GuardianAnalysisResult;
  approvalAmountLamports?: bigint;
  delaySecondsOverride?: number;
}

export interface GuardianExecutionResult {
  success: boolean;
  decision: DecisionType;
  transactionSignature?: string;
  explorerUrl?: string;
  decisionHash: string;
  signature: string;
  status: 'SUBMITTED' | 'CONFIRMED' | 'BLOCKED' | 'FAILED';
  error?: string;
}

export interface GuardianWalletSnapshot {
  publicKey: PublicKey;
  keypair: import('@solana/web3.js').Keypair;
}

export interface GuardianServiceState {
  connectionReady: boolean;
  rpcUrl: string;
  walletAddress?: string;
  aiAuthorityAddress?: string;
}
