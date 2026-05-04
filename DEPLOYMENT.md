# Guardian Executor - Deployment & Testing Guide

## Program Overview

**guardian_executor** is a Solana Anchor program that enforces AI decisions on transactions through 4 decision states:
- **0 = ALLOW**: Transfer full amount to recipient
- **1 = REJECT**: Reject transaction with custom error
- **2 = DELAY**: Store transaction in PDA, execute later
- **3 = PARTIAL**: Transfer min(amount, max_allowed)

## Prerequisites

1. **Solana CLI** installed and configured
2. **Rust 1.70+** installed
3. **Anchor CLI 0.29.0+** installed (`cargo install --git https://github.com/coral-xyz/anchor`)
4. **Node.js 16+** and **Yarn** for testing
5. Solana wallet set up: `solana-keygen new` (or use existing keypair)

## Build

```bash
cd /home/faygo/Tether

# Install dependencies
yarn install

# Build the program
anchor build
```

**Output**: Compiled program at `target/deploy/guardian_executor.so`

## Program ID Setup

1. Generate or use existing program keypair:
```bash
# Generate new keypair for program
solana-keygen grind-validator-stakes 1 --outfile target/deploy/guardian_executor-keypair.json

# OR use existing keypair
# Ensure keypair exists at: target/deploy/guardian_executor-keypair.json
```

2. Extract the public key:
```bash
solana address -k target/deploy/guardian_executor-keypair.json
```

3. Update `Anchor.toml` and `declare_id!()` in `src/lib.rs` with the extracted program ID

4. Rebuild:
```bash
anchor build
```

## Test Locally

```bash
# Start local Solana validator (in separate terminal)
solana-test-validator

# In another terminal, run tests
anchor test --skip-local-validator

# Or run all at once (validator starts automatically)
anchor test
```

**Test Coverage**:
- ✅ ALLOW decision transfers full amount
- ✅ REJECT decision returns error
- ✅ PARTIAL decision transfers min(amount, max_allowed)
- ✅ DELAY decision stores in PDA
- ✅ Insufficient balance validation
- ✅ Invalid decision validation
- ✅ Event emission verification

## Deploy to Devnet

```bash
# Set cluster to devnet
solana config set --url devnet

# Fund your wallet with devnet SOL
solana airdrop 2 $(solana address)

# Deploy
anchor deploy

# Output will show deployment transaction and program ID
```

## Deploy to Mainnet

```bash
# WARNING: Mainnet deployments are permanent
# Ensure you've fully tested on devnet first

# Set cluster to mainnet
solana config set --url mainnet-beta

# Deploy
anchor deploy

# Verify deployment
solana program show <PROGRAM_ID> --url mainnet-beta
```

## Using the Program

### JavaScript/TypeScript Client

```typescript
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { GuardianExecutor } from "./target/types/guardian_executor";

const provider = anchor.AnchorProvider.env();
const program = new Program<GuardianExecutor>(programIdl, programId, provider);

// Execute with ALLOW decision
const tx = await program.methods
  .executeWithDecision(
    0, // ALLOW
    new anchor.BN(1_000_000), // 0.001 SOL
    new anchor.BN(2_000_000), // max_allowed
    new anchor.BN(0), // delay_seconds
    recipientPublicKey
  )
  .accounts({
    signer: provider.wallet.publicKey,
    recipient: recipientPublicKey,
    delayPda: delayPdaAddress,
    systemProgram: anchor.web3.SystemProgram.programId,
  })
  .rpc();

console.log("Transaction signature:", tx);
```

## Program Accounts & Data

### DelayedTx Account
Stores delayed transactions when DELAY decision is executed.

**PDA Derivation**:
```
seeds = ["delay", signer_pubkey]
program_id = guardian_executor
```

**Account Structure**:
```
struct DelayedTx {
  amount: u64,              // Lamports to transfer
  recipient: Pubkey,        // Recipient address
  execute_after: i64,       // Unix timestamp when executable
}
```

**Space**: 8 (discriminator) + 8 + 32 + 8 = 56 bytes

## Error Codes

| Error | Code | Description |
|-------|------|-------------|
| `TransactionRejected` | 0x1 | Decision was REJECT (1) |
| `InvalidDecision` | 0x2 | Decision not in range 0-3 |
| `InsufficientBalance` | 0x3 | Signer lacks lamports for transfer |

## Events

All events include `signer`, `timestamp` (Unix), and decision-specific fields:

| Event | Decision | Fields |
|-------|----------|--------|
| `AllowedExecuted` | ALLOW (0) | recipient, amount |
| `Rejected` | REJECT (1) | recipient, amount |
| `PartialExecuted` | PARTIAL (3) | recipient, requested_amount, partial_amount, max_allowed |
| `DelayedStored` | DELAY (2) | recipient, amount, execute_after |

## Troubleshooting

### Program fails to build
```
error: failed to resolve: use of undeclared crate `anchor_lang`
```
→ Run `yarn install` to install dependencies

### "Custom program error: 0x1" on execution
→ Either decision was REJECT (intended error) or account space miscalculated
→ Check PDA derivation matches between program and tests

### "Insufficient funds for deployment"
→ Fund your wallet: `solana airdrop 2`

### Tests fail with "Account not found"
→ Ensure local validator is running: `solana-test-validator`

### "Program already deployed at address X"
→ Different program ID than expected. Verify `declare_id!()` matches wallet keypair.

## Security Notes

- ✅ All transfers validated before execution (via CPI to System Program)
- ✅ Decision input validated (0-3 range)
- ✅ Signer balance checked before transfers
- ✅ PDA deterministically derived (no user control)
- ✅ No unsafe code
- ✅ Proper error handling with custom error codes

## File Structure

```
/home/faygo/Tether/
├── Anchor.toml                          # Anchor configuration
├── Cargo.toml                           # Workspace config
├── programs/
│   └── guardian_executor/
│       ├── Cargo.toml                   # Program dependencies
│       └── src/
│           └── lib.rs                   # Program logic
├── tests/
│   └── guardian_executor.ts             # Test suite
└── target/
    └── deploy/
        ├── guardian_executor.so         # Compiled program
        └── guardian_executor-keypair.json
```

## Next Steps

1. ✅ Review `src/lib.rs` for program logic
2. ✅ Review `tests/guardian_executor.ts` for test patterns
3. ✅ Build: `anchor build`
4. ✅ Test: `anchor test`
5. ✅ Deploy to devnet: `anchor deploy`
6. ✅ Verify on block explorer (e.g., Solscan)
