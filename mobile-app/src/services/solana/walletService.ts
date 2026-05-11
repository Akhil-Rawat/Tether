import * as SecureStore from "expo-secure-store";
import { Buffer } from "buffer";
import nacl from "tweetnacl";
import { Keypair, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import { Connection, clusterApiUrl } from "@solana/web3.js";

const USER_WALLET_KEY = "guardian_user_wallet";
const AI_AUTHORITY_KEY = "guardian_ai_authority_wallet";
const WALLET_EXISTS_KEY = "guardian_wallet_exists";

// Deterministic seed for AI authority (must match contract's TRUSTED_AI_AUTHORITY)
// Generated as: nacl.sign.keyPair.fromSeed(sha256("guardian_ai_authority_seed_32bytes!"))
// Public key: GQ7UU2BurgDEmzfkEfxKY9LwHwzNgPMxyanhbig2hfRZ
const AI_AUTHORITY_SEED = "guardian_ai_authority_seed_32bytes!";

const toBase64 = (bytes: Uint8Array): string =>
  Buffer.from(bytes).toString("base64");
const fromBase64 = (value: string): Uint8Array =>
  new Uint8Array(Buffer.from(value, "base64"));

interface StoredKeypair {
  secretKey: string;
  publicKey: string;
}

export class WalletService {
  private userWallet: Keypair | null = null;
  private aiAuthority: Keypair | null = null;
  private connection: Connection;

  constructor() {
    // Connect to devnet by default
    this.connection = new Connection(clusterApiUrl("devnet"));
  }

  private async loadOrCreateKeypair(storageKey: string): Promise<Keypair> {
    const stored = await SecureStore.getItemAsync(storageKey);
    if (stored) {
      const parsed = JSON.parse(stored) as StoredKeypair;
      return Keypair.fromSecretKey(fromBase64(parsed.secretKey));
    }

    const kp = nacl.sign.keyPair();
    const keypair = Keypair.fromSecretKey(kp.secretKey);
    const payload: StoredKeypair = {
      secretKey: toBase64(keypair.secretKey),
      publicKey: keypair.publicKey.toBase58(),
    };
    await SecureStore.setItemAsync(storageKey, JSON.stringify(payload));
    return keypair;
  }

  private createDeterministicAiAuthority(): Keypair {
    // Create deterministic AI authority from fixed seed
    // This ensures consistent verification with contract's TRUSTED_AI_AUTHORITY
    const seedBuffer = Buffer.from(AI_AUTHORITY_SEED);
    const seed = new Uint8Array(seedBuffer.slice(0, 32));
    const kp = nacl.sign.keyPair.fromSeed(seed);
    return Keypair.fromSecretKey(kp.secretKey);
  }

  async getUserWallet(): Promise<Keypair> {
    if (!this.userWallet) {
      this.userWallet = await this.loadOrCreateKeypair(USER_WALLET_KEY);
    }
    return this.userWallet;
  }

  async getAiAuthorityWallet(): Promise<Keypair> {
    if (!this.aiAuthority) {
      // Use deterministic AI authority (not random)
      // This must match the contract's TRUSTED_AI_AUTHORITY constant
      this.aiAuthority = this.createDeterministicAiAuthority();
    }
    return this.aiAuthority;
  }

  async getWalletAddress(): Promise<PublicKey> {
    const wallet = await this.getUserWallet();
    return wallet.publicKey;
  }

  async getAiAuthorityAddress(): Promise<PublicKey> {
    const w = await this.getAiAuthorityWallet();
    return w.publicKey;
  }

  async clearWallets(): Promise<void> {
    await SecureStore.deleteItemAsync(USER_WALLET_KEY);
    await SecureStore.deleteItemAsync(AI_AUTHORITY_KEY);
    this.userWallet = null;
    this.aiAuthority = null;
  }

  // Import wallet from private key (base58 encoded)
  async importFromPrivateKey(privateKeyBase58: string): Promise<Keypair> {
    try {
      const secretKey = bs58.decode(privateKeyBase58);
      if (secretKey.length !== 64) {
        throw new Error("Invalid private key length");
      }
      const keypair = Keypair.fromSecretKey(secretKey);

      // Save to secure storage
      const payload: StoredKeypair = {
        secretKey: toBase64(keypair.secretKey),
        publicKey: keypair.publicKey.toBase58(),
      };
      await SecureStore.setItemAsync(USER_WALLET_KEY, JSON.stringify(payload));
      await SecureStore.setItemAsync(WALLET_EXISTS_KEY, "true");
      this.userWallet = keypair;
      return keypair;
    } catch (error) {
      throw new Error(`Failed to import private key: ${error}`);
    }
  }

  // Import wallet from seed phrase (simple version)
  // For simplicity, we just use the seed phrase to create a deterministic keypair
  async importFromSeedPhrase(seedPhrase: string): Promise<Keypair> {
    try {
      // Simple deterministic approach: use tweetnacl to create keypair from seed
      // In production, you'd want to use a proper BIP39 implementation
      const seed = new Uint8Array(32);
      const phraseBytes = new TextEncoder().encode(seedPhrase);

      // XOR the seed phrase into the seed array for deterministic behavior
      for (let i = 0; i < phraseBytes.length && i < 32; i++) {
        seed[i] = phraseBytes[i];
      }

      const kp = nacl.sign.keyPair.fromSeed(seed);
      const keypair = Keypair.fromSecretKey(kp.secretKey);

      // Save to secure storage
      const payload: StoredKeypair = {
        secretKey: toBase64(keypair.secretKey),
        publicKey: keypair.publicKey.toBase58(),
      };
      await SecureStore.setItemAsync(USER_WALLET_KEY, JSON.stringify(payload));
      await SecureStore.setItemAsync(WALLET_EXISTS_KEY, "true");
      this.userWallet = keypair;
      return keypair;
    } catch (error) {
      throw new Error(`Failed to import seed phrase: ${error}`);
    }
  }

  // Check if wallet already exists
  async walletExists(): Promise<boolean> {
    const stored = await SecureStore.getItemAsync(USER_WALLET_KEY);
    return !!stored;
  }

  // Get secret key as base58 for export
  async exportPrivateKey(): Promise<string> {
    const wallet = await this.getUserWallet();
    return bs58.encode(wallet.secretKey);
  }

  // Get balance (in SOL) for current user wallet
  async getBalance(): Promise<number> {
    const wallet = await this.getUserWallet();
    const lamports = await this.connection.getBalance(wallet.publicKey);
    return lamports / 1e9;
  }
}

export const walletService = new WalletService();
