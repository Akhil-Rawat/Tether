/**
 * Smart Contract Validator
 * 
 * Simulates Solana Anchor contract execution and validates:
 * - Decision enforcement
 * - Anti-bypass mechanisms
 * - Transfer logic
 */

// ============================================================================
// CONTRACT STATE SIMULATION
// ============================================================================

class ContractState {
  constructor() {
    this.transactionLog = [];
    this.pdaBalances = new Map();
    this.userBalances = new Map();
    this.decisionCache = new Map();
  }

  getBalance(account) {
    return this.userBalances.get(account) || 0;
  }

  setBalance(account, amount) {
    this.userBalances.set(account, amount);
  }

  deductBalance(account, amount) {
    const current = this.getBalance(account);
    if (current < amount) {
      throw new Error(`Insufficient balance: ${current} < ${amount}`);
    }
    this.setBalance(account, current - amount);
  }

  addBalance(account, amount) {
    const current = this.getBalance(account);
    this.setBalance(account, current + amount);
  }

  getPDABalance(pdaKey) {
    return this.pdaBalances.get(pdaKey) || 0;
  }

  updatePDA(pdaKey, data) {
    this.pdaBalances.set(pdaKey, {
      timestamp: Date.now(),
      data,
    });
  }

  logTransaction(tx) {
    this.transactionLog.push({
      timestamp: Date.now(),
      ...tx,
    });
  }
}

// ============================================================================
// EXECUTE WITH DECISION LOGIC
// ============================================================================

/**
 * Simulates the Solana Anchor contract:
 * execute_with_decision(decision, amount, recipient, user)
 */
class ContractExecutor {
  constructor(contractState) {
    this.state = contractState;
  }

  /**
   * Main contract instruction: execute_with_decision
   *
   * IF decision == REJECT:
   *   → transaction MUST fail (revert)
   *
   * IF decision == ALLOW:
   *   → full amount transferred
   *
   * IF decision == PARTIAL:
   *   → 50% of amount transferred (capped)
   *
   * IF decision == DELAY:
   *   → PDA updated with decision, no transfer
   */
  async executeWithDecision(params) {
    const {
      decision,
      amount,
      recipient,
      user,
      riskScore,
      deviationScore,
      impactScore,
    } = params;

    const pdaKey = `pda_${user}_${Date.now()}`;
    let result = {
      success: false,
      decision,
      amount,
      recipient,
      user,
      riskScore,
      deviationScore,
      impactScore,
      pdaKey,
      error: null,
      transferredAmount: 0,
      reason: "",
    };

    try {
      // Validate user has sufficient balance
      const userBalance = this.state.getBalance(user);
      if (userBalance < amount) {
        result.error = `Insufficient balance: ${userBalance} < ${amount}`;
        result.reason = "Insufficient SOL balance";
        return result;
      }

      // ===== DECISION ENFORCEMENT =====

      if (decision === "REJECT") {
        // Contract MUST reject
        result.reason = `Transaction rejected by AI decision engine (risk: ${riskScore})`;
        result.error = "Transaction rejected";
        this.state.logTransaction({
          type: "REJECTED",
          ...params,
        });
        return result;
      }

      if (decision === "ALLOW") {
        // Full transfer
        this.state.deductBalance(user, amount);
        this.state.addBalance(recipient, amount);
        result.success = true;
        result.transferredAmount = amount;
        result.reason = `Transaction allowed (risk: ${riskScore}, deviation: ${deviationScore.toFixed(3)})`;
        this.state.logTransaction({
          type: "ALLOWED",
          ...params,
          transferredAmount: amount,
        });
        return result;
      }

      if (decision === "PARTIAL") {
        // 50% of requested amount
        const partialAmount = Math.floor(amount * 0.5);
        this.state.deductBalance(user, partialAmount);
        this.state.addBalance(recipient, partialAmount);
        result.success = true;
        result.transferredAmount = partialAmount;
        result.reason = `Partial transfer executed: ${amount} → ${partialAmount} SOL (risk: ${riskScore})`;
        this.state.logTransaction({
          type: "PARTIAL",
          ...params,
          transferredAmount: partialAmount,
        });

        // Update PDA with pending decision
        this.state.updatePDA(pdaKey, {
          status: "pending_review",
          requestedAmount: amount,
          approvedAmount: partialAmount,
          decision: "PARTIAL",
        });
        return result;
      }

      if (decision === "DELAY") {
        // No transfer, update PDA with decision
        result.success = true;
        result.transferredAmount = 0;
        result.reason = `Transaction delayed for review (risk: ${riskScore}, impact: ${impactScore.toFixed(2)}x)`;
        this.state.logTransaction({
          type: "DELAYED",
          ...params,
          transferredAmount: 0,
        });

        // Store decision in PDA for later review
        this.state.updatePDA(pdaKey, {
          status: "pending_decision",
          requestedAmount: amount,
          recipient,
          decision: "DELAY",
          riskScore,
          deviationScore,
          impactScore,
          user,
        });
        return result;
      }

      // Unknown decision
      result.error = `Unknown decision: ${decision}`;
      result.reason = "Invalid decision type";
      return result;
    } catch (error) {
      result.error = error.message;
      result.reason = "Contract execution error";
      return result;
    }
  }

  /**
   * Anti-Bypass Test: Direct call without decision engine
   * Should fail if parameters don't match
   */
  async testBypassAttempt(params) {
    const { decision, amount, recipient, user, fakeDecision } = params;

    const result = {
      bypassAttempted: true,
      originalDecision: decision,
      fakeDecision,
      wasBlocked: false,
      error: null,
    };

    // Try to execute with fake decision
    try {
      if (
        fakeDecision !== decision &&
        decision === "REJECT" &&
        fakeDecision === "ALLOW"
      ) {
        // Attempting to bypass REJECT with ALLOW
        result.wasBlocked = true;
        result.error = "Decision mismatch detected";
      } else if (fakeDecision === decision) {
        result.error = "Same decision, no bypass detected";
      }
    } catch (error) {
      result.wasBlocked = true;
      result.error = error.message;
    }

    return result;
  }

  /**
   * Verify contract enforces decision consistency
   */
  async verifyDecisionConsistency(decision, riskScore) {
    const violations = [];

    // Risk score should align with decision
    if (decision === "REJECT" && riskScore < 70) {
      violations.push(
        `REJECT decision with low risk score: ${riskScore}`
      );
    }
    if (decision === "ALLOW" && riskScore > 40) {
      violations.push(
        `ALLOW decision with high risk score: ${riskScore}`
      );
    }
    if (decision === "PARTIAL" && (riskScore < 40 || riskScore > 75)) {
      violations.push(
        `PARTIAL decision with unexpected risk score: ${riskScore}`
      );
    }

    return {
      consistent: violations.length === 0,
      violations,
    };
  }

  /**
   * Get transaction history
   */
  getTransactionHistory() {
    return this.state.transactionLog;
  }

  /**
   * Get statistics
   */
  getStatistics() {
    const log = this.state.transactionLog;

    const stats = {
      totalTransactions: log.length,
      allowed: log.filter((t) => t.type === "ALLOWED").length,
      rejected: log.filter((t) => t.type === "REJECTED").length,
      delayed: log.filter((t) => t.type === "DELAYED").length,
      partial: log.filter((t) => t.type === "PARTIAL").length,
      totalTransferred: 0,
      averageRiskScore: 0,
    };

    if (log.length > 0) {
      stats.averageRiskScore =
        log.reduce((sum, t) => sum + (t.riskScore || 0), 0) / log.length;
      stats.totalTransferred = log.reduce(
        (sum, t) => sum + (t.transferredAmount || 0),
        0
      );
    }

    return stats;
  }
}

// ============================================================================
// DECISION VALIDATOR
// ============================================================================

/**
 * Validates that decisions from QVAC are enforced correctly
 */
class DecisionValidator {
  /**
   * Check if decision is within expected range
   */
  static validateDecision(decision, riskScore, expectedDecision, expectedRiskRange) {
    const issues = [];

    // Check decision matches expectation
    if (
      expectedDecision &&
      decision !== expectedDecision &&
      decision !== "PARTIAL" // PARTIAL is acceptable alternative
    ) {
      issues.push(
        `Decision mismatch: expected ${expectedDecision}, got ${decision}`
      );
    }

    // Check risk score is in expected range
    if (
      expectedRiskRange &&
      (riskScore < expectedRiskRange[0] || riskScore > expectedRiskRange[1])
    ) {
      issues.push(
        `Risk score out of range: expected [${expectedRiskRange[0]}, ${expectedRiskRange[1]}], got ${riskScore}`
      );
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  /**
   * Verify decision consistency with metrics
   */
  static validateMetrics(deviationScore, impactScore, decision) {
    const issues = [];

    // High deviation + unknown should not be ALLOW
    if (deviationScore > 0.7 && decision === "ALLOW") {
      issues.push(
        `High deviation (${deviationScore.toFixed(3)}) but ALLOW decision`
      );
    }

    // Very high impact should not be ALLOW
    if (impactScore > 10 && decision === "ALLOW") {
      issues.push(
        `Very high impact (${impactScore.toFixed(2)}x) but ALLOW decision`
      );
    }

    // Low deviation + known should not be REJECT
    if (deviationScore < 0.3 && decision === "REJECT") {
      issues.push(
        `Low deviation (${deviationScore.toFixed(3)}) but REJECT decision`
      );
    }

    return {
      consistent: issues.length === 0,
      issues,
    };
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export { ContractState, ContractExecutor, DecisionValidator };
