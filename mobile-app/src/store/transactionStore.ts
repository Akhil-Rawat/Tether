/**
 * Transaction Store
 * Zustand store for managing transaction state
 */

import { create } from 'zustand';
import {
  Transaction,
  TransactionAnalysis,
  TransactionStatus,
  DecisionType,
  TransactionStoreState,
} from '../types';
import { getMockAnalysis } from '../mocks/analysisData';

export const useTransactionStore = create<TransactionStoreState>((set, get) => ({
  currentTransaction: null,
  currentAnalysis: null,
  history: [],
  isLoading: false,
  error: null,

  startNewTransaction: (recipient: string, amount: number) => {
    const transaction: Transaction = {
      id: `tx-${Date.now()}`,
      recipient,
      amount,
      timestamp: Date.now(),
      status: TransactionStatus.PENDING,
    };

    set({
      currentTransaction: transaction,
      currentAnalysis: null,
      error: null,
    });
  },

  analyzeTransaction: async (transaction: Transaction) => {
    set({ isLoading: true, error: null });

    try {
      // Update transaction status
      const updatedTransaction = {
        ...transaction,
        status: TransactionStatus.ANALYZING,
      };

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Get mocked analysis
      const analysis = getMockAnalysis(updatedTransaction);

      // Update transaction status to analyzed
      updatedTransaction.status = TransactionStatus.ANALYZED;

      set({
        currentTransaction: updatedTransaction,
        currentAnalysis: analysis,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Analysis failed',
        isLoading: false,
      });
    }
  },

  confirmDecision: (decision: DecisionType) => {
    const { currentAnalysis } = get();

    if (!currentAnalysis) {
      set({ error: 'No analysis to confirm' });
      return;
    }

    // Add to history
    set((state) => ({
      history: [currentAnalysis, ...state.history],
      currentTransaction: null,
      currentAnalysis: null,
    }));
  },

  clearError: () => set({ error: null }),

  reset: () => set({
    currentTransaction: null,
    currentAnalysis: null,
    isLoading: false,
    error: null,
  }),
}));
