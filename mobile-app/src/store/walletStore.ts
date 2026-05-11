/**
 * Wallet Store
 * Zustand store for wallet state and authentication
 */

import { create } from "zustand";
import { PublicKey } from "@solana/web3.js";

export interface WalletStoreState {
  isAuthenticated: boolean;
  userAddress: string | null;
  balance: number;
  isLoading: boolean;
  error: string | null;

  // Actions
  setAuthenticated: (auth: boolean, address?: string) => void;
  setBalance: (balance: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
  reset: () => void;
  fetchBalance: () => Promise<void>;
}

export const useWalletStore = create<WalletStoreState>((set) => ({
  isAuthenticated: false,
  userAddress: null,
  balance: 0,
  isLoading: false,
  error: null,

  setAuthenticated: (auth: boolean, address?: string) => {
    set({
      isAuthenticated: auth,
      userAddress: address || null,
    });
  },

  setBalance: (balance: number) => {
    set({ balance });
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  // Fetch balance from blockchain
  fetchBalance: async () => {
    set({ isLoading: true, error: null });
    try {
      // Lazy import walletService to avoid circular imports
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { walletService } = require("../services/solana/walletService");
      const bal = await walletService.getBalance();
      set({ balance: bal, isLoading: false });
    } catch (err: any) {
      set({
        error: err.message || "Failed to fetch balance",
        isLoading: false,
      });
    }
  },

  setError: (error: string | null) => {
    set({ error });
  },

  logout: () => {
    set({
      isAuthenticated: false,
      userAddress: null,
      balance: 0,
      error: null,
    });
  },

  reset: () => {
    set({
      isAuthenticated: false,
      userAddress: null,
      balance: 0,
      isLoading: false,
      error: null,
    });
  },
}));
