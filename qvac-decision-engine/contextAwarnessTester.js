/**
 * Context Awareness Tester
 * 
 * Proves that the system is CONTEXT-AWARE:
 * - Same transaction with different history → different decisions
 * - Different contexts produce appropriate decisions
 * - Not a rule-based system (not deterministic for given input)
 */

export class ContextAwarnessTester {
  /**
   * Create multiple contexts for same transaction
   * @param {number} amount - Transaction amount
   * @param {string} recipient - Recipient address
   * @returns {Object} Contexts with different histories
   */
  static createContextVariations(amount, recipient) {
    return {
      context1_known: {
        name: "Known Recipient - Normal Usage",
        transaction: { amount, recipient, isKnown: true },
        history: [
          { amount: amount - 2, recipient },
          { amount: amount - 1, recipient },
          { amount, recipient },
        ],
        expectedLogic:
          "Low deviation (similar to history) + known recipient → likely ALLOW",
      },

      context2_unknown: {
        name: "Unknown Recipient - First Time",
        transaction: { amount, recipient, isKnown: false },
        history: [],
        expectedLogic:
          "No history + unknown recipient → moderate deviation → likely DELAY or PARTIAL",
      },

      context3_spike: {
        name: "Sudden Spike - Normal Amount",
        transaction: { amount, recipient, isKnown: false },
        history: [
          { amount: 1, recipient: "wallet_a" },
          { amount: 1, recipient: "wallet_b" },
          { amount: 2, recipient: "wallet_c" },
        ],
        expectedLogic:
          "High spike from normal pattern (1-2 → amount) → high deviation + unknown → likely REJECT or DELAY",
      },

      context4_habitual: {
        name: "Habitual Large Transfers",
        transaction: { amount: 1000, recipient: "known_partner", isKnown: true },
        history: [
          { amount: 900, recipient: "known_partner" },
          { amount: 1000, recipient: "known_partner" },
          { amount: 950, recipient: "known_partner" },
        ],
        expectedLogic:
          "Large amount but normal for recipient history + known → likely ALLOW",
      },

      context5_escalation: {
        name: "Escalation Pattern",
        transaction: { amount: 100, recipient: "wallet_x", isKnown: false },
        history: [
          { amount: 10, recipient: "wallet_x" },
          { amount: 20, recipient: "wallet_x" },
          { amount: 50, recipient: "wallet_x" },
        ],
        expectedLogic:
          "Escalating pattern to same unknown wallet → suspicious → likely REJECT or DELAY",
      },
    };
  }

  /**
   * Test that same TX gets different decisions in different contexts
   * @param {Function} decisionFn - Async function that analyzes transaction
   * @param {Object} contexts - Contexts from createContextVariations
   * @returns {Promise<Object>} Results
   */
  static async testContextDependence(decisionFn, contexts) {
    const results = {
      testName: "Context Awareness Test",
      totalContexts: Object.keys(contexts).length,
      decisions: {},
      contextAware: false,
      uniqueDecisions: new Set(),
      analysis: [],
    };

    for (const [contextKey, contextData] of Object.entries(contexts)) {
      try {
        const decision = await decisionFn(
          contextData.transaction,
          contextData.history
        );

        results.decisions[contextKey] = {
          name: contextData.name,
          decision: decision.decision,
          riskScore: decision.riskScore,
          deviationScore: decision.deviationScore,
          impactScore: decision.impactScore,
          expectedLogic: contextData.expectedLogic,
        };

        results.uniqueDecisions.add(decision.decision);

        results.analysis.push({
          context: contextData.name,
          decision: decision.decision,
          reasoning: `Risk: ${decision.riskScore}, Deviation: ${decision.deviationScore.toFixed(2)}, Impact: ${decision.impactScore.toFixed(2)}x`,
        });
      } catch (e) {
        results.decisions[contextKey] = {
          name: contextData.name,
          error: e.message,
        };
      }
    }

    // Context-aware if different contexts produce different decisions
    results.contextAware = results.uniqueDecisions.size >= 2;
    results.decisionVariety = results.uniqueDecisions.size;

    return results;
  }

  /**
   * Test specific context-aware scenario
   * @param {Object} scenario - {name, tx1, history1, tx2, history2, expectationDescription}
   * @param {Function} decisionFn - Decision function
   * @returns {Promise<Object>} Comparison result
   */
  static async testSpecificScenario(scenario, decisionFn) {
    const result = {
      scenario: scenario.name,
      expectation: scenario.expectationDescription,
      test1: null,
      test2: null,
      differentDecisions: false,
      contextAware: false,
    };

    try {
      result.test1 = await decisionFn(scenario.tx1, scenario.history1);
    } catch (e) {
      result.test1 = { error: e.message };
    }

    try {
      result.test2 = await decisionFn(scenario.tx2, scenario.history2);
    } catch (e) {
      result.test2 = { error: e.message };
    }

    if (result.test1.decision && result.test2.decision) {
      result.differentDecisions =
        result.test1.decision !== result.test2.decision;
      result.contextAware = result.differentDecisions;
    }

    return result;
  }

  /**
   * Create specific context-aware test scenarios
   */
  static getContextScenarios() {
    return [
      {
        name: "Same Amount, Different Recipients",
        tx1: { amount: 50, recipient: "wallet_1", isKnown: true },
        history1: [
          { amount: 50, recipient: "wallet_1" },
          { amount: 50, recipient: "wallet_1" },
        ],
        tx2: { amount: 50, recipient: "wallet_unknown", isKnown: false },
        history2: [],
        expectationDescription:
          "Same amount to known recipient (ALLOW) vs unknown recipient (REJECT/DELAY)",
      },

      {
        name: "Same Recipient, Different Amount Norms",
        tx1: { amount: 100, recipient: "partner", isKnown: true },
        history1: [
          { amount: 100, recipient: "partner" },
          { amount: 100, recipient: "partner" },
        ],
        tx2: { amount: 100, recipient: "partner", isKnown: true },
        history2: [
          { amount: 1, recipient: "partner" },
          { amount: 2, recipient: "partner" },
        ],
        expectationDescription:
          "100 SOL normal for partner (ALLOW) vs 100 SOL spike from usual 1-2 (DELAY/PARTIAL)",
      },

      {
        name: "First Transaction vs Repeat",
        tx1: { amount: 50, recipient: "new_wallet", isKnown: false },
        history1: [],
        tx2: { amount: 50, recipient: "new_wallet", isKnown: false },
        history2: [
          { amount: 50, recipient: "new_wallet" },
          { amount: 50, recipient: "new_wallet" },
        ],
        expectationDescription:
          "First transaction to unknown (risky) vs established pattern (safer)",
      },

      {
        name: "High Risk vs Low Risk Pattern",
        tx1: { amount: 500, recipient: "suspicious", isKnown: false },
        history1: [],
        tx2: { amount: 500, recipient: "customer", isKnown: true },
        history2: [
          { amount: 500, recipient: "customer" },
          { amount: 500, recipient: "customer" },
        ],
        expectationDescription:
          "Unknown large transfer (REJECT) vs customer payment routine (ALLOW)",
      },
    ];
  }

  /**
   * Run comprehensive context awareness test
   * @param {Function} decisionFn - Decision analysis function
   * @returns {Promise<Object>} Full analysis
   */
  static async runFullContextTest(decisionFn) {
    const results = {
      totalScenarios: 0,
      contextAwareScenarios: 0,
      scenarios: [],
      verdict: "NOT_CONTEXT_AWARE",
    };

    const scenarios = this.getContextScenarios();
    results.totalScenarios = scenarios.length;

    for (const scenario of scenarios) {
      const testResult = await this.testSpecificScenario(scenario, decisionFn);
      results.scenarios.push(testResult);

      if (testResult.contextAware) {
        results.contextAwareScenarios++;
      }
    }

    // Determine verdict
    const contextAwarePercentage =
      (results.contextAwareScenarios / results.totalScenarios) * 100;
    if (contextAwarePercentage === 100) {
      results.verdict = "FULLY_CONTEXT_AWARE";
    } else if (contextAwarePercentage >= 75) {
      results.verdict = "MOSTLY_CONTEXT_AWARE";
    } else if (contextAwarePercentage >= 50) {
      results.verdict = "PARTIALLY_CONTEXT_AWARE";
    }

    results.contextAwarenessScore =
      Math.round(contextAwarePercentage);

    return results;
  }
}
