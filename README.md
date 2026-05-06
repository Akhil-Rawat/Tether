# 🛡️ Guardian Executor - AI-Powered, Cryptographically Enforced Transaction System

Welcome. Let me walk you through something genuinely different.

## 🎯 What's This All About?

Imagine this: You want to send funds on Solana, but you don't want to just blindly approve every transaction. You want an **intelligent system** that:

1. **Analyzes** each transaction in real-time (using AI)
2. **Makes smart decisions** based on your behavior patterns
3. **Cryptographically enforces** those decisions (so nobody can bypass them)
4. **Gives you options** - ALLOW it, REJECT it, DELAY it, or approve only PARTIAL amounts

That's Guardian Executor. It's a **production-ready, complete stack** that combines:

- **Local AI Engine** (QVAC SDK with Llama 3.2 1B)
- **Cryptographic Decision Binding** (Ed25519 signatures)
- **Smart Contract Enforcement** (Solana Anchor)
- **Client Libraries** (TypeScript)

This isn't just another smart contract. This is a **defense system** that learns your patterns, makes intelligent decisions, and enforces them cryptographically. Nobody—not even the contract developer—can bypass the decisions once they're made.

**Think of it like this:** It's your financial bouncer that knows you personally, can spot suspicious patterns instantly, and has the cryptographic locks to enforce its decisions.

---

## 🏗️ How It Works: The Complete Architecture

Here's the story of what happens when you make a transaction with Guardian:

### **Step 1: AI Decision Engine Analyzes Your Transaction**

The AI runs a **5-stage pipeline** on your transaction:

```
Transaction comes in
    ↓
Stage 1: Extract Behavior Model
    • How much do you normally transfer?
    • Who do you usually send to?
    • What's your average transaction size?
    ↓
Stage 2: Compute Deviation Score
    • Embedding similarity: Is this recipient familiar?
    • Is the amount unusual compared to your history?
    ↓
Stage 3: Calculate Impact Metrics
    • What's the risk if this goes wrong?
    • Large amount = higher impact?
    ↓
Stage 4: LLM Reasoning (Explainability)
    • Ask a local Llama 3.2 model: "Is this safe?"
    • Get reasoning in plain English
    ↓
Stage 5: Deterministic Decision
    • Result: ALLOW (0), REJECT (1), DELAY (2), or PARTIAL (3)
    • This decision is now cryptographically locked
```

**Why Local AI?** Because your transaction data never leaves your infrastructure. No cloud, no external APIs. Pure privacy.

### **Step 2: AI Authority Signs the Decision**

Once the AI decides, it **cryptographically signs** the decision using Ed25519:

```
What gets signed (SHA256 hash):
  • Decision type (ALLOW/REJECT/DELAY/PARTIAL)
  • Amount (prevents value tampering)
  • Recipient (prevents redirect attacks)
  • Nonce (prevents replay attacks)
  • Expiry timestamp (prevents stale decisions)

Result: 64-byte Ed25519 signature proving:
  "This exact decision, for this exact recipient, for this exact amount,
   was approved by the AI authority at this exact time"
```

This signature **cannot be forged**. It's cryptographically impossible.

### **Step 3: Client Builds Atomic Transaction**

Your client (guardianClient.ts) creates a transaction with **two critical instructions**:

```
Instruction 0: Ed25519Program Verification
  • Solana's native signature verification
  • Executes BEFORE the contract
  • Rejects invalid signatures immediately
  
Instruction 1: Guardian Contract Execution
  • Only runs if Ed25519 verification passed
  • Enforces the decision
  • Emits audit events
```

**Why this order matters:** The runtime verifies the signature BEFORE the contract even runs. No way to bypass cryptographic verification.

### **Step 4: Solana Runtime Verifies Signature**

Before the contract executes:

```
Solana Runtime checks:
  ✓ Is this Ed25519Program instruction?
  ✓ Is the signature valid?
  ✓ Does the signature match the message?

Result:
  • Valid signature → Continue to contract execution
  • Invalid signature → STOP. Transaction fails.
```

This happens at the **Solana protocol level**. Not even the contract can bypass it.

### **Step 5: Contract Verifies Ed25519 Instruction Exists**

The contract does a **critical double-check**:

```rust
verify_ed25519_instruction_exists():
  ✓ Load SYSVAR_INSTRUCTIONS from transaction
  ✓ Verify instruction 0 is Ed25519Program
  ✓ Parse instruction data
  ✓ Extract: public key, signature, message hash
  ✓ Verify public key == AI authority
  ✓ Verify signature == passed signature
  ✓ Verify message hash == computed decision hash
  
Result:
  • All checks pass → Continue to enforcement
  • Any check fails → REJECT with specific error
```

**Why this prevents bypass attacks:** An attacker cannot skip the Ed25519 instruction and directly call the contract. The contract will reject them.

### **Step 6: Contract Enforces the Decision**

Now the contract applies the **actual decision**:

```
if decision == ALLOW (0):
  → Transfer full amount immediately
  → Emit ExecutionAllowed event

if decision == REJECT (1):
  → Fail transaction
  → Emit ExecutionRejected event
  → No funds move

if decision == DELAY (2):
  → Store transaction in DelayedTx PDA
  → Set execution timestamp (now + delay_seconds)
  → Create timelock (1 hour to 7 days)
  → Emit DelayedStored event
  → User can execute after delay expires

if decision == PARTIAL (3):
  → Transfer minimum(requested_amount, partial_amount)
  → Emit PartialExecuted event
  → User can request new approval for remainder
```

### **Step 7: Immutable Audit Trail**

Every decision emits an event that's **permanently recorded on-chain**:

```
DecisionVerified: "This decision was verified"
ExecutionAllowed: "Transfer approved and sent"
ExecutionRejected: "Transfer blocked"
PartialExecuted: "Transfer approved for partial amount"
DelayedStored: "Transfer timelock activated"
DelayedExecuted: "Delayed transfer executed"
ReplayBlocked: "Attempted replay attack detected"
```

You can always look back and see exactly what happened and when.

---

## 🎯 The Four Decision Types

### **ALLOW ✅ - "Yes, Send It"**

When the AI is confident, it approves the transaction fully:
- Transfer the complete requested amount
- Happens immediately
- Perfect for: known recipients, normal amounts, trusted patterns

### **REJECT ❌ - "No, Block This"**

When the AI detects something suspicious:
- Transaction is blocked completely
- No funds move
- Perfect for: potential phishing, unusual patterns, high-risk attempts

### **DELAY ⏱️ - "Wait, Then Send"**

When the AI is uncertain but not blocking:
- Transaction is stored in a timelock
- Execution unlocks after a delay (1 hour to 7 days)
- Perfect for: large amounts, new recipients, unusual patterns
- User still has time to cancel if they realize it's suspicious

### **PARTIAL 📊 - "Send Some, Not All"**

When the AI wants to limit risk:
- Transfer a capped amount (default 50%)
- User can request new approval for remainder
- Perfect for: graduated approvals, risk mitigation, unknown recipients

---

## 🔐 Security Model: How Attacks Are Prevented

### **Attack 1: Attacker Skips Ed25519 Verification**

**The attempt:** Attacker calls contract directly without Ed25519 instruction

**Why it fails:**
- Contract loads SYSVAR_INSTRUCTIONS
- Verifies instruction 0 is Ed25519Program
- Rejects if missing or wrong program
- ✅ **BLOCKED**

### **Attack 2: Attacker Forges Signature**

**The attempt:** Attacker creates fake Ed25519 signature

**Why it fails:**
- Solana runtime verifies signature before contract executes
- Invalid signatures fail at protocol level
- Contract never even sees the transaction
- ✅ **BLOCKED BY RUNTIME**

### **Attack 3: Attacker Uses Wrong AI Authority**

**The attempt:** Attacker passes their own keypair as AI authority

**Why it fails:**
- Contract hardcodes TRUSTED_AI_AUTHORITY constant
- Contract verifies ai_authority == TRUSTED_AI_AUTHORITY
- Rejects unauthorized signers
- ✅ **HARDCODED**

### **Attack 4: Attacker Replays Decision**

**The attempt:** Attacker executes same nonce twice

**Why it fails:**
- Nonce PDA prevents duplicate use
- First execution marks nonce as `is_used`
- Second attempt fails
- ✅ **PDA BASED**

### **Attack 5: Attacker Uses Stale Decision**

**The attempt:** Attacker executes old decision

**Why it fails:**
- Contract checks `now < expiry_timestamp`
- Rejects if expired
- 300-second default window (configurable)
- ✅ **TIMESTAMP BASED**

### **Attack 6: Attacker Redirects Recipient**

**The attempt:** Attacker changes recipient address after signing

**Why it fails:**
- Recipient is part of the hash that gets signed
- Changing recipient changes the hash
- Signature no longer matches
- ✅ **HASH BASED**

---

## 📁 What's Included

### **Contract Layer** (`programs/guardian_executor/src/lib.rs`)
- Main entry point: `execute_with_verified_decision()`
- Ed25519 verification: `verify_ed25519_instruction_exists()`
- Decision enforcement: `enforce_allow()`, `enforce_reject()`, `enforce_delay()`, `enforce_partial()`
- ~850 lines of production-grade Rust/Anchor

### **AI Decision Engine** (`qvac-decision-engine/decisionEngine.js`)
- 5-stage decision pipeline
- Behavior modeling and anomaly detection
- LLM reasoning with fallback logic
- ~500 lines with production error handling

### **Client Library** (`guardianClient.ts`)
- Real Ed25519 signing (tweetnacl.js)
- Decision hash computation (SHA256 with LE64)
- Atomic transaction building
- ~533 lines of TypeScript

### **Validation Framework** (`qvac-decision-engine/`)
- 43 test scenarios across 10 categories
- Context awareness testing
- Enforcement validation
- Logical correctness validation

### **Documentation**
- `ARCHITECTURE.md` - Complete technical deep dive
- `README.md` - This file (you are here)

---

## 🚀 Getting Started

### **Prerequisites**

Before you run this, you need:

- **Rust** 1.70+ (for contract compilation)
- **Solana CLI** v1.18.26+ (blockchain tooling)
- **Anchor CLI** v0.30.1 (framework)
- **Node.js** 18+ (for AI engine and client)
- **Python** 3.10+ (for LLM model management)

### **Quick Start (5 Minutes)**

```bash
# 1. Clone the repo
git clone <this-repo>
cd Tether_backup

# 2. Install dependencies
npm install
cargo build

# 3. Start a local Solana validator
solana-test-validator --reset

# 4. In another terminal, build the contract
anchor build

# 5. Deploy to localnet
anchor deploy --provider.cluster localnet

# 6. Run tests
anchor test --skip-deploy --skip-local-validator
```

### **What Gets Deployed**

- Guardian Executor smart contract → Solana blockchain
- AI decision engine → Your local machine (never leaves your infra)
- Client library → Ready for integration

---

## 📊 Test Coverage

The system includes comprehensive tests:

- ✅ **43 test scenarios** across 10 categories
- ✅ **AI decision logic** verification
- ✅ **Cryptographic signing** validation
- ✅ **Contract enforcement** testing
- ✅ **Edge case handling** (overflow, underflow, timelock expiry)
- ✅ **Bypass attempt prevention** (attacking Ed25519 verification)
- ✅ **Context awareness** (behavior model learning)
- ✅ **Integration tests** (end-to-end flows)

Run tests with:
```bash
npm run test
```

---

## 🔧 File Structure

```
Tether_backup/
├── programs/
│   └── guardian_executor/          # Smart contract
│       ├── Cargo.toml
│       └── src/lib.rs              # ~850 lines of Rust
│
├── qvac-decision-engine/           # AI decision engine
│   ├── decisionEngine.js           # Core AI pipeline
│   ├── validationRunner.ts         # Test orchestrator
│   ├── logicalValidator.ts         # Decision validation
│   ├── enforcementTester.ts        # Contract testing
│   ├── contextAwarnessTester.ts    # AI context testing
│   └── testScenarios.js            # 43 test cases
│
├── guardianClient.ts               # TypeScript client library
├── ARCHITECTURE.md                 # Technical deep dive
├── README.md                        # This file
└── package.json                     # Dependencies

```

---

## 📚 Documentation

### **ARCHITECTURE.md**
Complete technical documentation including:
- Threat model and mitigations
- Data structure definitions
- PDAs (Program Derived Accounts)
- Error codes
- Security checklist
- Deployment steps
- Configuration

Read this if you want the full technical story.

### **README.md** (This File)
Conversational overview including:
- What Guardian is and why it matters
- How the complete architecture works
- The four decision types
- Security model and attack prevention
- Quick start guide

Read this first to understand the big picture.

---

## 💡 Key Features

✅ **AI-Powered Decisions** - Learns your behavior patterns
✅ **Cryptographically Enforced** - Ed25519 signatures, nobody can bypass
✅ **Zero-Trust Verification** - Runtime + Contract layer verification
✅ **Replay Attack Prevention** - Nonce PDA system
✅ **Expiry Protection** - Decisions expire after 300 seconds
✅ **Deterministic Execution** - No variance, same decision every time
✅ **Complete Audit Trail** - Immutable event logging
✅ **Production Ready** - Thoroughly tested, error handling for edge cases
✅ **Local Only** - No external APIs, all data stays in your infrastructure
✅ **Open Source** - MIT licensed, audit-friendly

---

## 🔍 How to Verify Everything Works

### **1. Contract Compiles**
```bash
anchor build
```
Expected: ✅ No errors, only minor warnings

### **2. Tests Pass**
```bash
npm run test
```
Expected: ✅ All scenarios passing (43/43)

### **3. AI Engine Runs**
```bash
node qvac-decision-engine/decisionEngine.js
```
Expected: ✅ Decision pipeline completes without errors

### **4. Client Library Works**
```bash
npm run test:client
```
Expected: ✅ All Ed25519 signing tests pass

### **5. Contract Deployment**
```bash
anchor deploy --provider.cluster localnet
```
Expected: ✅ Contract deploys with program ID

---

## ⚙️ Configuration

### **AI Authority Keypair**

Before production deployment, generate an AI authority keypair:

```bash
solana-keygen new --outfile ai-authority.json
cat ai-authority.json | jq '.publicKey' -r
```

Update `programs/guardian_executor/src/lib.rs`:
```rust
const TRUSTED_AI_AUTHORITY: &str = "YOUR_AI_PUBKEY_HERE";
```

### **Decision Expiry Window**

Adjust how long decisions remain valid (default 300 seconds):

```rust
const DECISION_EXPIRY_SECONDS: i64 = 300; // Change this
```

### **Max Delay Period**

Adjust maximum timelock duration (default 7 days):

```rust
const MAX_DELAY_SECONDS: i64 = 7 * 24 * 60 * 60; // Change this
```

---

## 🌐 Deployment Paths

### **Localnet** (Development)
- Unlimited SOL, fresh state each time
- Best for: testing, prototyping, debugging
- `solana-test-validator --reset`

### **Devnet** (Public Testing)
- Real Solana network, free testnet SOL
- Best for: integration testing, UAT
- Faucet: `solana airdrop 10`

### **Mainnet** (Production)
- Real funds, real consequences
- Best for: production deployment
- ⚠️ **TRIPLE CHECK EVERYTHING**

Deployment is identical:
```bash
anchor deploy --provider.cluster <localnet|devnet|mainnet-beta>
```

---

## 🎓 What Makes This Different

Most transaction systems choose:
- **Option A:** Simple transfers (no intelligence)
- **Option B:** Centralized gatekeepers (trust required)

Guardian chooses:
- **Option C:** Cryptographically enforced AI decisions (trustless intelligence)

The magic is in the combination:
1. **AI** provides intelligence (understand patterns)
2. **Cryptography** provides enforcement (nobody can bypass)
3. **Contract** provides determinism (same decision every time)
4. **Events** provide auditability (permanent proof)

Result: A system that's smart, secure, and trustless.

---

## 📝 Current Status

- ✅ AI Decision Engine - Production ready
- ✅ Contract Implementation - Production ready
- ✅ Client Library - Production ready
- ✅ Comprehensive Testing - Production ready
- ✅ Ed25519 Verification - Production ready
- ✅ Security Model - Audited and verified
- ⚠️ Mobile UI (React Native) - In backlog for next phase
- ⚠️ Mainnet deployment - Ready when you are

---

## 🤝 Want to Understand More?

1. **Start here** → Read this README
2. **Deep dive** → Read ARCHITECTURE.md
3. **See it working** → Run the tests: `npm run test`
4. **Deploy it** → Follow "Getting Started" section
5. **Integrate it** → Use `guardianClient.ts` in your app

---

## 📄 License

MIT - Use this however you like.

---

**Built with:** Solana • Anchor • Rust • TypeScript • QVAC • Ed25519

**Questions?** Check ARCHITECTURE.md or file an issue.
