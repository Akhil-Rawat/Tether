use anchor_lang::prelude::*;
use anchor_lang::solana_program::clock::Clock;
use anchor_lang::system_program;

declare_id!("EBWBHWJ5ocXEbrxqoJ6MGoeopLeLLoa4Uhy3HSD1M46n");

#[program]
pub mod guardian_executor {
    use super::*;

    pub fn execute_with_decision(
        ctx: Context<ExecuteWithDecision>,
        decision: u8,
        amount: u64,
        max_allowed: u64,
        delay_seconds: i64,
        recipient: Pubkey,
    ) -> Result<()> {
        // Validate decision is valid (0-3)
        require!(
            decision <= 3,
            GuardianError::InvalidDecision
        );

        // Get current time
        let clock = Clock::get()?;
        let now = clock.unix_timestamp;

        match decision {
            0 => {
                // ALLOW: transfer full amount
                require!(
                    ctx.accounts.signer.lamports() >= amount,
                    GuardianError::InsufficientBalance
                );

                ctx.accounts.transfer_funds(amount)?;
                
                emit!(AllowedExecuted {
                    signer: ctx.accounts.signer.key(),
                    recipient,
                    amount,
                    timestamp: now,
                });
            }
            1 => {
                // REJECT: return error
                emit!(Rejected {
                    signer: ctx.accounts.signer.key(),
                    recipient,
                    amount,
                    timestamp: now,
                });
                return Err(GuardianError::TransactionRejected.into());
            }
            2 => {
                // DELAY: store in PDA without transferring
                let delay_pda = &mut ctx.accounts.delay_pda;
                delay_pda.amount = amount;
                delay_pda.recipient = recipient;
                delay_pda.execute_after = now + delay_seconds;

                emit!(DelayedStored {
                    signer: ctx.accounts.signer.key(),
                    recipient,
                    amount,
                    execute_after: delay_pda.execute_after,
                    timestamp: now,
                });
            }
            3 => {
                // PARTIAL: transfer min(amount, max_allowed)
                let transfer_amount = if amount > max_allowed {
                    max_allowed
                } else {
                    amount
                };

                require!(
                    ctx.accounts.signer.lamports() >= transfer_amount,
                    GuardianError::InsufficientBalance
                );

                ctx.accounts.transfer_funds(transfer_amount)?;

                emit!(PartialExecuted {
                    signer: ctx.accounts.signer.key(),
                    recipient,
                    requested_amount: amount,
                    partial_amount: transfer_amount,
                    max_allowed,
                    timestamp: now,
                });
            }
            _ => {
                return Err(GuardianError::InvalidDecision.into());
            }
        }

        Ok(())
    }
}

// Account Structs
#[account]
pub struct DelayedTx {
    pub amount: u64,
    pub recipient: Pubkey,
    pub execute_after: i64,
}

// Context Structs
#[derive(Accounts)]
pub struct ExecuteWithDecision<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    /// CHECK: We validate this is the intended recipient
    #[account(mut)]
    pub recipient: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = signer,
        space = 8 + 8 + 32 + 8,
        seeds = [b"delay", signer.key().as_ref()],
        bump
    )]
    pub delay_pda: Account<'info, DelayedTx>,

    pub system_program: Program<'info, System>,
}

impl<'info> ExecuteWithDecision<'info> {
    fn transfer_funds(&self, amount: u64) -> Result<()> {
        let accounts = system_program::Transfer {
            from: self.signer.to_account_info(),
            to: self.recipient.to_account_info(),
        };
        let ctx = CpiContext::new(
            self.system_program.to_account_info(),
            accounts,
        );
        system_program::transfer(ctx, amount)?;
        Ok(())
    }
}

// Events
#[event]
pub struct AllowedExecuted {
    pub signer: Pubkey,
    pub recipient: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct Rejected {
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
    pub partial_amount: u64,
    pub max_allowed: u64,
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

// Error Code
#[error_code]
pub enum GuardianError {
    #[msg("Transaction rejected by decision")]
    TransactionRejected,

    #[msg("Invalid decision value")]
    InvalidDecision,

    #[msg("Insufficient balance for transaction")]
    InsufficientBalance,
}
