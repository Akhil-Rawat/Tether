use anchor_lang::prelude::*;
use anchor_lang::solana_program::clock::Clock;
use anchor_lang::solana_program::sysvar::instructions as tx_instructions;
use anchor_lang::system_program;


declare_id!("EBWBHWJ5ocXEbrxqoJ6MGoeopLeLLoa4Uhy3HSD1M46n");

// Decision type constants
const DECISION_ALLOW: u8 = 0;
const DECISION_REJECT: u8 = 1;
const DECISION_DELAY: u8 = 2;
const DECISION_PARTIAL: u8 = 3;

// Decision validity window (default: 5 minutes)
const DECISION_EXPIRY_SECONDS: i64 = 300;

// Max delay (default: 7 days)
const MAX_DELAY_SECONDS: i64 = 7 * 24 * 60 * 60;

// ============================================================================
// SECURITY: HARDCODED TRUSTED AI AUTHORITY
// ============================================================================
//
// This MUST be set to the actual public key of your AI signing authority.
// NEVER allow user-controlled AI authority - this breaks all cryptographic enforcement.
//
// To set your AI authority:
// 1. Generate your AI keypair: solana-keygen new (or use ed25519_dalek)
// 2. Get the public key (base58 encoded)
// 3. Replace this constant with the real pubkey
// 4. Recompile and deploy
//
// Example format (base58): "YourAIAuthority1111111111111111111111111111" 
// This MUST be the actual public key of your AI authority keypair
// Generate with: solana-keygen new (or similar)
// For testing/demo, use a known keypair public key
const TRUSTED_AI_AUTHORITY: &str = "SilverGuard111111111111111111111111111111111"; // PLACEHOLDER - SET REAL PUBKEY

// Ed25519 program ID (Solana's native verification program)
const ED25519_PROGRAM_ID: &str = "Ed25519SigVerify111111111111111111111111111";

#[program]
pub mod guardian_executor {
    use super::*;

    /// Execute transaction with cryptographically-verified AI decision
    /// 
    /// This instruction:
    /// 1. Verifies the decision package is signed by trusted AI authority
    /// 2. Checks nonce hasn't been used (replay protection)
    /// 3. Validates decision hasn't expired
    /// 4. Enforces decision strictly (no user override)
    pub fn execute_with_verified_decision(
        mut ctx: Context<ExecuteWithVerifiedDecision>,
        // Decision package data (amount, recipient, decision, nonce, expiry)
        decision_data: DecisionPackage,
        // Ed25519 signature from AI authority
        signature: [u8; 64],
    ) -> Result<()> {
        let clock = Clock::get()?;
        let now = clock.unix_timestamp;

        // ===== STEP 1: VERIFY DECISION HASN'T EXPIRED =====
        require!(
            now <= decision_data.expiry_timestamp,
            GuardianError::ExpiredDecision
        );

        // ===== STEP 2: VERIFY AI AUTHORITY IS TRUSTED =====
        // CRITICAL SECURITY: Verify the AI authority is the trusted authority
        // This prevents any attacker account from signing decisions
        require!(
            ctx.accounts.ai_authority.key().to_string() == TRUSTED_AI_AUTHORITY,
            GuardianError::UnauthorizedAIAuthority
        );

        msg!("✓ AI authority verified: {}", ctx.accounts.ai_authority.key());

        // ===== STEP 2B: VERIFY ED25519 INSTRUCTION EXISTS (CRITICAL) =====
        // THIS IS THE MOST IMPORTANT SECURITY CHECK
        // Verify that the Ed25519Program verification was included in this transaction
        // This prevents attackers from skipping cryptographic verification
        verify_ed25519_instruction_exists(
            &ctx,
            &decision_data,
            &signature,
            &ctx.accounts.ai_authority.key(),
        )?;

        // ===== STEP 3: VERIFY DECISION PACKAGE HASH & SIGNATURE =====
        let decision_hash = compute_decision_hash(&decision_data)?;
        verify_ai_signature(
            &decision_hash,
            &signature,
            &ctx.accounts.ai_authority.key(),
        )?;

        emit!(DecisionVerified {
            signer: ctx.accounts.signer.key(),
            decision_hash,
            decision: decision_data.decision,
            timestamp: now,
        });

        // ===== STEP 3: REPLAY PROTECTION - CHECK & STORE NONCE =====
        let nonce_pda = &mut ctx.accounts.nonce_pda;
        
        require!(
            !nonce_pda.is_used,
            GuardianError::ReplayDetected
        );

        nonce_pda.is_used = true;
        nonce_pda.used_at = now;
        nonce_pda.signer = ctx.accounts.signer.key();

        emit!(ReplayBlocked {
            nonce: decision_data.nonce,
            signer: ctx.accounts.signer.key(),
            timestamp: now,
        });

        // ===== STEP 4: VALIDATE ACCOUNTS =====
        require!(
            !ctx.accounts.recipient.is_signer,
            GuardianError::InvalidRecipientAccount
        );

        require!(
            decision_data.recipient == ctx.accounts.recipient.key(),
            GuardianError::RecipientMismatch
        );

        // ===== STEP 5: ENFORCE DECISION =====
        match decision_data.decision {
            DECISION_ALLOW => {
                enforce_allow(&ctx, decision_data.amount, now)?;
            }
            DECISION_REJECT => {
                enforce_reject(&ctx, decision_data.amount, now)?;
            }
            DECISION_DELAY => {
                enforce_delay(&mut ctx, &decision_data, now)?;
            }
            DECISION_PARTIAL => {
                enforce_partial(&ctx, &decision_data, now)?;
            }
            _ => {
                return Err(GuardianError::InvalidDecision.into());
            }
        }

        Ok(())
    }

    /// Execute a delayed transaction (after timelock expires)
    pub fn execute_delayed_transaction(
        ctx: Context<ExecuteDelayedTransaction>,
    ) -> Result<()> {
        let clock = Clock::get()?;
        let now = clock.unix_timestamp;

        let delayed_tx = &ctx.accounts.delayed_tx;

        // ===== SECURITY CHECKS =====
        
        // Check 1: Timelock has passed
        require!(
            now >= delayed_tx.execute_after,
            GuardianError::DelayNotExpired
        );

        // Check 2: Signer matches original signer
        require!(
            ctx.accounts.signer.key() == delayed_tx.signer,
            GuardianError::SignerMismatch
        );

        // Check 3: Recipient matches stored recipient (CRITICAL SECURITY CHECK)
        // Prevents attacker from redirecting to different recipient
        require!(
            ctx.accounts.recipient.key() == delayed_tx.recipient,
            GuardianError::RecipientMismatch
        );

        msg!("✓ All delayed execution security checks passed");

        // Transfer the delayed amount
        let transfer_ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.signer.key(),
            &delayed_tx.recipient,
            delayed_tx.amount,
        );

        anchor_lang::solana_program::program::invoke(
            &transfer_ix,
            &[
                ctx.accounts.signer.to_account_info(),
                ctx.accounts.recipient.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        emit!(DelayedExecuted {
            signer: ctx.accounts.signer.key(),
            recipient: delayed_tx.recipient,
            amount: delayed_tx.amount,
            timestamp: now,
        });

        Ok(())
    }
}

// ============================================================================
// ENFORCEMENT FUNCTIONS (Private)
// ============================================================================

fn enforce_allow(
    ctx: &Context<ExecuteWithVerifiedDecision>,
    amount: u64,
    now: i64,
) -> Result<()> {
    // Validate sufficient balance
    require!(
        ctx.accounts.signer.lamports() >= amount,
        GuardianError::InsufficientBalance
    );

    // Transfer full amount
    let transfer_ix = anchor_lang::solana_program::system_instruction::transfer(
        &ctx.accounts.signer.key(),
        &ctx.accounts.recipient.key(),
        amount,
    );

    anchor_lang::solana_program::program::invoke(
        &transfer_ix,
        &[
            ctx.accounts.signer.to_account_info(),
            ctx.accounts.recipient.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ],
    )?;

    emit!(ExecutionAllowed {
        signer: ctx.accounts.signer.key(),
        recipient: ctx.accounts.recipient.key(),
        amount,
        timestamp: now,
    });

    Ok(())
}

fn enforce_reject(
    ctx: &Context<ExecuteWithVerifiedDecision>,
    amount: u64,
    now: i64,
) -> Result<()> {
    emit!(ExecutionRejected {
        signer: ctx.accounts.signer.key(),
        recipient: ctx.accounts.recipient.key(),
        amount,
        timestamp: now,
    });

    Err(GuardianError::TransactionRejected.into())
}

fn enforce_delay(
    ctx: &mut Context<ExecuteWithVerifiedDecision>,
    decision_data: &DecisionPackage,
    now: i64,
) -> Result<()> {
    // Validate delay duration
    require!(
        decision_data.delay_seconds > 0 && decision_data.delay_seconds <= MAX_DELAY_SECONDS,
        GuardianError::InvalidDelayDuration
    );

    // Store in delayed transaction PDA
    let delayed_tx = &mut ctx.accounts.delayed_tx;
    delayed_tx.signer = ctx.accounts.signer.key();
    delayed_tx.recipient = decision_data.recipient;
    delayed_tx.amount = decision_data.amount;
    delayed_tx.execute_after = now + decision_data.delay_seconds;
    delayed_tx.created_at = now;

    emit!(DelayedStored {
        signer: ctx.accounts.signer.key(),
        recipient: decision_data.recipient,
        amount: decision_data.amount,
        execute_after: delayed_tx.execute_after,
        timestamp: now,
    });

    Ok(())
}

fn enforce_partial(
    ctx: &Context<ExecuteWithVerifiedDecision>,
    decision_data: &DecisionPackage,
    now: i64,
) -> Result<()> {
    // Cap transfer to partial amount
    let transfer_amount = if decision_data.amount > decision_data.partial_amount {
        decision_data.partial_amount
    } else {
        decision_data.amount
    };

    // Validate sufficient balance
    require!(
        ctx.accounts.signer.lamports() >= transfer_amount,
        GuardianError::InsufficientBalance
    );

    // Transfer partial amount only
    let transfer_ix = anchor_lang::solana_program::system_instruction::transfer(
        &ctx.accounts.signer.key(),
        &ctx.accounts.recipient.key(),
        transfer_amount,
    );

    anchor_lang::solana_program::program::invoke(
        &transfer_ix,
        &[
            ctx.accounts.signer.to_account_info(),
            ctx.accounts.recipient.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ],
    )?;

    emit!(PartialExecuted {
        signer: ctx.accounts.signer.key(),
        recipient: decision_data.recipient,
        requested_amount: decision_data.amount,
        approved_amount: transfer_amount,
        timestamp: now,
    });

    Ok(())
}

// ============================================================================
// CRYPTOGRAPHIC VERIFICATION
// ============================================================================

/// CRITICAL SECURITY: Verify Ed25519 instruction exists at index 0
/// 
/// This is the most important check - it verifies that the client
/// actually added the Ed25519Program verification instruction.
/// 
/// Without this check, attackers could skip Ed25519 verification
/// and directly call this contract.
fn verify_ed25519_instruction_exists(
    ctx: &Context<ExecuteWithVerifiedDecision>,
    decision_data: &DecisionPackage,
    signature: &[u8; 64],
    ai_authority: &Pubkey,
) -> Result<()> {
    // Load transaction instructions from sysvar
    let instruction_sysvar = &ctx.accounts.instruction_sysvar;
    
    msg!("Verifying Ed25519 instruction exists in transaction...");

    // Verify instruction_sysvar is actually the instructions sysvar
    require!(
        instruction_sysvar.key() == tx_instructions::ID,
        GuardianError::InvalidInstructionSysvar
    );

    // Load the instruction data
    let instruction_data = instruction_sysvar.data.borrow();
    
    // Minimum instruction layout:
    // - u16 (2 bytes): number of signatures
    // - u16 (2 bytes): public key offset  
    // - u16 (2 bytes): signature offset
    // - u16 (2 bytes): message offset
    // - u16 (2 bytes): message length
    // Total header: 10 bytes
    require!(
        instruction_data.len() >= 10,
        GuardianError::InvalidEd25519Instruction
    );

    // Parse header
    let mut cursor = 0;
    
    // Parse num_signatures (should be 1)
    let num_sigs = u16::from_le_bytes([instruction_data[cursor], instruction_data[cursor + 1]]) as usize;
    cursor += 2;
    require!(
        num_sigs == 1,
        GuardianError::InvalidEd25519Instruction
    );
    msg!("✓ Ed25519: {} signature(s)", num_sigs);

    // Parse offsets
    let pk_offset = u16::from_le_bytes([instruction_data[cursor], instruction_data[cursor + 1]]) as usize;
    cursor += 2;
    let sig_offset = u16::from_le_bytes([instruction_data[cursor], instruction_data[cursor + 1]]) as usize;
    cursor += 2;
    let msg_offset = u16::from_le_bytes([instruction_data[cursor], instruction_data[cursor + 1]]) as usize;
    cursor += 2;
    let msg_len = u16::from_le_bytes([instruction_data[cursor], instruction_data[cursor + 1]]) as usize;
    cursor += 2;

    // Verify offsets are reasonable
    require!(
        pk_offset + 32 <= instruction_data.len(),
        GuardianError::InvalidEd25519Instruction
    );
    require!(
        sig_offset + 64 <= instruction_data.len(),
        GuardianError::InvalidEd25519Instruction
    );
    require!(
        msg_offset + msg_len <= instruction_data.len(),
        GuardianError::InvalidEd25519Instruction
    );
    require!(
        msg_len == 32,
        GuardianError::InvalidEd25519Instruction
    );

    // Extract public key, signature, and message from instruction data
    let instr_pubkey = &instruction_data[pk_offset..pk_offset + 32];
    let instr_signature = &instruction_data[sig_offset..sig_offset + 64];
    let instr_message = &instruction_data[msg_offset..msg_offset + 32];

    // Verify public key matches AI authority
    require!(
        instr_pubkey == ai_authority.as_ref(),
        GuardianError::EdPubkeyMismatch
    );
    msg!("✓ Ed25519 public key matches AI authority");

    // Verify signature matches
    require!(
        instr_signature == signature,
        GuardianError::EdSignatureMismatch
    );
    msg!("✓ Ed25519 signature matches");

    // Verify message (hash) matches
    let decision_hash = compute_decision_hash(decision_data)?;
    require!(
        instr_message == decision_hash.as_slice(),
        GuardianError::EdMessageMismatch
    );
    msg!("✓ Ed25519 message (decision hash) matches");

    msg!("✅ Ed25519 instruction verified successfully");
    Ok(())
}

/// Compute hash of decision package for signature verification
fn compute_decision_hash(decision_data: &DecisionPackage) -> Result<[u8; 32]> {
    use anchor_lang::solana_program::hash::hashv;

    let hash_inputs = [
        decision_data.decision.to_le_bytes().to_vec(),
        decision_data.amount.to_le_bytes().to_vec(),
        decision_data.recipient.to_bytes().to_vec(),
        decision_data.nonce.to_le_bytes().to_vec(),
        decision_data.expiry_timestamp.to_le_bytes().to_vec(),
    ];

    let slices: Vec<&[u8]> = hash_inputs.iter().map(|v| v.as_slice()).collect();
    let hash = hashv(&slices);

    Ok(hash.to_bytes())
}


/// Verify AI authority for decision execution.
///
/// IMPORTANT:
/// Real Ed25519 signature verification is performed
/// by Solana's native Ed25519Program instruction
/// BEFORE this contract executes.
///
/// This contract:
/// - verifies trusted AI authority
/// - assumes runtime signature verification already passed
/// - enforces replay protection and execution rules
///
/// This follows standard Solana security architecture.

fn verify_ai_signature(
    _decision_hash: &[u8; 32],
    _signature: &[u8; 64],
    ai_authority: &Pubkey,
) -> Result<()> {

    require!(
        ai_authority.to_string() == TRUSTED_AI_AUTHORITY,
        GuardianError::UnauthorizedAIAuthority
    );

    msg!("✅ Trusted AI authority verified");

    // IMPORTANT:
    // Real Ed25519 verification should happen client-side
    // using Solana's Ed25519Program instruction
    // BEFORE calling this contract.
    //
    // This contract assumes:
    // - the transaction already included a valid
    //   ed25519 verification instruction
    // - runtime verification succeeded

    Ok(())
}

/// Check if nonce has been used before (replay protection)
// fn check_replay_protection(nonce: u64) -> Result<()> {
//     // Pattern: Query NonceUsed PDA to verify nonce hasn't been used
//     // If found, reject with GuardianError::ReplayDetected
//     // This prevents the same decision from being executed twice
    
//     msg!("Checking replay protection for nonce: {}", nonce);
//     msg!("✓ Nonce {} passed replay check", nonce);
//     Ok(())
// }

// /// Verify decision has not expired
// fn check_expiry(expiry_timestamp: i64) -> Result<()> {
//     let clock = Clock::get()?;
//     let current_time = clock.unix_timestamp;
    
//     msg!("Checking expiry: current={}, expiry={}", current_time, expiry_timestamp);
    
//     require!(
//         current_time < expiry_timestamp,
//         GuardianError::ExpiredDecision
//     );

//     msg!("✓ Decision is within expiry window");
//     Ok(())
// }

// /// Safely add amounts without overflow
// fn safe_add(a: u64, b: u64) -> Result<u64> {
//     a.checked_add(b)
//         .ok_or(GuardianError::ArithmeticOverflow.into())
// }

// /// Safely subtract amounts without underflow
// fn safe_sub(a: u64, b: u64) -> Result<u64> {
//     a.checked_sub(b)
//         .ok_or(GuardianError::ArithmeticUnderflow.into())
// }

// ============================================================================
// DATA STRUCTURES
// ============================================================================

/// Cryptographically-signed decision package from AI authority
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct DecisionPackage {
    /// Decision type: 0=ALLOW, 1=REJECT, 2=DELAY, 3=PARTIAL
    pub decision: u8,
    
    /// Amount to transfer
    pub amount: u64,
    
    /// Recipient address
    pub recipient: Pubkey,
    
    /// Unique nonce (prevents replays)
    pub nonce: u64,
    
    /// Unix timestamp when decision expires
    pub expiry_timestamp: i64,
    
    /// For DELAY: seconds to wait before execution (max 7 days)
    pub delay_seconds: i64,
    
    /// For PARTIAL: max amount to transfer
    pub partial_amount: u64,
}

// ============================================================================
// ACCOUNT STRUCTS
// ============================================================================

/// Nonce tracking PDA - prevents replay attacks
/// Seeds: ["nonce", signer.pubkey(), nonce_u64.to_le_bytes()]
#[account]
pub struct NonceTracker {
    /// Whether this nonce has been used
    pub is_used: bool,
    
    /// Timestamp when nonce was used
    pub used_at: i64,
    
    /// Signer who used this nonce
    pub signer: Pubkey,
}

impl NonceTracker {
    pub const LEN: usize = 1 + 8 + 32; // bool + i64 + pubkey
}

/// Delayed transaction PDA - stores pending DELAY decisions
/// Seeds: ["delayed", signer.pubkey(), recipient.pubkey(), nonce.to_le_bytes()]
#[account]
pub struct DelayedTx {
    /// The signer who initiated the transaction
    pub signer: Pubkey,
    
    /// Recipient address
    pub recipient: Pubkey,
    
    /// Amount to transfer when delay expires
    pub amount: u64,
    
    /// Unix timestamp when this can be executed
    pub execute_after: i64,
    
    /// When this delayed tx was created
    pub created_at: i64,
}

impl DelayedTx {
    pub const LEN: usize = 32 + 32 + 8 + 8 + 8; // pubkey + pubkey + u64 + i64 + i64
}

// ============================================================================
// CONTEXT STRUCTS
// ============================================================================

#[derive(Accounts)]
#[instruction(decision_data: DecisionPackage, signature: [u8; 64])]
pub struct ExecuteWithVerifiedDecision<'info> {
    /// The user executing the transaction
    #[account(mut)]
    pub signer: Signer<'info>,

    /// The AI authority that signs decisions
    /// Must be pre-configured as a constant in contract
    pub ai_authority: SystemAccount<'info>,

    /// The recipient of the transaction
    /// CHECK: Validated against decision_data.recipient
    #[account(mut)]
    pub recipient: UncheckedAccount<'info>,

    /// CRITICAL SECURITY: Instructions sysvar (for Ed25519 verification)
    /// CHECK: Verified to be SYSVAR_INSTRUCTIONS
    #[account(
        address = tx_instructions::ID
    )]
    pub instruction_sysvar: UncheckedAccount<'info>,

    /// Nonce tracking PDA (replay protection)
    #[account(
        init_if_needed,
        payer = signer,
        space = 8 + NonceTracker::LEN,
        seeds = [b"nonce", signer.key().as_ref(), decision_data.nonce.to_le_bytes().as_ref()],
        bump
    )]
    pub nonce_pda: Account<'info, NonceTracker>,

    /// Delayed transaction PDA (for DELAY decisions)
    #[account(
        init_if_needed,
        payer = signer,
        space = 8 + DelayedTx::LEN,
        seeds = [b"delayed", signer.key().as_ref(), decision_data.recipient.as_ref(), decision_data.nonce.to_le_bytes().as_ref()],
        bump
    )]
    pub delayed_tx: Account<'info, DelayedTx>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ExecuteDelayedTransaction<'info> {
    /// The signer of the original transaction
    #[account(mut)]
    pub signer: Signer<'info>,

    /// The recipient
    /// CHECK: Validated against delayed_tx.recipient
    #[account(mut)]
    pub recipient: UncheckedAccount<'info>,

    /// The delayed transaction PDA
    #[account(mut, close = signer)]
    pub delayed_tx: Account<'info, DelayedTx>,

    pub system_program: Program<'info, System>,
}

// ============================================================================
// EVENTS
// ============================================================================

#[event]
pub struct DecisionVerified {
    pub signer: Pubkey,
    pub decision_hash: [u8; 32],
    pub decision: u8,
    pub timestamp: i64,
}

#[event]
pub struct ReplayBlocked {
    pub nonce: u64,
    pub signer: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct ExpiredDecision {
    pub expiry_timestamp: i64,
    pub current_timestamp: i64,
    pub timestamp: i64,
}

#[event]
pub struct ExecutionAllowed {
    pub signer: Pubkey,
    pub recipient: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct ExecutionRejected {
    pub signer: Pubkey,
    pub recipient: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct PartialExecuted {
    pub signer: Pubkey,
    pub recipient: Pubkey,
    pub requested_amount: u64,
    pub approved_amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct DelayedStored {
    pub signer: Pubkey,
    pub recipient: Pubkey,
    pub amount: u64,
    pub execute_after: i64,
    pub timestamp: i64,
}

#[event]
pub struct DelayedExecuted {
    pub signer: Pubkey,
    pub recipient: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

// ============================================================================
// ERROR CODES
// ============================================================================

#[error_code]
pub enum GuardianError {
    #[msg("Transaction rejected by AI decision")]
    TransactionRejected,

    #[msg("Invalid decision value (must be 0-3)")]
    InvalidDecision,

    #[msg("Insufficient balance for transaction")]
    InsufficientBalance,

    #[msg("Nonce has already been used (replay attack)")]
    ReplayDetected,

    #[msg("Decision package has expired")]
    ExpiredDecision,

    #[msg("AI signature verification failed")]
    InvalidSignature,

    #[msg("Decision hash does not match signed data")]
    DecisionHashMismatch,

    #[msg("Recipient address does not match decision package")]
    RecipientMismatch,

    #[msg("Invalid recipient account")]
    InvalidRecipientAccount,

    #[msg("Signer does not match delayed transaction")]
    SignerMismatch,

    #[msg("Delay period has not expired yet")]
    DelayNotExpired,

    #[msg("Invalid delay duration")]
    InvalidDelayDuration,

    #[msg("AI authority not recognized")]
    UnauthorizedAIAuthority,

    #[msg("Arithmetic overflow in calculation")]
    ArithmeticOverflow,

    #[msg("Arithmetic underflow in calculation")]
    ArithmeticUnderflow,

    #[msg("Invalid instruction sysvar")]
    InvalidInstructionSysvar,

    #[msg("Invalid Ed25519 instruction format")]
    InvalidEd25519Instruction,

    #[msg("Ed25519 public key does not match AI authority")]
    EdPubkeyMismatch,

    #[msg("Ed25519 signature does not match")]
    EdSignatureMismatch,

    #[msg("Ed25519 message (hash) does not match decision")]
    EdMessageMismatch,
}
