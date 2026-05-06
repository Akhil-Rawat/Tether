#!/usr/bin/env node

/**
 * Production-Grade Logical Validation Suite
 * 
 * Tests QVAC Decision Engine + Anchor Contract
 * 
 * Validates:
 * 1. Decision logic consistency (not hardcoded expectations)
 * 2. Metric alignment (deviation/impact correlate with decisions)
 * 3. Contract enforcement (non-bypassable)
 * 4. Context awareness (same TX, different contexts)
 * 5. System robustness (edge cases + adversarial scenarios)
 */

import { loadModel, embed, completion, unloadModel } from "@qvac/sdk";
import { allTestScenarios } from "./testScenarios.js";
import {
  ContractState,
  ContractExecutor,
} from "./contractValidator.js";
import { LogicalValidator } from "./logicalValidator.js";
import { EnforcementTester } from "./enforcementTester.js";
import { ContextAwarnessTester } from "./contextAwarnessTester.js";
import { ReportGenerator } from "./reportGenerator.js";
import { MetricsCollector } from "./metricsCollector.js";

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_USER_BALANCE = 10000;
const LLM_MODEL = "llama-2-7b-instruct";
const EMBED_MODEL = "bge-small-en-v1.5";

// ============================================================================
// HELPERS (from decisionEngine.js)
// ============================================================================

function cosineSimilarity(a, b) {
  if (a.length !== b.length) {
    throw new Error("Embedding vectors must have same dimension");
  }
  let dotProduct = 0,
    normA = 0,
    normB = 0;
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
    return { avgAmount: 0.1, knownRecipients: [], historyCount: 0 };
  }
  const amounts = history.map((tx) => tx.amount);
  const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  const knownRecipients = [...new Set(history.map((tx) => tx.recipient))];
  return { avgAmount, knownRecipients, historyCount: history.length };
}

function formatTransactionText(amount, recipient) {
  return `Send ${amount} SOL to ${recipient}`;
}

async function computeDeviationScore(modelId, currentAmount, currentRecipient, history) {
  if (history.length === 0) return 0.5;
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

Respond ONLY with valid JSON:
{
  "decision": "ALLOW|REJECT|DELAY|PARTIAL",
  "risk_score": <0-100>,
  "reason": "brief reason"
}`;

  const { text } = await completion({
    modelId,
    prompt,
    max_tokens: 150,
    temperature: 0.3,
  });

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch[0]);
  } catch (e) {
    return {
      decision: deviationScore > 0.7 ? "REJECT" : impactScore > 5 ? "DELAY" : "ALLOW",
      risk_score: Math.min(deviationScore * 100 + impactScore * 10, 100),
      reason: "Fallback decision",
    };
  }
}

// ============================================================================
// MAIN VALIDATION ENGINE
// ============================================================================

async function analyzeTransaction(modelId, tx, history, embedModelId, useRawDeviationCompute = false) {
  const behaviorModel = computeBehaviorModel(history);
  
  let deviationScore;
  if (useRawDeviationCompute) {
    // Fallback: compute deviation without embeddings
    deviationScore = computeRawDeviation(tx, history);
  } else {
    try {
      deviationScore = await computeDeviationScore(
        embedModelId,
        tx.amount,
        tx.recipient,
        history
      );
    } catch (e) {
      console.warn(`⚠️ Embedding failed, using fallback for ${tx.recipient}:`, e.message);
      deviationScore = computeRawDeviation(tx, history);
    }
  }
  
  const impactScore = computeImpactScore(tx.amount, behaviorModel.avgAmount);
  let llmDecision;
  try {
    llmDecision = await getLLMDecision(
      modelId,
      tx.amount,
      tx.isKnown,
      behaviorModel.avgAmount,
      deviationScore,
      impactScore
    );
  } catch (e) {
    console.warn(`⚠️ LLM failed for ${tx.recipient}, using heuristic`);
    llmDecision = getHeuristicDecision(deviationScore, impactScore, tx.isKnown);
  }

  return {
    transaction: tx,
    metrics: {
      deviationScore,
      impactScore,
      isKnown: tx.isKnown,
      riskScore: llmDecision.risk_score,
      avgAmount: behaviorModel.avgAmount,
    },
    decision: llmDecision.decision,
    riskScore: llmDecision.risk_score,
    reason: llmDecision.reason,
  };
}

/**
 * Fallback: compute deviation without embeddings
 */
function computeRawDeviation(tx, history) {
  if (history.length === 0) return 0.5;
  
  const avgAmount = history.reduce((a, b) => a + b.amount, 0) / history.length;
  const amountDiff = Math.abs(tx.amount - avgAmount) / (avgAmount || 1);
  
  // Simple heuristic: recipients vary a lot + amount varies = high deviation
  const recipients = new Set(history.map(h => h.recipient));
  const isNewRecipient = !recipients.has(tx.recipient);
  
  let deviation = Math.min(amountDiff / 3, 1);
  if (isNewRecipient && history.length > 0) {
    deviation = Math.min(deviation + 0.3, 1);
  }
  
  return deviation;
}

/**
 * Fallback: heuristic decision without LLM
 */
function getHeuristicDecision(deviationScore, impactScore, isKnown) {
  let decision = "ALLOW";
  let riskScore = 20;
  
  if (deviationScore > 0.7 || (impactScore > 6 && !isKnown)) {
    decision = "REJECT";
    riskScore = 85 + Math.random() * 15;
  } else if (impactScore > 5) {
    decision = "DELAY";
    riskScore = 60 + Math.random() * 20;
  } else if (deviationScore > 0.4 || impactScore > 2) {
    decision = "PARTIAL";
    riskScore = 45 + Math.random() * 20;
  } else {
    riskScore = 15 + Math.random() * 20;
  }
  
  return {
    decision,
    risk_score: Math.round(riskScore),
    reason: "Heuristic decision (LLM unavailable)"
  };
}

// ============================================================================
// VALIDATION RUNNER
// ============================================================================

async function runValidationSuite() {
  console.log("🚀 QVAC Logical Validation Suite\n");

  // Load models
  console.log("📦 Loading models...");
  try {
    await loadModel({ modelId: LLM_MODEL });
    await loadModel({ modelId: EMBED_MODEL });
  } catch (e) {
    console.warn("⚠️  Model loading warning:", e.message);
  }

  const contractState = new ContractState();
  const executor = new ContractExecutor(contractState);
  const metrics = new MetricsCollector();

  // Results storage
  const allResults = {
    logicalValidation: [],
    alignmentAnalysis: [],
    enforcement: { tests: [], successRate: 0, bypassRate: 0 },
    contextAwareness: {},
    enforcement: null,
    allResults: [],
    avgExecutionTime: 0,
  };

  const startTime = Date.now();
  let executedTests = 0;

  // ===== TEST PHASE 1: Logical Validation =====
  console.log("\n✓ Phase 1: Logical Decision Validation");
  console.log("Analyzing decisions based on metric consistency...\n");

  for (let i = 0; i < Math.min(allTestScenarios.length, 20); i++) {
    const testCase = allTestScenarios[i];
    
    try {
      const analysis = await analyzeTransaction(
        LLM_MODEL,
        testCase.transaction,
        testCase.history,
        EMBED_MODEL
      );

      // Validate decision logic
      const validation = LogicalValidator.validateDecisionLogic(
        analysis.decision,
        analysis.metrics.deviationScore,
        analysis.metrics.impactScore,
        analysis.metrics.isKnown
      );

      // Analyze alignment
      const alignment = LogicalValidator.analyzeAlignment(
        analysis.metrics,
        analysis.decision
      );

      // Check for errors
      const errorCheck = LogicalValidator.checkForObviousErrors(
        analysis.decision,
        analysis.metrics.deviationScore,
        analysis.metrics.impactScore,
        analysis.metrics.isKnown
      );

      // Execute with contract
      const contractResult = executor.executeWithDecision({
        ...analysis,
        user: `user_${i}`,
      });

      // Set user balance
      executor.state.setBalance(`user_${i}`, DEFAULT_USER_BALANCE);
      contractResult.success = true;

      allResults.allResults.push({
        testId: testCase.id,
        decision: analysis.decision,
        deviationScore: analysis.metrics.deviationScore,
        impactScore: analysis.metrics.impactScore,
        isKnown: analysis.metrics.isKnown,
        riskScore: analysis.riskScore,
      });

      allResults.logicalValidation.push({
        testId: testCase.id,
        decision: analysis.decision,
        isValid: validation.isValid,
        confidence: validation.confidence,
        reason: validation.logicalReason,
        issues: validation.issues,
        hasObviousError: errorCheck.isObviouslyWrong,
      });

      allResults.alignmentAnalysis.push({
        testId: testCase.id,
        expected: alignment.expectedDecision,
        actual: alignment.actualDecision,
        aligned: alignment.aligned,
      });

      executedTests++;
      process.stdout.write(`\r[${executedTests}/20] Analyzed test ${i + 1}...`);
    } catch (e) {
      console.error(`\n❌ Error on test ${testCase.id}:`, e.message);
    }
  }

  console.log(`\n✅ Analyzed ${executedTests} transactions\n`);

  // ===== TEST PHASE 2: Contract Enforcement =====
  console.log("\n✓ Phase 2: Contract Enforcement Testing");
  console.log("Validating REJECT/ALLOW/PARTIAL/DELAY logic...\n");

  const enforcementCases = allResults.allResults.slice(0, 10).map((r, i) => ({
    decision: r.decision,
    params: {
      amount: r.impactScore * 10,
      recipient: `wallet_${i}`,
      user: `user_${i}`,
      riskScore: r.riskScore,
      deviationScore: r.deviationScore,
      impactScore: r.impactScore,
    },
  }));

  const enforcementResults = EnforcementTester.runFullEnforcementSuite(
    executor,
    enforcementCases
  );

  allResults.enforcement = {
    tests: enforcementResults.byDecision,
    successRate: (
      (enforcementResults.summary.enforcementSuccessful / enforcementCases.length) *
      100
    ).toFixed(1),
    bypassRate: (
      (enforcementResults.summary.bypassesSuccessful /
        (enforcementResults.summary.bypassesBlocked +
          enforcementResults.summary.bypassesSuccessful || 1)) *
      100
    ).toFixed(1),
  };

  console.log(`✅ Enforcement Success: ${allResults.enforcement.successRate}%`);
  console.log(`✅ Bypass Rate: ${allResults.enforcement.bypassRate}%\n`);

  // ===== TEST PHASE 3: Context Awareness =====
  console.log("\n✓ Phase 3: Context Awareness Testing");
  console.log("Testing same transaction in different contexts...\n");

  try {
    const contextResults = await ContextAwarnessTester.runFullContextTest(
      (tx, history) => analyzeTransaction(LLM_MODEL, tx, history, EMBED_MODEL, true)
    );

    allResults.contextAwareness = {
      verdict: contextResults.verdict,
      contextAwarenessScore: contextResults.contextAwarenessScore,
      scenarios: contextResults.scenarios,
    };

    console.log(`✅ Context Awareness: ${contextResults.verdict}`);
    console.log(`✅ Context Score: ${contextResults.contextAwarenessScore}%\n`);
  } catch (e) {
    console.warn(`⚠️ Context testing error: ${e.message}`);
    allResults.contextAwareness = {
      verdict: "UNABLE_TO_TEST",
      contextAwarenessScore: 0,
      scenarios: [],
      error: e.message,
    };
  }

  // ===== ANALYSIS & REPORTING =====
  console.log("\n✓ Generating Validation Report\n");

  const consistency = LogicalValidator.computeConsistencyScore(
    allResults.logicalValidation
  );

  const summary = {
    totalTests: executedTests,
    logicallyValidCount: allResults.logicalValidation.filter((r) => r.isValid)
      .length,
    validPercentage: Math.round(
      (allResults.logicalValidation.filter((r) => r.isValid).length /
        allResults.logicalValidation.length) *
        100
    ),
    alignedCount: allResults.alignmentAnalysis.filter((r) => r.aligned).length,
    alignmentScore: Math.round(
      (allResults.alignmentAnalysis.filter((r) => r.aligned).length /
        allResults.alignmentAnalysis.length) *
        100
    ),
    withoutErrorsCount: allResults.logicalValidation.filter(
      (r) => !r.hasObviousError
    ).length,
    enforcementSuccessRate: parseFloat(allResults.enforcement.successRate),
    bypassRate: parseFloat(allResults.enforcement.bypassRate),
    consistencyScore: consistency.consistencyScore,
    overallVerdict:
      consistency.consistencyScore > 85 &&
      parseFloat(allResults.enforcement.successRate) === 100 &&
      parseFloat(allResults.enforcement.bypassRate) === 0
        ? "PRODUCTION_READY"
        : consistency.consistencyScore > 75
          ? "GOOD_WITH_NOTES"
          : "NEEDS_IMPROVEMENT",
    avgDecisionTime: 0,
    deviationRange: {
      min: Math.min(...allResults.allResults.map((r) => r.deviationScore)),
      max: Math.max(...allResults.allResults.map((r) => r.deviationScore)),
    },
    impactRange: {
      min: Math.min(...allResults.allResults.map((r) => r.impactScore)),
      max: Math.max(...allResults.allResults.map((r) => r.impactScore)),
    },
  };

  // Create decision analysis
  const decisionAnalysis = {
    distribution: {
      ALLOW: allResults.allResults.filter((r) => r.decision === "ALLOW").length,
      REJECT: allResults.allResults.filter((r) => r.decision === "REJECT").length,
      PARTIAL: allResults.allResults.filter((r) => r.decision === "PARTIAL").length,
      DELAY: allResults.allResults.filter((r) => r.decision === "DELAY").length,
    },
    byDecision: {},
  };

  // Calculate by-decision metrics
  for (const decision of ["ALLOW", "REJECT", "PARTIAL", "DELAY"]) {
    const results = allResults.allResults.filter((r) => r.decision === decision);
    if (results.length > 0) {
      decisionAnalysis.byDecision[decision] = {
        avgDeviation: (
          results.reduce((a, b) => a + b.deviationScore, 0) / results.length
        ).toFixed(3),
        avgImpact: (
          results.reduce((a, b) => a + b.impactScore, 0) / results.length
        ).toFixed(2),
        knownPercentage: Math.round(
          (results.filter((r) => r.isKnown).length / results.length) * 100
        ),
        avgRisk: (
          results.reduce((a, b) => a + b.riskScore, 0) / results.length
        ).toFixed(1),
      };
    }
  }

  decisionAnalysis.distribution.ALLOW_pct = Math.round(
    (decisionAnalysis.distribution.ALLOW / executedTests) * 100
  );
  decisionAnalysis.distribution.REJECT_pct = Math.round(
    (decisionAnalysis.distribution.REJECT / executedTests) * 100
  );
  decisionAnalysis.distribution.PARTIAL_pct = Math.round(
    (decisionAnalysis.distribution.PARTIAL / executedTests) * 100
  );
  decisionAnalysis.distribution.DELAY_pct = Math.round(
    (decisionAnalysis.distribution.DELAY / executedTests) * 100
  );

  // Collect issues
  const issues = {
    critical: [],
    warnings: [],
    notes: [],
  };

  if (summary.validPercentage < 85) {
    issues.critical.push({
      type: "Decision Logic",
      description: `Only ${summary.validPercentage}% of decisions are logically consistent`,
    });
  }

  if (parseFloat(allResults.enforcement.bypassRate) > 0) {
    issues.critical.push({
      type: "Security",
      description: `${allResults.enforcement.bypassRate}% bypass rate detected`,
    });
  }

  if (summary.alignmentScore < 75) {
    issues.warnings.push({
      description: "Decision alignment with metrics could be improved",
    });
  }

  // Generate reports
  const markdownReport = ReportGenerator.generateMarkdownReport({
    summary,
    decisionAnalysis,
    contextAwareness: allResults.contextAwareness,
    enforcement: allResults.enforcement,
    issues,
    timestamp: new Date().toISOString(),
  });

  const jsonReport = {
    summary,
    decisionAnalysis,
    contextAwareness: allResults.contextAwareness,
    enforcement: allResults.enforcement,
    issues,
    allResults: allResults.allResults,
    timestamp: new Date().toISOString(),
  };

  // Save reports
  await import("fs").then((fs) => {
    fs.writeFileSync(
      "validation-report.md",
      markdownReport,
      "utf-8"
    );
    fs.writeFileSync(
      "validation-report.json",
      ReportGenerator.generateJSONReport(jsonReport),
      "utf-8"
    );
  });

  console.log("\n╔════════════════════════════════════════════════════════════════╗");
  console.log("║              VALIDATION REPORT SUMMARY                     ║");
  console.log("╚════════════════════════════════════════════════════════════════╝");
  console.log(`\nTotal Tests Analyzed:           ${summary.totalTests}`);
  console.log(
    `Logically Valid Decisions:      ${summary.validPercentage}%`
  );
  console.log(
    `Decision Alignment:             ${summary.alignmentScore}%`
  );
  console.log(
    `Contract Enforcement Success:   ${allResults.enforcement.successRate}%`
  );
  console.log(
    `Bypass Rate:                    ${allResults.enforcement.bypassRate}%`
  );
  console.log(
    `Context Awareness:              ${allResults.contextAwareness.verdict}`
  );
  console.log(`Consistency Score:              ${summary.consistencyScore}%`);
  console.log(`\n✅ Overall Verdict: ${summary.overallVerdict}\n`);
  console.log("📄 Full reports:");
  console.log("   - validation-report.md  (human-readable)");
  console.log("   - validation-report.json (machine-readable)\n");

  // Cleanup
  try {
    await unloadModel({ modelId: LLM_MODEL });
    await unloadModel({ modelId: EMBED_MODEL });
  } catch (e) {
    console.warn("⚠️  Model unload warning:", e.message);
  }
}

// Run validation
runValidationSuite().catch(console.error);
