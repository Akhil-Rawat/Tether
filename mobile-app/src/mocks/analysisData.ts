/**
 * Mocked Analysis Data
 * Simulates AI decision engine responses
 */

import {
  Transaction,
  TransactionAnalysis,
  DecisionType,
  AnalysisScores,
} from '../types';

/**
 * Determine decision based on amount and recipient
 */
function getDecision(transaction: Transaction): DecisionType {
  const { amount, recipient } = transaction;

  // Known recipients (simulated from history)
  const knownRecipients = [
    'So11111111111111111111111111111111111111112', // Common wallet
    '11111111111111111111111111111111', // Another known wallet
  ];

  const isKnown = knownRecipients.includes(recipient);

  if (isKnown && amount < 10) {
    return DecisionType.ALLOW;
  } else if (isKnown && amount < 50) {
    return DecisionType.PARTIAL;
  } else if (!isKnown && amount < 5) {
    return DecisionType.DELAY;
  } else {
    return DecisionType.REJECT;
  }
}

/**
 * Generate risk-appropriate scores
 */
function generateScores(decision: DecisionType): AnalysisScores {
  const scoreMap = {
    [DecisionType.ALLOW]: {
      confidence: 85 + Math.random() * 10,
      riskScore: 15 + Math.random() * 10,
      deviationScore: 5 + Math.random() * 10,
      impactScore: 20 + Math.random() * 15,
    },
    [DecisionType.PARTIAL]: {
      confidence: 70 + Math.random() * 10,
      riskScore: 35 + Math.random() * 15,
      deviationScore: 30 + Math.random() * 15,
      impactScore: 45 + Math.random() * 20,
    },
    [DecisionType.DELAY]: {
      confidence: 65 + Math.random() * 10,
      riskScore: 45 + Math.random() * 20,
      deviationScore: 50 + Math.random() * 20,
      impactScore: 60 + Math.random() * 20,
    },
    [DecisionType.REJECT]: {
      confidence: 90 + Math.random() * 5,
      riskScore: 75 + Math.random() * 15,
      deviationScore: 80 + Math.random() * 15,
      impactScore: 85 + Math.random() * 10,
    },
  };

  const scores = scoreMap[decision];
  return {
    confidence: Math.min(100, Math.round(scores.confidence)),
    riskScore: Math.min(100, Math.round(scores.riskScore)),
    deviationScore: Math.min(100, Math.round(scores.deviationScore)),
    impactScore: Math.min(100, Math.round(scores.impactScore)),
  };
}

/**
 * Generate reasoning based on decision
 */
function generateReasoning(
  transaction: Transaction,
  decision: DecisionType,
  scores: AnalysisScores
): string {
  const { amount, recipient } = transaction;

  const reasoningMap = {
    [DecisionType.ALLOW]: `Transaction approved. Low deviation from typical patterns. Amount of ${amount} SOL to ${recipient.slice(
      0,
      8
    )}... is within normal parameters. Recipient appears in transaction history.`,

    [DecisionType.PARTIAL]: `Partial approval recommended. Amount is elevated compared to historical average. Recipient is known, but transaction size triggers graduated approval. Approved 50% of requested amount.`,

    [DecisionType.DELAY]: `Delayed execution recommended. Recipient not in recent history. Moderate deviation detected. Timelock allows for additional verification before execution. Execute after 1 hour.`,

    [DecisionType.REJECT]: `Transaction blocked. High deviation from normal behavior pattern. Recipient not in history. Amount significantly exceeds typical transaction size. Potential phishing or suspicious activity detected.`,
  };

  return reasoningMap[decision];
}

/**
 * Generate risk factors based on analysis
 */
function generateRiskFactors(
  transaction: Transaction,
  decision: DecisionType,
  scores: AnalysisScores
): string[] {
  const factors: string[] = [];

  if (scores.deviationScore > 60) {
    factors.push('Unusual recipient address');
  }

  if (scores.impactScore > 60) {
    factors.push('Large transaction amount');
  }

  if (scores.riskScore > 50) {
    factors.push('Elevated risk indicators');
  }

  if (transaction.recipient.length < 20) {
    factors.push('Recipient address format unusual');
  }

  if (decision === DecisionType.REJECT) {
    factors.push('Multiple risk factors detected');
  }

  return factors.length > 0 ? factors : ['Low risk detected'];
}

/**
 * Generate behavior analysis
 */
function generateBehaviorAnalysis(
  transaction: Transaction,
  scores: AnalysisScores
): string {
  const avgHistorical = 5;
  const deviation = Math.round(((transaction.amount - avgHistorical) / avgHistorical) * 100);

  if (Math.abs(deviation) < 20) {
    return `Transaction amount is ${
      deviation > 0 ? `${deviation}% above` : `${Math.abs(deviation)}% below`
    } your historical average of ${avgHistorical} SOL. Pattern consistent with normal behavior.`;
  } else if (Math.abs(deviation) < 50) {
    return `Transaction amount is ${
      deviation > 0 ? `${deviation}% above` : `${Math.abs(deviation)}% below`
    } your historical average of ${avgHistorical} SOL. Moderate deviation detected.`;
  } else {
    return `Transaction amount is ${
      deviation > 0 ? `${deviation}% above` : `${Math.abs(deviation)}% below`
    } your historical average of ${avgHistorical} SOL. Significant deviation from typical patterns.`;
  }
}

/**
 * Generate complete mock analysis
 */
export function getMockAnalysis(transaction: Transaction): TransactionAnalysis {
  const decision = getDecision(transaction);
  const scores = generateScores(decision);
  const reasoning = generateReasoning(transaction, decision, scores);
  const riskFactors = generateRiskFactors(transaction, decision, scores);
  const behaviorAnalysis = generateBehaviorAnalysis(transaction, scores);

  return {
    id: `analysis-${transaction.id}`,
    transaction,
    decision,
    scores,
    reasoning,
    riskFactors,
    behaviorAnalysis,
    timestamp: Date.now(),
  };
}

/**
 * Mock decision explanations
 */
export const DecisionExplanations = {
  [DecisionType.ALLOW]:
    'The transaction matches your established spending patterns. The recipient is in your history and the amount is typical. You can approve this immediately.',

  [DecisionType.REJECT]:
    'Multiple risk factors detected. This transaction deviates significantly from your behavior. We recommend blocking this transaction to protect your funds.',

  [DecisionType.DELAY]:
    'This transaction needs verification before execution. We will hold it for 1 hour, allowing time for you to verify. Execute whenever ready.',

  [DecisionType.PARTIAL]:
    'We recommend approving only 50% of this transaction. If you need the full amount, you can request a new transaction after this one completes.',
};
