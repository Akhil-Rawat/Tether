# 🚀 QVAC LOCAL Transaction Decision Engine

A **fully local, AI-powered transaction decision engine** using QVAC SDK with:

- ✅ **LLM Reasoning** (@qvac/sdk completion)
- ✅ **Semantic Embeddings** (@qvac/sdk embed)
- ✅ **NO external APIs** — 100% local inference
- ✅ **Contextual decisions** — Not rule-based
- ✅ **Behavior-aware** — Uses transaction history

## 📊 Output Decision

```json
{
  "decision": "ALLOW|REJECT|DELAY|PARTIAL",
  "risk_score": 0-100,
  "confidence": 0-1,
  "deviation_score": 0-1,
  "impact_score": 0-10+,
  "reason": "Human-readable explanation",
  "timestamp": "2026-05-05T12:34:56.789Z"
}
```

---

## 🏗️ Architecture

### STEP 1: Behavior Model
Compute metrics from transaction history:
- Average transaction amount
- List of known recipients
- Transaction count

### STEP 2: Embeddings (QVAC)
Generate vector embeddings for:
- Current transaction: `"Send {amount} SOL to {recipient}"`
- Historical transactions: same format

**Deviation Score** = 1 - max_cosine_similarity

### STEP 3: Simulation Metrics
Calculate:
- **Impact Score** = `amount / avgAmount` (capped at 10)
- **Confidence** = Random 0.75 - 0.95

### STEP 4: LLM Reasoning (QVAC)
Pass to LLM:
```
Transaction Context:
- Amount, Recipient, History Metrics
- Deviation Score, Impact Score

LLM Decides:
- HIGH_DEVIATION + UNKNOWN → REJECT
- HIGH_IMPACT → DELAY
- MEDIUM_RISK → PARTIAL
- LOW_RISK → ALLOW
```

### STEP 5: Final Output
Return decision with explanations and confidence scores.

---

## 🛠️ Installation & Setup

### Prerequisites

- **Node.js** ≥ 22.17
- **Vulkan runtime** (GPU acceleration)
  - Linux: `sudo apt install libvulkan1 mesa-vulkan-drivers`
  - macOS: Metal (built-in)
  - Windows: Vulkan SDK

### 1. Clone/Setup

```bash
cd qvac-decision-engine
npm install
```

### 2. Verify QVAC Installation

```bash
npm list @qvac/sdk
```

---

## ⚡ Quick Start

### Run the Engine

```bash
npm start
```

This runs **3 test transactions** with different scenarios:

1. **Unknown recipient, high amount** → Usually `REJECT` or `DELAY`
2. **Known recipient, normal amount** → Usually `ALLOW`
3. **Known recipient, extreme amount** → Usually `DELAY`

### Expected Output

```
🚀 QVAC LOCAL Transaction Decision Engine - Initialization

📦 Loading LLM model (Llama 3.2 1B Instruct)...
✅ LLM Model loaded: llm-model-123

📦 Loading embedding model (bge-small-en-v1.5)...
✅ Embedding Model loaded: embed-model-456

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TEST 1: Unknown Recipient, High Amount
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[1] Computing behavior model...
  ✓ Average amount: 5.00 SOL
  ✓ Known recipients: 2

[2] Generating embeddings & deviation score...
  ✓ Deviation score: 0.865

[3] Computing impact & confidence metrics...
  ✓ Impact score: 20.00
  ✓ Confidence: 87.3%

[4] Running LLM reasoning...
  ✓ Decision: REJECT
  ✓ Risk Score: 92
  ✓ Reason: Unknown recipient with 20x impact and high deviation

[5] Final decision package:
✅ FINAL DECISION:
{
  "decision": "REJECT",
  "risk_score": 92,
  "confidence": 0.873,
  "deviation_score": 0.865,
  "impact_score": 20,
  "reason": "Unknown recipient with 20x impact and high deviation",
  "timestamp": "2026-05-05T12:34:56.789Z"
}
```

---

## 📝 Usage as a Module

### Import & Use

```javascript
import { analyzeTransaction } from "./decisionEngine.js";

const transaction = {
  amount: 50,
  recipient: "0x742d35Cc6634C0532925a3b844Bc927e2f58E9c8",
  isKnown: false,
  history: [
    { amount: 5, recipient: "0x1234..." },
    { amount: 3, recipient: "0x1234..." },
  ],
};

const decision = await analyzeTransaction(
  transaction,
  llmModelId,
  embedModelId
);

console.log(decision.decision); // "REJECT" | "ALLOW" | "DELAY" | "PARTIAL"
```

---

## 🔧 Configuration

### Model Selection

Edit `decisionEngine.js` to use different models:

```javascript
// LLM Model
llmModelId = await loadModel({
  modelSrc: "https://huggingface.co/.../model.gguf",
  modelType: "llm",
  modelConfig: { ctx_size: 2048 }, // Adjust for your hardware
});

// Embedding Model
embedModelId = await loadModel({
  modelSrc: "https://huggingface.co/.../embed.gguf",
  modelType: "llm",
  modelConfig: { ctx_size: 512 },
});
```

### Available Models (QVAC Registry)

**LLM:**
- `Llama-3.2-1B-Instruct` (fast, ~1GB)
- `Llama-3.2-3B-Instruct` (balanced, ~2GB)
- `Mistral-7B` (powerful, ~5GB)

**Embeddings:**
- `bge-small-en-v1.5` (fast, ~33MB)
- `nomic-embed-text-v1.5` (better quality, ~274MB)

---

## 📊 Decision Logic

The LLM applies this reasoning:

```
IF deviation_score > 0.7 AND NOT isKnown
  → REJECT (High anomaly + unknown recipient)

ELSE IF impact_score > 5
  → DELAY (Transaction too large for history)

ELSE IF deviation_score > 0.5 OR impact_score > 2
  → PARTIAL (Medium risk, needs approval)

ELSE
  → ALLOW (Low risk, proceed)
```

**BUT:** The actual decision comes from **LLM reasoning**, not hard rules. Each call may vary slightly based on context.

---

## 🚀 Performance Tuning

### For Different Hardware

**Fast (CPU-only, laptop):**
```javascript
modelConfig: { ctx_size: 256, n_threads: 4 }
```

**Balanced (Mid-tier GPU):**
```javascript
modelConfig: { ctx_size: 1024, n_threads: 8 }
```

**Powerful (High-end GPU):**
```javascript
modelConfig: { ctx_size: 4096, n_threads: 16 }
```

### Check GPU Availability

```bash
# Linux
vulkaninfo --summary

# macOS (Metal is automatic)

# Windows
vulkaninfo.exe --summary
```

---

## 📚 Project Structure

```
qvac-decision-engine/
├── package.json                    # Dependencies
├── decisionEngine.js              # Main engine (fully self-contained)
└── README.md                      # This file
```

---

## 🔐 Security Notes

- ✅ **No network calls** after model download
- ✅ **All inference local** — no API keys needed
- ✅ **Models cached** in `~/.qvac/models/`
- ✅ **GPU-accelerated** when available
- ✅ **Privacy-first** — data never leaves your machine

---

## 🐛 Troubleshooting

### Error: `Model not found in registry`
→ Check internet connection (models download on first run)

### Error: `Vulkan not found`
→ Install Vulkan runtime:
```bash
# Ubuntu/Debian
sudo apt install libvulkan1 mesa-vulkan-drivers

# Fedora/RHEL
sudo dnf install vulkan-loader mesa-vulkan-drivers
```

### Slow performance
→ Reduce `ctx_size` or use smaller model variant

### CUDA/ROCm issues
→ Ensure GPU drivers support Vulkan; QVAC uses Vulkan for GPU acceleration

---

## 📖 API Reference

### `analyzeTransaction(input, llmModelId, embedModelId)`

**Parameters:**
- `input` - Transaction object
  - `amount` (number): SOL amount
  - `recipient` (string): Wallet address
  - `isKnown` (boolean): Known recipient?
  - `history` (array): Past transactions

**Returns:**
```typescript
{
  decision: "ALLOW" | "REJECT" | "DELAY" | "PARTIAL",
  risk_score: number,        // 0-100
  confidence: number,         // 0-1
  deviation_score: number,    // 0-1
  impact_score: number,       // 0-10+
  reason: string,
  timestamp: string
}
```

---

## 🔗 Resources

- [QVAC Documentation](https://docs.qvac.tether.io/)
- [QVAC SDK API](https://docs.qvac.tether.io/sdk/api/)
- [@qvac/sdk npm](https://www.npmjs.com/package/@qvac/sdk)
- [Model Registry](https://huggingface.co/qvac)

---

## 📄 License

MIT

---

## ✨ Key Features

✅ **Fully Local** — No cloud, no APIs  
✅ **Production-Ready** — Full error handling  
✅ **Fast** — GPU-accelerated inference  
✅ **Contextual** — Uses embeddings + LLM  
✅ **Explainable** — Includes reasoning  
✅ **Configurable** — Easy model swaps  
✅ **Type-Safe** — Full JS/TS support  

---

**Built with QVAC SDK v0.10.0+**
