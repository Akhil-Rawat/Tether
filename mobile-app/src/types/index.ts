/**
 * Guardian Transaction Analysis Types
 * Defines all TypeScript interfaces for the transaction system
 */

// Decision outcomes
export enum DecisionType {
  ALLOW = 'ALLOW',
  REJECT = 'REJECT',
  DELAY = 'DELAY',
  PARTIAL = 'PARTIAL',
}

// Transaction status
export enum TransactionStatus {
  PENDING = 'PENDING',
  ANALYZING = 'ANALYZING',
  ANALYZED = 'ANALYZED',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
}

// Core transaction data
export interface Transaction {
  id: string;
  recipient: string;
  amount: number;
  timestamp: number;
  status: TransactionStatus;
}

// Confidence scores
export interface AnalysisScores {
  confidence: number; // 0-100
  riskScore: number; // 0-100
  deviationScore: number; // 0-100
  impactScore: number; // 0-100
}

// AI decision analysis
export interface TransactionAnalysis {
  id: string;
  transaction: Transaction;
  decision: DecisionType;
  scores: AnalysisScores;
  reasoning: string;
  riskFactors: string[];
  behaviorAnalysis: string;
  timestamp: number;
}

// Delayed transaction details
export interface DelayedTransaction {
  analysisId: string;
  executeAfter: number; // Unix timestamp
  delaySeconds: number;
  status: 'WAITING' | 'READY' | 'EXECUTED';
}

// Partial approval details
export interface PartialApproval {
  analysisId: string;
  requestedAmount: number;
  approvedAmount: number;
  remainingAmount: number;
}

// Store state
export interface TransactionStoreState {
  // Current transaction being analyzed
  currentTransaction: Transaction | null;
  currentAnalysis: TransactionAnalysis | null;

  // History
  history: TransactionAnalysis[];

  // UI state
  isLoading: boolean;
  error: string | null;

  // Actions
  startNewTransaction: (recipient: string, amount: number) => void;
  analyzeTransaction: (transaction: Transaction) => Promise<void>;
  confirmDecision: (decision: DecisionType) => void;
  clearError: () => void;
  reset: () => void;
}

// Risk classification
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

// Navigation params
export type RootStackParamList = {
  Home: undefined;
  Send: undefined;
  Analysis: { transactionId: string };
  Delay: { analysisId: string };
  PartialApproval: { analysisId: string };
  Success: {
    transactionSignature?: string;
    explorerUrl?: string;
    decisionHash?: string;
  };
};
