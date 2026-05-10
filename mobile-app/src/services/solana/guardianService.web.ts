import { DecisionType } from '../../types';
import { TransactionStatus } from '../../types';

const DEFAULT_EXPIRY_SECONDS = 300;
const secondsFromNow = (seconds: number): number => Math.floor(Date.now() / 1000) + seconds;

export class GuardianService {
  getConnection() {
    return null;
  }

  async getBalanceLamports(_publicKey?: any): Promise<bigint> {
    return 0n;
  }

  async lookupPda(_account: any): Promise<boolean> {
    return false;
  }

  async analyzeTransaction(input: any, threatContext?: any): Promise<any> {
    const amountLamports = BigInt(Math.round(input.amountSol * 1_000_000_000));
    const recipientExists = false;
    const nonce = BigInt(Date.now());
    const expiryTimestamp = secondsFromNow(DEFAULT_EXPIRY_SECONDS);

    const decision = DecisionType.ALLOW;
    const decisionValue = 0;

    const decisionPackage = {
      decision: decisionValue,
      amount: amountLamports,
      recipient: input.recipient,
      nonce,
      expiry_timestamp: expiryTimestamp,
      delay_seconds: 0,
      partial_amount: 0n,
    } as any;

    return {
      id: `analysis-${Date.now()}`,
      transactionId: `tx-${Date.now()}`,
      transaction: {
        id: `tx-${Date.now()}`,
        recipient: input.recipient,
        amountSol: input.amountSol,
        amountLamports,
        status: TransactionStatus.ANALYZED,
      },
      decision,
      decisionValue,
      decisionPackage,
      decisionHash: 'stubbed',
      signature: 'stubbed',
      scores: {
        confidence: 100,
        riskScore: 0,
        deviationScore: 0,
        impactScore: 0,
      },
      reasoning: 'Web stubbed analysis',
      riskFactors: [],
      behaviorAnalysis: '',
      balanceLamports: 0n,
      recipientExists,
      confirmationRequired: false,
      recommendedAction: 'Proceed immediately',
      createdAt: Date.now(),
    };
  }

  async executeAnalysis(_analysis: any): Promise<any> {
    return {
      success: true,
      decision: DecisionType.ALLOW,
      decisionHash: 'stubbed',
      signature: 'stubbed',
      status: 'SIMULATED',
    };
  }
}

export const guardianService = new GuardianService();
