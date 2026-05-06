#!/usr/bin/env node

/**
 * QVAC LOCAL Transaction Decision Engine
 * 
 * Uses:
 * - @qvac/sdk (LLM Completion + Embeddings)
 * - Cosine Similarity (embedding deviation scoring)
 * - Local LLM Reasoning (NO external APIs)
 */

import { loadModel, embed, completion, unloadModel } from "@qvac/sdk";

// ============================================================================
// HELPER: Cosine Similarity
// ============================================================================
//Testing if models loaded //

/**
 * Compute cosine similarity between two embedding vectors
 * @param {number[]} a - First embedding vector
 * @param {number[]} b - Second embedding vector
 * @returns {number} Cosine similarity score [0, 1]
 */
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

// ============================================================================
// STEP 1: Behavior Model
// ============================================================================

/**
 * Compute behavioral metrics from transaction history
 * @param {Array<{amount: number, recipient: string}>} history - Past transactions
 * @returns {Object} Behavior metrics
 */
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

// ============================================================================
// STEP 2: Embeddings + Deviation Scoring
// ============================================================================

/**
 * Generate transaction embedding text
 * @param {number} amount - Transaction amount
 * @param {string} recipient - Recipient address
 * @returns {string} Formatted transaction text
 */
function formatTransactionText(amount, recipient) {
  return `Send ${amount} SOL to ${recipient}`;
}

/**
 * Compute deviation score using embeddings
 * @param {string} modelId - Embedding model ID
 * @param {number} currentAmount - Current transaction amount
 * @param {string} currentRecipient - Current recipient
 * @param {Array<{amount: number, recipient: string}>} history - Transaction history
 * @returns {Promise<number>} Deviation score [0, 1]
 */
async function computeDeviationScore(
  modelId,
  currentAmount,
  currentRecipient,
  history
) {
  if (history.length === 0) {
    return 0.5; // Moderate deviation for first transaction
  }

  try {
    // Format current transaction
    const currentText = formatTransactionText(currentAmount, currentRecipient);

    // Generate embedding for current transaction
    const { embedding: currentEmbedding } = await embed({
      modelId,
      text: currentText,
    });

    // Generate embeddings for historical transactions
    const historyTexts = history.map((tx) =>
      formatTransactionText(tx.amount, tx.recipient)
    );

    const { embedding: historyEmbeddings } = await embed({
      modelId,
      text: historyTexts,
    });

    // Compute similarity with each historical transaction
    const similarities = historyEmbeddings.map((histEmbed) =>
      cosineSimilarity(currentEmbedding, histEmbed)
    );

    // Deviation = 1 - max_similarity
    const maxSimilarity = Math.max(...similarities);
    return 1 - maxSimilarity;
  } catch (error) {
    console.warn(`⚠️ Embedding computation failed: ${error.message}`);
    // Fallback: use heuristic deviation based on amount difference
    const avgAmount = history.reduce((a, b) => a + b.amount, 0) / history.length || 0.1;
    const amountDiff = Math.abs(currentAmount - avgAmount) / (avgAmount || 1);
    const recipients = new Set(history.map(h => h.recipient));
    const isNewRecipient = !recipients.has(currentRecipient);
    
    let deviation = Math.min(amountDiff / 3, 1);
    if (isNewRecipient && history.length > 0) {
      deviation = Math.min(deviation + 0.3, 1);
    }
    return deviation;
  }
}

// ============================================================================
// STEP 3: Impact Score & Confidence
// ============================================================================

/**
 * Compute impact score (relative to average transaction)
 * @param {number} amount - Transaction amount
 * @param {number} avgAmount - Average historical amount
 * @returns {number} Impact score (normalized)
 */
function computeImpactScore(amount, avgAmount) {
  const divisor = avgAmount || 0.1;
  return Math.min(amount / divisor, 10); // Cap at 10 for extreme outliers
}

/**
 * Generate confidence score
 * @returns {number} Random confidence between 0.75 and 0.95
 */
function generateConfidence() {
  return 0.75 + Math.random() * 0.2;
}

// ============================================================================
// STEP 4: LLM Reasoning
// ============================================================================

/**
 * Get LLM decision using QVAC completion
 * @param {string} modelId - LLM model ID
 * @param {number} amount - Transaction amount
 * @param {boolean} isKnown - Is recipient known
 * @param {number} avgAmount - Average historical amount
 * @param {number} deviationScore - Embedding-based deviation
 * @param {number} impactScore - Impact relative to history
 * @returns {Promise<Object>} Decision object {decision, risk_score, reason}
 */
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
- Deviation score: ${deviationScore.toFixed(2)} (0=similar, 1=anomalous)
- Impact score: ${impactScore.toFixed(2)} (1=normal, 5+=extreme)

Decision Rules:
- High deviation (>0.7) + unknown recipient → REJECT
- High impact (>5) → DELAY
- Medium risk (0.5-0.7) → PARTIAL
- Low risk (<0.5) → ALLOW

Respond ONLY with valid JSON (no markdown, no code blocks):
{
  "decision": "ALLOW|REJECT|DELAY|PARTIAL",
  "risk_score": <0-100>,
  "reason": "<brief explanation>"
}`;

  try {
    const run = completion({
      modelId,
      history: [{ role: "user", content: prompt }],
      stream: false,
    });

    const result = await run.final;
    const responseText = result.text.trim();

    // Clean response (remove markdown code blocks if present)
    let jsonStr = responseText;
    if (jsonStr.includes("```json")) {
      jsonStr = jsonStr.split("```json")[1].split("```")[0];
    } else if (jsonStr.includes("```")) {
      jsonStr = jsonStr.split("```")[1].split("```")[0];
    }
    jsonStr = jsonStr.trim();

    // Try to parse JSON with error handling
    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (parseError) {
      console.warn(`⚠️ LLM returned invalid JSON: ${parseError.message}`);
      console.warn(`   Raw response: ${responseText.substring(0, 100)}`);
      // Fallback to heuristic decision
      parsed = {
        decision: deviationScore > 0.7 ? "REJECT" : impactScore > 5 ? "DELAY" : "ALLOW",
        risk_score: Math.min(100, deviationScore * 60 + impactScore * 10),
        reason: "Fallback: invalid LLM output format"
      };
    }

    // Validate decision field
    if (!["ALLOW", "REJECT", "DELAY", "PARTIAL"].includes(parsed.decision)) {
      console.warn(`⚠️ LLM returned invalid decision: ${parsed.decision}`);
      parsed.decision = "ALLOW"; // Default fallback
    }

    // Ensure risk_score is valid
    if (typeof parsed.risk_score !== "number" || parsed.risk_score < 0 || parsed.risk_score > 100) {
      parsed.risk_score = Math.min(100, deviationScore * 60 + impactScore * 10);
    }

    return {
      decision: parsed.decision,
      risk_score: parsed.risk_score,
      reason: parsed.reason || "LLM analysis complete",
    };
  } catch (error) {
    console.warn(`⚠️ LLM completion failed: ${error.message}`);
    // Fallback: use deterministic heuristic
    const decision = deviationScore > 0.7 ? "REJECT" : impactScore > 5 ? "DELAY" : "ALLOW";
    const risk_score = Math.min(100, deviationScore * 60 + impactScore * 10);
    return {
      decision,
      risk_score,
      reason: "Fallback: LLM unavailable, using deterministic logic"
    };
  }
}

// ============================================================================
// MAIN: Transaction Analysis
// ============================================================================

/**
 * Analyze a transaction and return ALLOW/REJECT/DELAY/PARTIAL decision
 * @param {Object} input - Transaction input
 * @param {string} llmModelId - LLM model ID
 * @param {string} embedModelId - Embedding model ID
 * @returns {Promise<Object>} Complete decision analysis
 */
async function analyzeTransaction(input, llmModelId, embedModelId) {
  const { amount, recipient, isKnown, history } = input;

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🔍 TRANSACTION ANALYSIS");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Amount: ${amount} SOL`);
  console.log(`Recipient: ${recipient}`);
  console.log(`Known Recipient: ${isKnown}`);
  console.log(`History: ${history.length} transactions`);

  // STEP 1: Behavior Model
  console.log("\n[1] Computing behavior model...");
  const behavior = computeBehaviorModel(history);
  console.log(`  ✓ Average amount: ${behavior.avgAmount.toFixed(2)} SOL`);
  console.log(`  ✓ Known recipients: ${behavior.knownRecipients.length}`);

  // STEP 2: Embeddings & Deviation (with error handling)
  console.log("\n[2] Generating embeddings & deviation score...");
  let deviationScore;
  try {
    deviationScore = await computeDeviationScore(
      embedModelId,
      amount,
      recipient,
      history
    );
  } catch (error) {
    console.warn(`  ⚠️ Embedding failed, using heuristic deviation: ${error.message}`);
    // Fallback already handled in computeDeviationScore
    deviationScore = await computeDeviationScore(
      embedModelId,
      amount,
      recipient,
      history
    );
  }
  console.log(`  ✓ Deviation score: ${deviationScore.toFixed(3)}`);

  // STEP 3: Impact & Confidence
  console.log("\n[3] Computing impact & confidence metrics...");
  const impactScore = computeImpactScore(amount, behavior.avgAmount);
  const confidence =
    0.7 +
    (1 - deviationScore) * 0.2 +
    Math.min(impactScore / 10, 0.1);
  console.log(`  ✓ Impact score: ${impactScore.toFixed(2)}`);
  console.log(`  ✓ Confidence: ${(confidence * 100).toFixed(1)}%`);

  // STEP 4: Deterministic Decision Logic
  let decision;

  // 🔴 1. Extreme anomaly override (regardless of known/unknown)
  if (deviationScore > 0.9) {
    decision = "REJECT";
  }
  // 🔴 2. High anomaly + unknown recipient → REJECT
  else if (deviationScore > 0.8 && !isKnown) {
    decision = "REJECT";
  }
  // 🟠 3. Very high financial impact → DELAY
  else if (impactScore > 5) {
    decision = "DELAY";
  }
  // 🟡 4. Moderate anomaly OR moderate impact → PARTIAL
  else if (
    (deviationScore > 0.5 && deviationScore <= 0.8) ||
    (impactScore > 2 && impactScore <= 5)
  ) {
    decision = "PARTIAL";
  }
  // 🟢 5. Normal behavior → ALLOW
  else {
    decision = "ALLOW";
  }

  const risk_score = Math.min(
    100,
    deviationScore * 60 + impactScore * 10
  );

  // STEP 5: LLM Reasoning (for explanation only, decision is deterministic)
  console.log("\n[4] Running LLM reasoning...");
  let llmResult;
  try {
    llmResult = await getLLMDecision(
      llmModelId,
      amount,
      isKnown,
      behavior.avgAmount,
      deviationScore,
      impactScore
    );
  } catch (error) {
    console.warn(`  ⚠️ LLM failed: ${error.message}, using fallback`);
    llmResult = {
      decision: "N/A",
      risk_score: risk_score,
      reason: "LLM unavailable, using deterministic decision"
    };
  }

  console.log(`  ✓ LLM Suggested: ${llmResult.decision}`);
  console.log(`  ✓ FINAL Decision: ${decision}`);
  console.log(`  ✓ Risk Score: ${risk_score}`);
  console.log(`  ✓ Reason: ${llmResult.reason}`);

  // STEP 6: Final Output
  console.log("\n[5] Final decision package:");
  const finalOutput = {
    decision: decision, // ✅ deterministic (not LLM-dependent)
    risk_score: risk_score,
    confidence,
    deviation_score: deviationScore,
    impact_score: impactScore,
    reason: llmResult.reason,
    timestamp: new Date().toISOString(),
  };

  return finalOutput;
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log(
    "🚀 QVAC LOCAL Transaction Decision Engine - Initialization\n"
  );

  let llmModelId = null;
  let embedModelId = null;

  try {
    // Load models from QVAC registry
    // Use small, fast models for local inference
    console.log("📦 Loading LLM model (Llama 3.2 1B Instruct)...");
    try {
      llmModelId = await loadModel({
        modelSrc:
          "https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf",
        modelType: "llm",
        modelConfig: { ctx_size: 1024 },
      });
      console.log(`✅ LLM Model loaded: ${llmModelId}\n`);
    } catch (modelError) {
      console.warn(`⚠️ LLM model loading failed: ${modelError.message}`);
      console.log("   System will use deterministic logic fallback\n");
      llmModelId = null;
    }

    console.log("📦 Loading embedding model (bge-small-en-v1.5)...");
    try {
      embedModelId = await loadModel({
        modelSrc:
          "https://huggingface.co/bartowski/bge-small-en-v1.5-GGUF/resolve/main/bge-small-en-v1.5-Q4_K_M.gguf",
        modelType: "embedding",
        modelConfig: { ctx_size: 512 },
      });
      console.log(`✅ Embedding Model loaded: ${embedModelId}\n`);
    } catch (modelError) {
      console.warn(`⚠️ Embedding model loading failed: ${modelError.message}`);
      console.log("   System will use heuristic deviation fallback\n");
      embedModelId = null;
    }

    // Verify at least one model loaded
    if (!llmModelId && !embedModelId) {
      console.error("❌ CRITICAL: No models loaded. Cannot proceed.");
      process.exit(1);
    }

    // Test transaction 1: Unknown recipient, high amount
    const tx1 = {
      amount: 100,
      recipient: "unknown_wallet_xyz",
      isKnown: false,
      history: [
        { amount: 5, recipient: "trusted_addr_1" },
        { amount: 3, recipient: "trusted_addr_1" },
        { amount: 7, recipient: "trusted_addr_2" },
      ],
    };

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("TEST 1: Unknown Recipient, High Amount");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    const decision1 = await analyzeTransaction(tx1, llmModelId, embedModelId);
    console.log("\n✅ FINAL DECISION:");
    console.log(JSON.stringify(decision1, null, 2));

    // Test transaction 2: Known recipient, normal amount
    const tx2 = {
      amount: 4.5,
      recipient: "trusted_addr_1",
      isKnown: true,
      history: [
        { amount: 5, recipient: "trusted_addr_1" },
        { amount: 3, recipient: "trusted_addr_1" },
        { amount: 7, recipient: "trusted_addr_2" },
      ],
    };

    console.log("\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("TEST 2: Known Recipient, Normal Amount");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    const decision2 = await analyzeTransaction(tx2, llmModelId, embedModelId);
    console.log("\n✅ FINAL DECISION:");
    console.log(JSON.stringify(decision2, null, 2));

    // Test transaction 3: Known recipient, extreme amount
    const tx3 = {
      amount: 500,
      recipient: "trusted_addr_2",
      isKnown: true,
      history: [
        { amount: 5, recipient: "trusted_addr_1" },
        { amount: 3, recipient: "trusted_addr_1" },
        { amount: 7, recipient: "trusted_addr_2" },
      ],
    };

    console.log("\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("TEST 3: Known Recipient, Extreme Amount");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    const decision3 = await analyzeTransaction(tx3, llmModelId, embedModelId);
    console.log("\n✅ FINAL DECISION:");
    console.log(JSON.stringify(decision3, null, 2));

    // Cleanup
    console.log(
      "\n\n✨ All tests complete. Unloading models and closing SDK...\n"
    );
    if (llmModelId) {
      try {
        await unloadModel({ modelId: llmModelId });
      } catch (e) {
        console.warn(`⚠️ LLM unload warning: ${e.message}`);
      }
    }
    if (embedModelId) {
      try {
        await unloadModel({ modelId: embedModelId });
      } catch (e) {
        console.warn(`⚠️ Embedding unload warning: ${e.message}`);
      }
    }
    console.log("✅ Models unloaded. Goodbye!\n");
  } catch (error) {
    console.error("\n❌ ERROR:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main().catch(console.error);
