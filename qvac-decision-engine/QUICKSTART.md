# ⚡ QVAC Decision Engine - Quick Reference

## 🚀 Get Started (2 Minutes)

```bash
# 1. Install
cd qvac-decision-engine
npm install

# 2. Run
npm start

# First run downloads models (~500MB), then executes 3 test transactions
```

## 📊 Input Format

```javascript
const transaction = {
  amount: 50,                    // SOL amount
  recipient: "0xABCD...",        // Wallet address
  isKnown: false,                // Known recipient?
  history: [                     // Past transactions
    { amount: 5, recipient: "0x1234..." },
    { amount: 3, recipient: "0x1234..." }
  ]
};
```

## 🎯 Output Format

```javascript
{
  decision: "ALLOW",             // ALLOW | REJECT | DELAY | PARTIAL
  risk_score: 25,                // 0-100
  confidence: 0.87,              // 0-1 (typical 0.75-0.95)
  deviation_score: 0.38,         // 0-1 (0=normal, 1=anomalous)
  impact_score: 2.5,             // 0-10+ (1=average)
  reason: "Known recipient with normal amount",
  timestamp: "2026-05-05T12:34:56.789Z"
}
```

## 📈 Decision Guide

| Decision | When | Risk | Action |
|----------|------|------|--------|
| **ALLOW** | Low risk, known patterns | 0-30 | Execute immediately |
| **REJECT** | High anomaly, unknown | 80-100 | Block transaction |
| **DELAY** | Unusual amount, needs review | 60-80 | Require approval |
| **PARTIAL** | Medium risk scenario | 40-60 | Allow reduced amount |

## 🔢 Scoring Explained

### Deviation Score (0-1)
```
0.0  = Exactly like history (very normal)
0.3  = Slightly different
0.7  = Quite unusual
1.0  = Completely anomalous
```

### Impact Score (0-10+)
```
0.5  = Half of average
1.0  = Same as average
2.0  = Twice average
5.0+ = Significantly larger
```

### Risk Score (0-100)
```
0-20   = Safe
20-40  = Low risk
40-60  = Medium risk
60-80  = High risk
80-100 = Critical risk
```

## 💡 Examples

### Example 1: Normal Transaction
```javascript
{
  amount: 4,
  recipient: "trusted_addr",
  isKnown: true,
  history: [
    { amount: 5, recipient: "trusted_addr" },
    { amount: 3, recipient: "trusted_addr" }
  ]
}
// → ALLOW (risk 15)
```

### Example 2: Unknown Recipient, High Amount
```javascript
{
  amount: 100,
  recipient: "random_addr",
  isKnown: false,
  history: [
    { amount: 5, recipient: "trusted_addr" },
    { amount: 3, recipient: "trusted_addr" }
  ]
}
// → REJECT (risk 92)
```

### Example 3: Known Recipient, Extreme Amount
```javascript
{
  amount: 500,
  recipient: "trusted_addr",
  isKnown: true,
  history: [
    { amount: 5, recipient: "trusted_addr" },
    { amount: 3, recipient: "trusted_addr" }
  ]
}
// → DELAY (risk 75)
```

## 🛠️ Configuration

### Change Models

Edit `decisionEngine.js`, lines ~180-200:

```javascript
// Faster models (1-2GB)
modelSrc: "https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf"

// More powerful (3-5GB)
modelSrc: "https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf"

// Adjust context size:
modelConfig: { ctx_size: 512 }  // Smaller = faster
modelConfig: { ctx_size: 2048 } // Larger = better quality
```

## 📖 Learn More

- `README.md` — Installation & usage
- `ARCHITECTURE.md` — System design deep-dive
- `examples.js` — Code examples
- `/home/faygo/.copilot/skills/solana-anchor-contracts/SKILL.md` — Related Solana contracts

## 🔗 API Reference

### Core Function

```javascript
import { analyzeTransaction } from "./decisionEngine.js";

const decision = await analyzeTransaction(
  transaction,    // Input TX
  llmModelId,     // LLM model ID (string)
  embedModelId    // Embedding model ID (string)
);
```

### Helper Functions

```javascript
// Compute behavior stats from history
computeBehaviorModel(history)
// → { avgAmount, knownRecipients, historyCount }

// Compute deviation using embeddings
computeDeviationScore(modelId, amount, recipient, history)
// → number (0-1)

// Compute impact (relative to average)
computeImpactScore(amount, avgAmount)
// → number

// Generate confidence (0.75-0.95)
generateConfidence()
// → number
```

## ⚙️ Performance

```
Model Loading:         5-10 seconds (first time)
Single TX Analysis:    3-6 seconds
Batch (10 txs):        30-60 seconds
Memory Usage:          1.5-2 GB (runtime)
Disk (models):         ~1.3 GB (cached)
```

## 🐛 Common Issues

**Models not downloading?**
→ Check internet connection, try again

**GPU not working?**
→ Install: `sudo apt install libvulkan1 mesa-vulkan-drivers`

**Slow processing?**
→ Reduce `ctx_size` or use smaller model

**Out of memory?**
→ Use quantized models (Q4, Q5) instead of Q8

**Different decisions each run?**
→ Normal (LLM has randomness). Set `temperature: 0.3` for consistency.

## 📞 Support

- QVAC Docs: https://docs.qvac.tether.io/
- QVAC Discord: https://discord.com/invite/tetherdev
- Model Registry: https://huggingface.co/qvac

---

**Built with QVAC SDK v0.10.0+**
**Node.js 22.17+ required**
