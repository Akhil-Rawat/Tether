#!/usr/bin/env node

/**
 * EXAMPLE: Using the Decision Engine as a Module
 * 
 * This shows how to import and use the core functions
 * to build your own decision pipeline.
 */

import { loadModel, embed, completion, unloadModel } from "@qvac/sdk";

// Import just the helper functions (you'd need to export these from decisionEngine.js)
// For now, we'll duplicate them here for the example

function cosineSimilarity(a, b) {
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

  return normA === 0 || normB === 0 ? 0 : dotProduct / (normA * normB);
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

// ============================================================================
// EXAMPLE 1: Simple Batch Analysis
// ============================================================================

async function batchAnalyzeTransactions() {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📊 EXAMPLE 1: Batch Transaction Analysis");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const llmModelId = await loadModel({
    modelSrc:
      "https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf",
    modelType: "llm",
    modelConfig: { ctx_size: 1024 },
  });

  const embedModelId = await loadModel({
    modelSrc:
      "https://huggingface.co/bartowski/bge-small-en-v1.5-GGUF/resolve/main/bge-small-en-v1.5-Q4_K_M.gguf",
    modelType: "llm",
    modelConfig: { ctx_size: 512 },
  });

  const transactions = [
    {
      id: "tx_001",
      amount: 10,
      recipient: "trusted_1",
      isKnown: true,
    },
    {
      id: "tx_002",
      amount: 200,
      recipient: "unknown_addr",
      isKnown: false,
    },
    {
      id: "tx_003",
      amount: 5.5,
      recipient: "trusted_1",
      isKnown: true,
    },
  ];

  const history = [
    { amount: 5, recipient: "trusted_1" },
    { amount: 3, recipient: "trusted_1" },
    { amount: 8, recipient: "trusted_2" },
  ];

  console.log(`Analyzing ${transactions.length} transactions...\n`);

  for (const tx of transactions) {
    const behavior = computeBehaviorModel(history);
    const deviation = await computeDeviationScore(
      embedModelId,
      tx.amount,
      tx.recipient,
      history
    );
    const impact = computeImpactScore(tx.amount, behavior.avgAmount);
    const confidence = generateConfidence();

    console.log(`[${tx.id}] ${tx.amount} SOL → ${tx.recipient}`);
    console.log(`  Deviation: ${deviation.toFixed(3)}`);
    console.log(`  Impact: ${impact.toFixed(2)}x`);
    console.log(`  Confidence: ${(confidence * 100).toFixed(0)}%`);
    console.log("");
  }

  await unloadModel({ modelId: llmModelId });
  await unloadModel({ modelId: embedModelId });
}

// ============================================================================
// EXAMPLE 2: Real-time Stream Processing
// ============================================================================

async function streamProcessTransactions() {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🔄 EXAMPLE 2: Stream Processing");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  console.log("Simulating real-time transaction stream...\n");

  // Simulate incoming transactions
  const stream = [
    { amount: 5, recipient: "addr_1", timestamp: Date.now() },
    { amount: 150, recipient: "addr_2", timestamp: Date.now() + 1000 },
    { amount: 3, recipient: "addr_1", timestamp: Date.now() + 2000 },
  ];

  let processedCount = 0;

  for (const tx of stream) {
    processedCount++;
    const behavior = computeBehaviorModel([]);
    const impact = computeImpactScore(tx.amount, 5);

    console.log(`[Stream] TX #${processedCount}`);
    console.log(`  Amount: ${tx.amount} SOL`);
    console.log(`  Recipient: ${tx.recipient}`);
    console.log(`  Impact: ${impact.toFixed(2)}x`);

    // In real scenario, you'd queue this for LLM analysis
    if (impact > 5) {
      console.log(`  ⚠️  High impact - flagged for review`);
    } else {
      console.log(`  ✓ Normal transaction`);
    }
    console.log("");

    // Simulate some processing delay
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log(`✅ Processed ${processedCount} transactions`);
}

// ============================================================================
// EXAMPLE 3: Custom Risk Calculation
// ============================================================================

async function customRiskCalculation() {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("⚙️  EXAMPLE 3: Custom Risk Calculation");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Custom risk scoring function
  function calculateCustomRisk(deviation, impact, isKnown) {
    let riskScore = 0;

    // Deviation contributes 40%
    riskScore += deviation * 40;

    // Impact contributes 35%
    riskScore += Math.min(impact, 10) * 3.5;

    // Unknown recipient bonus
    if (!isKnown) {
      riskScore += 25;
    }

    return Math.min(riskScore, 100);
  }

  const scenarios = [
    { deviation: 0.2, impact: 1.5, isKnown: true, label: "Low Risk" },
    { deviation: 0.8, impact: 3, isKnown: false, label: "High Risk" },
    { deviation: 0.5, impact: 2, isKnown: true, label: "Medium Risk" },
  ];

  console.log("Calculating custom risk scores:\n");

  for (const scenario of scenarios) {
    const risk = calculateCustomRisk(
      scenario.deviation,
      scenario.impact,
      scenario.isKnown
    );

    console.log(`${scenario.label}:`);
    console.log(`  Deviation: ${scenario.deviation.toFixed(2)}`);
    console.log(`  Impact: ${scenario.impact.toFixed(2)}x`);
    console.log(`  Known: ${scenario.isKnown}`);
    console.log(`  → Risk Score: ${risk.toFixed(1)}/100`);
    console.log("");
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log("🚀 QVAC Decision Engine - Examples\n");

  try {
    // Run examples
    await batchAnalyzeTransactions();
    await streamProcessTransactions();
    await customRiskCalculation();

    console.log(
      "\n✨ All examples complete!\n"
    );
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

main().catch(console.error);
