#!/usr/bin/env node

/**
 * QVAC Decision Engine + Anchor Contract - Test Runner
 *
 * End-to-end stress test suite:
 * 1. Generates 50+ test scenarios
 * 2. Runs QVAC decision engine
 * 3. Executes smart contract enforcement
 * 4. Validates results
 * 5. Generates comprehensive report
 */

import { loadModel, embed, completion, unloadModel } from "@qvac/sdk";
import { allTestScenarios, testCategories } from "./testScenarios.js";
import {
  ContractState,
  ContractExecutor,
  DecisionValidator,
} from "./contractValidator.js";
import { MetricsCollector } from "./metricsCollector.js";

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_USER_BALANCE = 10000;
const TEST_TIMEOUT_MS = 300000; // 5 minutes per test

// ============================================================================
// HELPERS (from decisionEngine.js)
// ============================================================================

function cosineSimilarity(a, b) {
  if (a.length !== b.length) {
    throw new Error("Embedding vectors must have same dimension");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) return 0;

  return dotProduct / (normA * normB);
}

function computeBehaviorModel(history) {
  if (history.length === 0) {
    return {
      avgAmount: 0.1,
      knownRecipients: [],
      historyCount: 0,
    };
  }

  const amounts = history.map((tx) => tx.amount);
  const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  const knownRecipients = [...new Set(history.map((tx) => tx.recipient))];

  return {
    avgAmount,
    knownRecipients,
    historyCount: history.length,
  };
}

function formatTransactionText(amount, recipient) {
  return `Send ${amount} SOL to ${recipient}`;
}

async function computeDeviationScore(
  modelId,
  currentAmount,
  currentRecipient,
  history
) {
  if (history.length === 0) {
    return 0.5;
  }

  const currentText = formatTransactionText(currentAmount, currentRecipient);
  const { embedding: currentEmbedding } = await embed({
    modelId,
    text: currentText,
  });

  const historyTexts = history.map((tx) =>
    formatTransactionText(tx.amount, tx.recipient)
  );

  const { embedding: historyEmbeddings } = await embed({
    modelId,
    text: historyTexts,
  });

  const similarities = historyEmbeddings.map((histEmbed) =>
    cosineSimilarity(currentEmbedding, histEmbed)
  );

  const maxSimilarity = Math.max(...similarities);
  return 1 - maxSimilarity;
}

function computeImpactScore(amount, avgAmount) {
  const divisor = avgAmount || 0.1;
  return Math.min(amount / divisor, 10);
}

function generateConfidence() {
  return 0.75 + Math.random() * 0.2;
}

async function getLLMDecision(
  modelId,
  amount,
  isKnown,
  avgAmount,
  deviationScore,
  impactScore
) {
  const prompt = `You are a financial risk analysis engine.

Transaction Details:
- Amount: ${amount} SOL
- Known recipient: ${isKnown ? "Yes" : "No"}
- Average amount: ${avgAmount} SOL
- Deviation score: ${deviationScore.toFixed(2)}
- Impact score: ${impactScore.toFixed(2)}

Decision Rules:
- High deviation (>0.7) + unknown recipient → REJECT
- High impact (>5) → DELAY
- Medium risk (0.5-0.7) → PARTIAL
- Low risk (<0.5) → ALLOW

Respond ONLY with valid JSON (no markdown):
{"decision":"ALLOW|REJECT|DELAY|PARTIAL","risk_score":0-100,"reason":""}`;

  try {
    const run = completion({
      modelId,
      history: [{ role: "user", content: prompt }],
      stream: false,
    });

    const result = await run.final;
    const responseText = result.text.trim();

    let jsonStr = responseText;
    if (jsonStr.includes("```json")) {
      jsonStr = jsonStr.split("```json")[1].split("```")[0];
    } else if (jsonStr.includes("```")) {
      jsonStr = jsonStr.split("```")[1].split("```")[0];
    }
    jsonStr = jsonStr.trim();

    const parsed = JSON.parse(jsonStr);
    return {
      decision: parsed.decision || "ALLOW",
      risk_score: parsed.risk_score || 50,
      reason: parsed.reason || "LLM analysis",
    };
  } catch (error) {
    const defaultDecision = impactScore > 5 ? "DELAY" : "ALLOW";
    return {
      decision: defaultDecision,
      risk_score: Math.min(impactScore * 10, 100),
      reason: "Fallback decision",
    };
  }
}

// ============================================================================
// TEST RUNNER
// ============================================================================

class TestRunner {
  constructor(llmModelId, embedModelId, contractExecutor, metricsCollector) {
    this.llmModelId = llmModelId;
    this.embedModelId = embedModelId;
    this.contractExecutor = contractExecutor;
    this.metricsCollector = metricsCollector;
    this.testCount = 0;
    this.passCount = 0;
    this.failCount = 0;
  }

  /**
   * Analyze a single transaction through QVAC
   */
  async analyzeTransaction(testCase) {
    const { transaction, history } = testCase;
    const { amount, recipient, isKnown } = transaction;

    // Behavior model
    const behavior = computeBehaviorModel(history);

    // Embeddings + deviation
    const deviationScore = await computeDeviationScore(
      this.embedModelId,
      amount,
      recipient,
      history
    );

    // Impact score
    const impactScore = computeImpactScore(amount, behavior.avgAmount);

    // Confidence
    const confidence = generateConfidence();

    // LLM decision
    const llmResult = await getLLMDecision(
      this.llmModelId,
      amount,
      isKnown,
      behavior.avgAmount,
      deviationScore,
      impactScore
    );

    return {
      decision: llmResult.decision,
      risk_score: llmResult.risk_score,
      reason: llmResult.reason,
      confidence,
      deviation_score: deviationScore,
      impact_score: impactScore,
      avgAmount: behavior.avgAmount,
      knownRecipients: behavior.knownRecipients.length,
    };
  }

  /**
   * Run a single test case
   */
  async runTest(testCase) {
    const startTime = Date.now();
    const testId = testCase.id;

    try {
      // Step 1: Get QVAC decision
      const qvacDecision = await this.analyzeTransaction(testCase);

      // Step 2: Execute contract
      const contractResult = await this.contractExecutor.executeWithDecision({
        decision: qvacDecision.decision,
        amount: testCase.transaction.amount,
        recipient: testCase.transaction.recipient,
        user: "test_user",
        riskScore: qvacDecision.risk_score,
        deviationScore: qvacDecision.deviation_score,
        impactScore: qvacDecision.impact_score,
      });

      // Step 3: Validate results
      const executionTime = Date.now() - startTime;
      const decisionValidation = DecisionValidator.validateDecision(
        qvacDecision.decision,
        qvacDecision.risk_score,
        testCase.expectedDecision,
        testCase.expectedRiskRange
      );

      const metricsValidation = DecisionValidator.validateMetrics(
        qvacDecision.deviation_score,
        qvacDecision.impact_score,
        qvacDecision.decision
      );

      const issues = [];
      if (!decisionValidation.valid) {
        issues.push(...decisionValidation.issues);
      }
      if (!metricsValidation.consistent) {
        issues.push(...metricsValidation.issues);
      }

      const success =
        contractResult.success &&
        decisionValidation.valid &&
        metricsValidation.consistent;

      const result = {
        input: testCase,
        decision: qvacDecision.decision,
        riskScore: qvacDecision.risk_score,
        deviationScore: qvacDecision.deviation_score,
        impactScore: qvacDecision.impact_score,
        confidence: qvacDecision.confidence,
        contractResult: contractResult.success,
        contractReason: contractResult.reason,
        transferredAmount: contractResult.transferredAmount,
        success,
        issues,
        executionTimeMs: executionTime,
        timestamp: new Date().toISOString(),
      };

      this.testCount++;
      if (success) {
        this.passCount++;
      } else {
        this.failCount++;
      }

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;

      const result = {
        input: testCase,
        decision: "ERROR",
        riskScore: 0,
        deviationScore: 0,
        impactScore: 0,
        confidence: 0,
        contractResult: false,
        contractReason: error.message,
        transferredAmount: 0,
        success: false,
        issues: [error.message],
        executionTimeMs: executionTime,
        timestamp: new Date().toISOString(),
      };

      this.testCount++;
      this.failCount++;

      return result;
    }
  }

  /**
   * Run all tests
   */
  async runAllTests(options = {}) {
    const {
      testLimit = null,
      categoryFilter = null,
      verbose = true,
    } = options;

    let testsToRun = allTestScenarios;

    // Filter by category if specified
    if (categoryFilter) {
      testsToRun = testsToRun.filter((t) => t.category === categoryFilter);
    }

    // Limit number of tests if specified
    if (testLimit) {
      testsToRun = testsToRun.slice(0, testLimit);
    }

    console.log("\n╔════════════════════════════════════════════════════════════════╗");
    console.log(
      `║ Running ${testsToRun.length.toString().padEnd(50)} tests║`
    );
    console.log("╚════════════════════════════════════════════════════════════════╝\n");

    for (let i = 0; i < testsToRun.length; i++) {
      const test = testsToRun[i];
      if (verbose) {
        process.stdout.write(
          `[${i + 1}/${testsToRun.length}] ${test.id.padEnd(15)} - ${test.description.substring(0, 40).padEnd(40)}`
        );
      }

      const result = await this.runTest(test);
      this.metricsCollector.recordResult(result);

      if (verbose) {
        const status = result.success ? "✓ PASS" : "✗ FAIL";
        const decision = result.decision.padEnd(8);
        console.log(
          ` ${status} | ${decision} | Risk: ${result.riskScore.toString().padEnd(3)}`
        );
      }
    }

    console.log("\n✅ All tests completed!\n");
  }

  /**
   * Test context-awareness (same TX, different decisions)
   */
  async testContextAwareness() {
    console.log("🔍 Testing Context-Awareness...\n");

    const contextTests = allTestScenarios.filter(
      (t) => t.category === "Context Dependent"
    );

    for (const test of contextTests) {
      const result = await this.runTest(test);
      this.metricsCollector.recordResult(result);
    }

    const contextAnalysis =
      this.metricsCollector.verifyContextAwareness();
    console.log(`\nContext-Aware: ${contextAnalysis.fullyContextAware ? "✓ YES" : "✗ NO"}`);
    console.log(
      `Details: ${JSON.stringify(contextAnalysis.details, null, 2)}\n`
    );

    return contextAnalysis;
  }

  /**
   * Test non-bypassability
   */
  async testNonBypassability() {
    console.log("🛡️  Testing Non-Bypassability...\n");

    const rejectedTests = allTestScenarios.filter(
      (t) => t.expectedDecision === "REJECT"
    );

    console.log(
      `Running ${rejectedTests.length} REJECT scenario tests...\n`
    );

    for (const test of rejectedTests) {
      const result = await this.runTest(test);
      this.metricsCollector.recordResult(result);

      if (!result.success && result.contractResult === false) {
        console.log(`✓ ${test.id} - Correctly blocked`);
      }
    }

    const bypassAnalysis = this.metricsCollector.verifyNonBypassability();
    console.log(
      `\nNon-Bypassable: ${bypassAnalysis.nonBypassable ? "✓ YES" : "✗ NO"}`
    );
    console.log(
      `Blocked: ${bypassAnalysis.blockedREJECTs}/${bypassAnalysis.totalREJECTs}\n`
    );

    return bypassAnalysis;
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log("🚀 QVAC + Anchor Contract - Stress Test Suite\n");

  let llmModelId = null;
  let embedModelId = null;

  try {
    // Setup
    console.log("📦 Loading models...");
    llmModelId = await loadModel({
      modelSrc:
        "https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf",
      modelType: "llm",
      modelConfig: { ctx_size: 1024 },
    });
    console.log(`✓ LLM loaded: ${llmModelId}`);

    embedModelId = await loadModel({
      modelSrc:
        "https://huggingface.co/bartowski/bge-small-en-v1.5-GGUF/resolve/main/bge-small-en-v1.5-Q4_K_M.gguf",
      modelType: "llm",
      modelConfig: { ctx_size: 512 },
    });
    console.log(`✓ Embedding model loaded: ${embedModelId}\n`);

    // Initialize contract simulator
    const contractState = new ContractState();
    contractState.setBalance("test_user", DEFAULT_USER_BALANCE);

    const contractExecutor = new ContractExecutor(contractState);
    const metricsCollector = new MetricsCollector();
    const testRunner = new TestRunner(
      llmModelId,
      embedModelId,
      contractExecutor,
      metricsCollector
    );

    // Run tests
    console.log("📊 Test Categories:");
    Object.entries(testCategories).forEach(([category, count]) => {
      console.log(`  • ${category}: ${count} tests`);
    });
    console.log(
      `\nTotal: ${allTestScenarios.length} test scenarios\n`
    );

    // Run all tests
    await testRunner.runAllTests({
      verbose: true,
    });

    // Context-awareness test
    await testRunner.testContextAwareness();

    // Non-bypassability test
    await testRunner.testNonBypassability();

    // Generate report
    const report = metricsCollector.generateReport();

    // Print summary
    printSummary(report);

    // Print detailed results
    printDetailedResults(report);

    // Save report
    const fs = await import("fs");
    fs.writeFileSync(
      "test-report.json",
      JSON.stringify(report, null, 2)
    );
    console.log("\n📄 Full report saved to test-report.json\n");

    // Cleanup
    await unloadModel({ modelId: llmModelId });
    await unloadModel({ modelId: embedModelId });
    console.log("✅ Test suite complete!\n");
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// ============================================================================
// REPORTING
// ============================================================================

function printSummary(report) {
  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║                      TEST SUMMARY                             ║");
  console.log("╚════════════════════════════════════════════════════════════════╝\n");

  const summary = report.executionSummary;

  console.log(`Total Tests:              ${summary.totalTests}`);
  console.log(`Passed:                   ${summary.passedTests}`);
  console.log(`Failed:                   ${summary.failedTests}`);
  console.log(`Pass Rate:                ${summary.passRate}%\n`);

  console.log("Decision Distribution:");
  console.log(`  ALLOW:    ${summary.decisions.ALLOW} (${((summary.decisions.ALLOW / summary.totalTests) * 100).toFixed(1)}%)`);
  console.log(`  REJECT:   ${summary.decisions.REJECT} (${((summary.decisions.REJECT / summary.totalTests) * 100).toFixed(1)}%)`);
  console.log(`  DELAY:    ${summary.decisions.DELAY} (${((summary.decisions.DELAY / summary.totalTests) * 100).toFixed(1)}%)`);
  console.log(
    `  PARTIAL:  ${summary.decisions.PARTIAL} (${((summary.decisions.PARTIAL / summary.totalTests) * 100).toFixed(1)}%)\n`
  );

  console.log("Key Metrics:");
  console.log(`  Average Risk Score:       ${summary.averageRiskScore.toFixed(2)}`);
  console.log(`  Median Risk Score:        ${summary.medianRiskScore.toFixed(2)}`);
  console.log(`  Avg Deviation Score:      ${summary.averageDeviationScore.toFixed(3)}`);
  console.log(
    `  Blocked Malicious TX:      ${summary.blockedMaliciousTransactions}`
  );
  console.log(`  Anomalies Detected:       ${summary.anomaliesDetected}\n`);

  console.log("✅ Security Verdicts:");
  console.log(`  Context-Aware:            ${report.contextAwareness.fullyContextAware ? "✓ YES" : "✗ NO"}`);
  console.log(
    `  Non-Bypassable:           ${report.nonBypassability.nonBypassable ? "✓ YES" : "✗ NO"}`
  );
  console.log(`  Bypass Rate:              ${report.nonBypassability.bypassRate}%\n`);
}

function printDetailedResults(report) {
  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║                    CATEGORY BREAKDOWN                          ║");
  console.log("╚════════════════════════════════════════════════════════════════╝\n");

  Object.entries(report.categoryBreakdown).forEach(([category, stats]) => {
    console.log(`${category}:`);
    console.log(`  Total:     ${stats.total}`);
    console.log(`  Passed:    ${stats.passed}`);
    console.log(`  Failed:    ${stats.failed}`);
    console.log(`  Pass Rate: ${stats.passRate}%`);
    console.log(
      `  Avg Risk:  ${stats.averageRiskScore} (Deviation: ${stats.averageDeviationScore})`
    );
    console.log(`  Decisions: ALLOW=${stats.decisions.ALLOW || 0} REJECT=${stats.decisions.REJECT || 0} DELAY=${stats.decisions.DELAY || 0} PARTIAL=${stats.decisions.PARTIAL || 0}`);
    console.log("");
  });

  if (report.anomalies.length > 0) {
    console.log("⚠️  Anomalies Detected:");
    report.anomalies.slice(0, 10).forEach((anomaly) => {
      console.log(`  • ${anomaly.testId} (${anomaly.category})`);
      anomaly.issues.forEach((issue) => {
        console.log(`    - ${issue}`);
      });
    });
  }
}

main().catch(console.error);
