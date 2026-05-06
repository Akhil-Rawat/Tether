/**
 * Contract Enforcement & Bypass Testing
 * 
 * Validates that smart contract decisions cannot be bypassed.
 * Tests:
 * 1. REJECT always blocks transfers
 * 2. ALLOW always transfers full amount
 * 3. PARTIAL always transfers 50%
 * 4. DELAY stores without transfer
 * 5. Bypass attempts fail (mismatched params)
 */

export class EnforcementTester {
  /**
   * Test that a REJECT decision blocks all transfers
   * @param {ContractExecutor} executor - Contract executor
   * @param {Object} params - Transaction params
   * @returns {Object} Test result
   */
  static testRejectBlocks(executor, params) {
    const result = {
      decisionType: "REJECT",
      testName: "REJECT blocks transfer",
      params,
      attempts: [],
    };

    // Attempt 1: Standard REJECT
    try {
      const standardResult = executor.executeWithDecision({
        ...params,
        decision: "REJECT",
      });

      result.attempts.push({
        attemptType: "standard",
        success: standardResult.success,
        transferred: standardResult.transferredAmount,
        blocked: !standardResult.success,
      });
    } catch (e) {
      result.attempts.push({
        attemptType: "standard",
        error: e.message,
        blocked: true,
      });
    }

    // Attempt 2: Try to bypass with modified amount (should still fail)
    try {
      const bypassResult = executor.executeWithDecision({
        ...params,
        decision: "REJECT",
        amount: 0.001, // Minimal amount
      });

      result.attempts.push({
        attemptType: "bypass_tiny_amount",
        success: bypassResult.success,
        transferred: bypassResult.transferredAmount,
        blocked: !bypassResult.success,
      });
    } catch (e) {
      result.attempts.push({
        attemptType: "bypass_tiny_amount",
        error: e.message,
        blocked: true,
      });
    }

    // All REJECT attempts must fail (blocked)
    const allBlocked = result.attempts.every((a) => a.blocked || a.error);
    result.enforcementSuccessful = allBlocked;
    result.bypassRate = allBlocked ? 0 : (result.attempts.length - 0) / result.attempts.length;

    return result;
  }

  /**
   * Test that ALLOW transfers full amount
   * @param {ContractExecutor} executor
   * @param {Object} params
   * @returns {Object} Test result
   */
  static testAllowTransfers(executor, params) {
    const { amount, user } = params;
    const initialBalance = executor.state.getBalance(user);

    const result = {
      decisionType: "ALLOW",
      testName: "ALLOW transfers full amount",
      params,
      initialBalance,
      expectedTransfer: amount,
      actualTransfers: [],
    };

    try {
      const execResult = executor.executeWithDecision({
        ...params,
        decision: "ALLOW",
      });

      const finalBalance = executor.state.getBalance(user);
      const actualTransferred = initialBalance - finalBalance;

      result.actualTransfers.push({
        attempt: 1,
        success: execResult.success,
        requested: amount,
        transferred: execResult.transferredAmount,
        correct: execResult.transferredAmount === amount,
      });

      result.enforcementSuccessful = execResult.transferredAmount === amount;
      result.finalBalance = finalBalance;
    } catch (e) {
      result.error = e.message;
      result.enforcementSuccessful = false;
    }

    return result;
  }

  /**
   * Test that PARTIAL transfers 50%
   * @param {ContractExecutor} executor
   * @param {Object} params
   * @returns {Object} Test result
   */
  static testPartialTransfers(executor, params) {
    const { amount } = params;
    const expectedPartial = Math.floor(amount * 0.5);

    const result = {
      decisionType: "PARTIAL",
      testName: "PARTIAL transfers 50%",
      params,
      requestedAmount: amount,
      expectedAmount: expectedPartial,
      actualTransfer: null,
    };

    try {
      const execResult = executor.executeWithDecision({
        ...params,
        decision: "PARTIAL",
      });

      result.actualTransfer = execResult.transferredAmount;
      result.correct = execResult.transferredAmount === expectedPartial;
      result.enforcementSuccessful = result.correct;

      if (!result.correct) {
        result.error = `Expected ${expectedPartial}, got ${execResult.transferredAmount}`;
      }
    } catch (e) {
      result.error = e.message;
      result.enforcementSuccessful = false;
    }

    return result;
  }

  /**
   * Test that DELAY stores in PDA without transferring
   * @param {ContractExecutor} executor
   * @param {Object} params
   * @returns {Object} Test result
   */
  static testDelayStores(executor, params) {
    const { amount, user } = params;
    const initialBalance = executor.state.getBalance(user);

    const result = {
      decisionType: "DELAY",
      testName: "DELAY stores without transfer",
      params,
      initialBalance,
      pdaStored: false,
      balanceUnchanged: false,
    };

    try {
      const execResult = executor.executeWithDecision({
        ...params,
        decision: "DELAY",
      });

      const finalBalance = executor.state.getBalance(user);
      result.balanceUnchanged = finalBalance === initialBalance;
      result.balanceTransferred = execResult.transferredAmount === 0;
      result.pdaStored = execResult.pdaKey !== undefined;

      result.enforcementSuccessful =
        result.balanceUnchanged && result.balanceTransferred && result.pdaStored;
    } catch (e) {
      result.error = e.message;
      result.enforcementSuccessful = false;
    }

    return result;
  }

  /**
   * Attempt to bypass contract enforcement
   * @param {ContractExecutor} executor
   * @param {Object} originalParams
   * @returns {Array} Results of bypass attempts
   */
  static testBypassAttempts(executor, originalParams) {
    const results = [];

    // Bypass 1: Call REJECT decision with ALLOW params (should still block)
    try {
      const attempt1 = executor.executeWithDecision({
        ...originalParams,
        decision: "REJECT",
      });

      results.push({
        bypassType: "mismatch_decision_REJECT",
        success: attempt1.success,
        transferred: attempt1.transferredAmount,
        blocked: !attempt1.success,
      });
    } catch (e) {
      results.push({
        bypassType: "mismatch_decision_REJECT",
        error: e.message,
        blocked: true,
      });
    }

    // Bypass 2: Try to manually execute transfer without decision
    try {
      // This assumes ContractExecutor has validation
      const attempt2 = executor.executeWithDecision({
        ...originalParams,
        decision: "ALLOW",
        riskScore: -100, // Fake risk score
      });

      results.push({
        bypassType: "fake_risk_score",
        success: attempt2.success,
        note: "System accepted fake risk score",
        severity: attempt2.success ? "HIGH" : "LOW",
      });
    } catch (e) {
      results.push({
        bypassType: "fake_risk_score",
        error: e.message,
        blocked: true,
      });
    }

    // Bypass 3: Try to escalate from PARTIAL to ALLOW
    try {
      const partial = executor.executeWithDecision({
        ...originalParams,
        decision: "PARTIAL",
      });

      // Now try to get more from same decision
      const attempt3 = executor.executeWithDecision({
        ...originalParams,
        decision: "PARTIAL",
        amount: originalParams.amount * 2,
      });

      results.push({
        bypassType: "escalate_amount",
        firstTransfer: partial.transferredAmount,
        secondAttempt: attempt3.transferredAmount,
        totalTransferred: partial.transferredAmount + attempt3.transferredAmount,
        note: "Multiple partial transfers",
      });
    } catch (e) {
      results.push({
        bypassType: "escalate_amount",
        error: e.message,
      });
    }

    return results;
  }

  /**
   * Run comprehensive enforcement test suite
   * @param {ContractExecutor} executor
   * @param {Array} testCases
   * @returns {Object} Enforcement summary
   */
  static runFullEnforcementSuite(executor, testCases) {
    const results = {
      totalTests: testCases.length,
      byDecision: {
        ALLOW: [],
        REJECT: [],
        PARTIAL: [],
        DELAY: [],
      },
      bypassAttempts: [],
      summary: {
        enforcementSuccessful: 0,
        enforcementFailed: 0,
        bypassesSuccessful: 0,
        bypassesBlocked: 0,
      },
    };

    for (const testCase of testCases) {
      const { decision, params } = testCase;

      // Test decision enforcement
      let testResult;
      if (decision === "REJECT") {
        testResult = this.testRejectBlocks(executor, params);
      } else if (decision === "ALLOW") {
        testResult = this.testAllowTransfers(executor, params);
      } else if (decision === "PARTIAL") {
        testResult = this.testPartialTransfers(executor, params);
      } else if (decision === "DELAY") {
        testResult = this.testDelayStores(executor, params);
      }

      if (testResult.enforcementSuccessful) {
        results.summary.enforcementSuccessful++;
      } else {
        results.summary.enforcementFailed++;
      }

      results.byDecision[decision].push(testResult);

      // Test bypass attempts
      const bypassResults = this.testBypassAttempts(executor, params);
      const blockedBypass = bypassResults.filter(
        (b) => b.blocked || b.error
      ).length;
      results.summary.bypassesBlocked += blockedBypass;
      results.summary.bypassesSuccessful += bypassResults.length - blockedBypass;
      results.bypassAttempts.push(...bypassResults);
    }

    return results;
  }
}
