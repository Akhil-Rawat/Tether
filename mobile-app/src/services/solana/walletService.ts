import * as SecureStore from 'expo-secure-store';
import { Buffer } from 'buffer';
import nacl from 'tweetnacl';
import { Keypair, PublicKey } from '@solana/web3.js';

const USER_WALLET_KEY = 'guardian_user_wallet';
const AI_AUTHORITY_KEY = 'guardian_ai_authority_wallet';

// Deterministic seed for AI authority (must match contract's TRUSTED_AI_AUTHORITY)
// Generated as: nacl.sign.keyPair.fromSeed(sha256("guardian_ai_authority_seed_32bytes!"))
// Public key: GQ7UU2BurgDEmzfkEfxKY9LwHwzNgPMxyanhbig2hfRZ
const AI_AUTHORITY_SEED = 'guardian_ai_authority_seed_32bytes!';

const toBase64 = (bytes: Uint8Array): string => Buffer.from(bytes).toString('base64');
const fromBase64 = (value: string): Uint8Array => new Uint8Array(Buffer.from(value, 'base64'));

interface StoredKeypair {
  secretKey: string;
  publicKey: string;
}

export class WalletService {
  private userWallet: Keypair | null = null;
  private aiAuthority: Keypair | null = null;

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
}

export const walletService = new WalletService();
