/**
 * Transaction Store
 * Zustand store for real Guardian transaction lifecycle
 */

import { create } from 'zustand';
import { DecisionType, TransactionStatus } from '../types';
import { guardianService } from '../services/solana/guardianService';
import type { OCRScanResult } from '../services/ocr/types';
import type {
  GuardianAnalysisResult,
  GuardianExecutionOptions,
  GuardianExecutionResult,
  GuardianTransactionInput,
} from '../services/solana/types';

export interface TransactionStoreState {
  currentTransaction: {
    id: string;
    recipient: string;
    amount: number;
    timestamp: number;
    status: TransactionStatus;
  } | null;
  currentAnalysis: GuardianAnalysisResult | null;
  currentThreatScan: OCRScanResult | null;
  history: GuardianAnalysisResult[];
  latestExecution: GuardianExecutionResult | null;
  transactionSignature: string | null;
  explorerUrl: string | null;
  decisionHash: string | null;
  blockchainError: string | null;
  isAnalyzing: boolean;
  isExecuting: boolean;
  confirmationStatus: 'idle' | 'analyzing' | 'submitted' | 'confirmed' | 'blocked' | 'failed';
  startNewTransaction: (recipient: string, amount: number) => string;
  setThreatScan: (scan: OCRScanResult | null) => void;
  analyzeCurrentTransaction: () => Promise<GuardianAnalysisResult | null>;
  executeCurrentTransaction: (options?: Partial<GuardianExecutionOptions>) => Promise<GuardianExecutionResult | null>;
  clearBlockchainError: () => void;
  clearExecutionState: () => void;
  reset: () => void;
}

export const useTransactionStore = create<TransactionStoreState>((set, get) => ({
  currentTransaction: null,
  currentAnalysis: null,
  currentThreatScan: null,
  history: [],
  latestExecution: null,
  transactionSignature: null,
  explorerUrl: null,
  decisionHash: null,
  blockchainError: null,
  isAnalyzing: false,
  isExecuting: false,
  confirmationStatus: 'idle',

  startNewTransaction: (recipient: string, amount: number) => {
    const id = `tx-${Date.now()}`;
    set({
      currentTransaction: {
        id,
        recipient,
        amount,
        timestamp: Date.now(),
        status: TransactionStatus.PENDING,
      },
      currentAnalysis: null,
      currentThreatScan: null,
      latestExecution: null,
      transactionSignature: null,
      explorerUrl: null,
      decisionHash: null,
      blockchainError: null,
      confirmationStatus: 'idle',
    });

    return id;
  },

  setThreatScan: (scan) => set({ currentThreatScan: scan }),

  analyzeCurrentTransaction: async () => {
    const { currentTransaction, currentThreatScan } = get();

    if (!currentTransaction) {
      set({ blockchainError: 'No transaction to analyze', confirmationStatus: 'failed' });
      return null;
    }

    set({ isAnalyzing: true, blockchainError: null, confirmationStatus: 'analyzing' });

    try {
      const analysis = await guardianService.analyzeTransaction({
        recipient: currentTransaction.recipient,
        amountSol: currentTransaction.amount,
      } satisfies GuardianTransactionInput, {
        phishingAnalysis: currentThreatScan?.analysis ?? null,
      });

      set({
        currentAnalysis: analysis,
        currentTransaction: {
          ...currentTransaction,
          status: TransactionStatus.ANALYZED,
        },
        isAnalyzing: false,
        confirmationStatus: 'idle',
        decisionHash: analysis.decisionHash,
      });

      // Logging for audit / debugging
      console.log('[Guardian] Analysis complete:', {
        decisionHash: analysis.decisionHash,
        decision: analysis.decision,
        signature: analysis.signature,
      });

      return analysis;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Analysis failed';
      set({
        blockchainError: message,
        isAnalyzing: false,
        confirmationStatus: 'failed',
      });
      return null;
    }
  },

  executeCurrentTransaction: async (options) => {
    const { currentAnalysis } = get();

    if (!currentAnalysis) {
      set({ blockchainError: 'No analysis available', confirmationStatus: 'failed' });
      return null;
    }

    if (currentAnalysis.decision === DecisionType.REJECT) {
      const blocked: GuardianExecutionResult = {
        success: false,
        decision: currentAnalysis.decision,
        decisionHash: currentAnalysis.decisionHash,
        signature: currentAnalysis.signature,
        status: 'BLOCKED',
        error: 'Guardian rejected this transaction before execution.',
      };

      set((state) => ({
        latestExecution: blocked,
        history: [currentAnalysis, ...state.history],
        currentTransaction: null,
        currentAnalysis: null,
        isExecuting: false,
        confirmationStatus: 'blocked',
        transactionSignature: null,
        explorerUrl: null,
        blockchainError: blocked.error ?? null,
      }));

      return blocked;
    }

    set({ isExecuting: true, blockchainError: null, confirmationStatus: 'submitted' });

    try {
      const result = await guardianService.executeAnalysis(currentAnalysis, {
        approvalAmountLamports: options?.approvalAmountLamports,
        delaySecondsOverride: options?.delaySecondsOverride,
      });

      set((state) => ({
        latestExecution: result,
        history: [currentAnalysis, ...state.history],
        currentTransaction: null,
        currentAnalysis: null,
        isExecuting: false,
        confirmationStatus: result.success ? 'confirmed' : 'failed',
        transactionSignature: result.transactionSignature ?? null,
        explorerUrl: result.explorerUrl ?? null,
        decisionHash: result.decisionHash,
        blockchainError: result.error ?? null,
      }));

      console.log('[Guardian] Execution result:', {
        tx: result.transactionSignature,
        explorer: result.explorerUrl,
        success: result.success,
        error: result.error,
      });

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Execution failed';
      set({
        blockchainError: message,
        isExecuting: false,
        confirmationStatus: 'failed',
      });
      return null;
    }
  },

  clearBlockchainError: () => set({ blockchainError: null }),
  clearExecutionState: () =>
    set({
      latestExecution: null,
      transactionSignature: null,
      explorerUrl: null,
      decisionHash: null,
      blockchainError: null,
      confirmationStatus: 'idle',
    }),
  reset: () =>
    set({
      currentTransaction: null,
      currentAnalysis: null,
      currentThreatScan: null,
      history: [],
      latestExecution: null,
      transactionSignature: null,
      explorerUrl: null,
      decisionHash: null,
      blockchainError: null,
      isAnalyzing: false,
      isExecuting: false,
      confirmationStatus: 'idle',
    }),
}));
