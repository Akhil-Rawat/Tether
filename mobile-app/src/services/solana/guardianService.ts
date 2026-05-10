import { Connection, PublicKey } from '@solana/web3.js';
import { Buffer } from 'buffer';
import { DecisionType } from '../../types';
import { TransactionStatus } from '../../types';
import { guardianTransactionBuilder, toLamports } from './transactionBuilder';
import {
  GUARDIAN_DEVNET_RPC_URL,
  GuardianAnalysisResult,
  GuardianThreatContext,
  GuardianTransactionInput,
  GuardianExecutionResult,
} from './types';
import { walletService } from './walletService';

const DEFAULT_EXPIRY_SECONDS = 300;

const secondsFromNow = (seconds: number): number => Math.floor(Date.now() / 1000) + seconds;

export class GuardianService {
  private connection = new Connection(GUARDIAN_DEVNET_RPC_URL, 'confirmed');

  getConnection(): Connection {
    return this.connection;
  }

  async getBalanceLamports(publicKey?: PublicKey): Promise<bigint> {
    const wallet = publicKey ?? (await walletService.getWalletAddress());
    const balance = await this.connection.getBalance(wallet, 'confirmed');
    return BigInt(balance);
  }

  async lookupPda(account: PublicKey): Promise<boolean> {
    const info = await this.connection.getAccountInfo(account, 'confirmed');
    return info !== null;
  }

  async analyzeTransaction(
    input: GuardianTransactionInput,
    threatContext?: GuardianThreatContext
  ): Promise<GuardianAnalysisResult> {
    const signer = await walletService.getUserWallet();
    const recipient = new PublicKey(input.recipient);
    const amountLamports = toLamports(input.amountSol);
    const balanceLamports = await this.getBalanceLamports(signer.publicKey);
    const recipientExists = await this.lookupPda(recipient);
    const nonce = BigInt(Date.now());
    const expiryTimestamp = secondsFromNow(DEFAULT_EXPIRY_SECONDS);

    const balanceRatio = balanceLamports === 0n ? 100 : Number((amountLamports * 100n) / balanceLamports);
    const amountSol = input.amountSol;
    const riskScore = Math.min(100, Math.round(balanceRatio * 0.9 + (recipientExists ? 10 : 25)));
    const deviationScore = Math.min(100, Math.round(balanceRatio * 1.1 + (recipientExists ? 5 : 20)));
    const impactScore = Math.min(100, Math.round(balanceRatio * 1.3));
    const confidence = Math.max(5, 100 - Math.max(riskScore, deviationScore));

    const phishingAnalysis = threatContext?.phishingAnalysis ?? null;
    const threatBoost = phishingAnalysis
      ? Math.max(
          phishingAnalysis.threatScore,
          phishingAnalysis.phishingProbability,
          phishingAnalysis.scamConfidence
        )
      : 0;
    const boostedRiskScore = Math.min(100, Math.max(riskScore, threatBoost));
    const boostedDeviationScore = Math.min(100, Math.max(deviationScore, Math.round(threatBoost * 0.9)));
    const boostedConfidence = Math.max(1, 100 - Math.max(boostedRiskScore, boostedDeviationScore));

    let decision: DecisionType = DecisionType.ALLOW;
    let delaySeconds = 0;
    let partialAmount = 0n;
    const riskFactors: string[] = [];

    if (!recipientExists) {
      riskFactors.push('Recipient account does not exist on devnet');
    }

    if (phishingAnalysis) {
      riskFactors.push(`OCR threat detected: ${phishingAnalysis.summary}`);
      if (phishingAnalysis.indicators.length > 0) {
        riskFactors.push('Local OCR pipeline identified suspicious text or wallet phishing indicators');
      }
    }

    if (phishingAnalysis?.recommendedAction === 'REJECT' || phishingAnalysis?.threatLevel === 'CRITICAL') {
      decision = DecisionType.REJECT;
    } else if (amountLamports > balanceLamports) {
      riskFactors.push('Requested amount exceeds available balance');
      decision = DecisionType.REJECT;
    } else if (!recipientExists && balanceRatio > 35) {
      riskFactors.push('High-value transfer to unknown recipient');
      decision = DecisionType.REJECT;
    } else if (!recipientExists || balanceRatio > 35) {
      riskFactors.push('Additional verification required before execution');
      decision = DecisionType.DELAY;
      delaySeconds = 3600;
    } else if (balanceRatio > 15) {
      riskFactors.push('Amount is elevated compared to available balance');
      decision = DecisionType.PARTIAL;
      partialAmount = amountLamports / 2n;
    } else {
      decision = DecisionType.ALLOW;
    }

    if (decision === DecisionType.PARTIAL && partialAmount === 0n) {
      partialAmount = amountLamports / 2n;
    }

    const decisionValue =
      decision === DecisionType.ALLOW
        ? 0
        : decision === DecisionType.REJECT
          ? 1
          : decision === DecisionType.DELAY
            ? 2
            : 3;

    const decisionPackage = {
      decision: decisionValue,
      amount: amountLamports,
      recipient,
      nonce,
      expiry_timestamp: expiryTimestamp,
      delay_seconds: delaySeconds,
      partial_amount: partialAmount,
    } as any;

    const aiAuthority = await walletService.getAiAuthorityWallet();
    const { computeDecisionHash, signDecisionHash } = await import('./transactionBuilder');
    const hashBuffer = await computeDecisionHash(decisionPackage as any);
    const signatureBuffer = signDecisionHash(hashBuffer, aiAuthority.secretKey);

    const reasoning =
      decision === DecisionType.ALLOW
        ? `Real devnet analysis approved this transaction. The recipient exists on-chain and the amount fits within your current balance.`
        : decision === DecisionType.PARTIAL
          ? `The transfer is real, but it is large relative to your current balance. Guardian recommends a capped approval to reduce risk.`
          : decision === DecisionType.DELAY
            ? `Guardian found a live risk signal in the current account state. The transaction is valid, but it should be delayed for manual review.`
            : `Guardian detected a live mismatch between the requested transfer and the available account state, so execution is blocked.`;

    const ocrReasoning = phishingAnalysis
      ? `\n\nOCR risk overlay: ${phishingAnalysis.reasoning}`
      : '';

    const behaviorAnalysis =
      `Current balance is ${Number(balanceLamports) / 1_000_000_000} SOL. ` +
      `Requested amount is ${amountSol} SOL. ` +
      `Recipient ${recipientExists ? 'already exists on devnet' : 'is not present on devnet'}.`;

    const recommendation =
      decision === DecisionType.ALLOW
        ? 'Proceed immediately'
        : decision === DecisionType.PARTIAL
          ? 'Approve a capped amount'
          : decision === DecisionType.DELAY
            ? 'Set a timelock and recheck'
            : 'Block execution';

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
      decisionHash: Buffer.from(hashBuffer).toString('hex'),
      signature: Buffer.from(signatureBuffer).toString('hex'),
      scores: {
        confidence: boostedConfidence,
        riskScore: boostedRiskScore,
        deviationScore: boostedDeviationScore,
        impactScore,
      },
      reasoning: `${reasoning}${ocrReasoning}`,
      riskFactors,
      behaviorAnalysis,
      balanceLamports,
      recipientExists,
      confirmationRequired: decision !== DecisionType.REJECT,
      recommendedAction: recommendation,
      createdAt: Date.now(),
    } as GuardianAnalysisResult;
  }

  async executeAnalysis(
    analysis: GuardianAnalysisResult,
    options?: {
      approvalAmountLamports?: bigint;
      delaySecondsOverride?: number;
    }
  ): Promise<GuardianExecutionResult> {
    if (analysis.decision === DecisionType.REJECT) {
      return {
        success: false,
        decision: analysis.decision,
        decisionHash: analysis.decisionHash,
        signature: analysis.signature,
        status: 'BLOCKED',
        error: 'Guardian rejected this transaction before on-chain execution.',
      };
    }

    const connection = this.getConnection();
    const result = await guardianTransactionBuilder.execute(connection, analysis, {
      approvalAmountLamports: options?.approvalAmountLamports,
      delaySecondsOverride: options?.delaySecondsOverride,
    });

    return result;
  }
}

export const guardianService = new GuardianService();
