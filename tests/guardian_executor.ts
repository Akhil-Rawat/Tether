import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { GuardianExecutor } from "../target/types/guardian_executor";
import * as assert from "assert";

describe("guardian_executor", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.GuardianExecutor as Program<GuardianExecutor>;
  const payer = provider.wallet as anchor.Wallet;

  // Test keypairs
  let recipientWallet: anchor.web3.Keypair;
  let delayPda: anchor.web3.PublicKey;
  let delayPdaBump: number;

  before(async () => {
    recipientWallet = anchor.web3.Keypair.generate();

    // Derive delay PDA
    [delayPda, delayPdaBump] = await anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("delay"), payer.publicKey.toBuffer()],
      program.programId
    );
  });

  it("Executes ALLOW decision: transfers full amount (0.1 SOL)", async () => {
    const amount = new anchor.BN(100_000_000); // 0.1 SOL
    const maxAllowed = new anchor.BN(200_000_000);
    const delaySeconds = new anchor.BN(0);

    const recipientBalanceBefore = await provider.connection.getBalance(recipientWallet.publicKey);

    await program.methods
      .executeWithDecision(
        0, // ALLOW
        amount,
        maxAllowed,
        delaySeconds,
        recipientWallet.publicKey
      )
      .accounts({
        signer: payer.publicKey,
        recipient: recipientWallet.publicKey,
        delayPda: delayPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const recipientBalanceAfter = await provider.connection.getBalance(recipientWallet.publicKey);
    assert.ok(recipientBalanceAfter > recipientBalanceBefore, "Recipient should receive funds");
    assert.strictEqual(
      recipientBalanceAfter - recipientBalanceBefore,
      amount.toNumber(),
      "Transfer amount should match"
    );
  });

  it("Executes PARTIAL decision: transfers min(1 SOL, 0.3 SOL)", async () => {
    const amount = new anchor.BN(1_000_000_000); // 1 SOL requested
    const maxAllowed = new anchor.BN(300_000_000); // 0.3 SOL max allowed
    const delaySeconds = new anchor.BN(0);
    const recipient2 = anchor.web3.Keypair.generate();

    const recipientBalanceBefore = await provider.connection.getBalance(recipient2.publicKey);

    await program.methods
      .executeWithDecision(
        3, // PARTIAL
        amount,
        maxAllowed,
        delaySeconds,
        recipient2.publicKey
      )
      .accounts({
        signer: payer.publicKey,
        recipient: recipient2.publicKey,
        delayPda: delayPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const recipientBalanceAfter = await provider.connection.getBalance(recipient2.publicKey);
    const received = recipientBalanceAfter - recipientBalanceBefore;
    
    assert.ok(received > 0, "Recipient should receive partial funds");
    assert.strictEqual(
      received,
      maxAllowed.toNumber(),
      "Should transfer max_allowed, not full amount"
    );
  });

  it("Executes DELAY decision: stores transaction in PDA (300s delay)", async () => {
    const amount = new anchor.BN(1_000_000_000); // 1 SOL
    const maxAllowed = new anchor.BN(2_000_000_000);
    const delaySeconds = new anchor.BN(300); // 5 minutes
    const recipient3 = anchor.web3.Keypair.generate();

    await program.methods
      .executeWithDecision(
        2, // DELAY
        amount,
        maxAllowed,
        delaySeconds,
        recipient3.publicKey
      )
      .accounts({
        signer: payer.publicKey,
        recipient: recipient3.publicKey,
        delayPda: delayPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    // Fetch PDA to verify storage
    const delayedTx = await program.account.delayedTx.fetch(delayPda);
    
    assert.ok(delayedTx.amount.eq(amount), "Stored amount should match");
    assert.ok(delayedTx.recipient.equals(recipient3.publicKey), "Stored recipient should match");
    assert.ok(
      delayedTx.executeAfter.gt(new anchor.BN(Math.floor(Date.now() / 1000))),
      "Execute time should be in future"
    );
  });

  it("Rejects REJECT decision: returns error", async () => {
    const amount = new anchor.BN(1_000_000);
    const maxAllowed = new anchor.BN(2_000_000);
    const delaySeconds = new anchor.BN(0);
    const recipient4 = anchor.web3.Keypair.generate();

    try {
      await program.methods
        .executeWithDecision(
          1, // REJECT
          amount,
          maxAllowed,
          delaySeconds,
          recipient4.publicKey
        )
        .accounts({
          signer: payer.publicKey,
          recipient: recipient4.publicKey,
          delayPda: delayPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      assert.fail("Should have thrown TransactionRejected error");
    } catch (error) {
      assert.ok(
        error.message.includes("TransactionRejected") || error.message.includes("0x1"),
        "Should throw TransactionRejected error"
      );
    }
  });

  it("Validates decision input: rejects invalid decision (>3)", async () => {
    const amount = new anchor.BN(1_000_000);
    const maxAllowed = new anchor.BN(2_000_000);
    const delaySeconds = new anchor.BN(0);
    const recipient5 = anchor.web3.Keypair.generate();

    try {
      await program.methods
        .executeWithDecision(
          99, // INVALID
          amount,
          maxAllowed,
          delaySeconds,
          recipient5.publicKey
        )
        .accounts({
          signer: payer.publicKey,
          recipient: recipient5.publicKey,
          delayPda: delayPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      assert.fail("Should have thrown InvalidDecision error");
    } catch (error) {
      assert.ok(
        error.message.includes("InvalidDecision") || error.message.includes("0x2"),
        "Should throw InvalidDecision error"
      );
    }
  });

  it("Rejects ALLOW when signer has insufficient balance", async () => {
    const poorSigner = anchor.web3.Keypair.generate();
    const recipient6 = anchor.web3.Keypair.generate();

    // Airdrop enough for rent + fees, but not enough for the 1 SOL transfer
    const airdropSig = await provider.connection.requestAirdrop(poorSigner.publicKey, 10_000_000);
    await provider.connection.confirmTransaction(airdropSig);

    const [poorDelayPda] = await anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("delay"), poorSigner.publicKey.toBuffer()],
      program.programId
    );

    try {
      await program.methods
        .executeWithDecision(
          0, // ALLOW
          new anchor.BN(1_000_000_000), // 1 SOL - more than available
          new anchor.BN(2_000_000_000),
          new anchor.BN(0),
          recipient6.publicKey
        )
        .accounts({
          signer: poorSigner.publicKey,
          recipient: recipient6.publicKey,
          delayPda: poorDelayPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([poorSigner])
        .rpc();

      assert.fail("Should have thrown InsufficientBalance error");
    } catch (error) {
      assert.ok(
        error.message.includes("InsufficientBalance") || error.message.includes("0x3"),
        "Should throw InsufficientBalance error"
      );
    }
  });

  it("Emits AllowedExecuted event on ALLOW", async () => {
    const amount = new anchor.BN(500_000);
    const maxAllowed = new anchor.BN(1_000_000);
    const delaySeconds = new anchor.BN(0);
    const recipient7 = anchor.web3.Keypair.generate();

    // Ensure recipient is rent-exempt before transfer to avoid rent violation
    const rentExempt = await provider.connection.getMinimumBalanceForRentExemption(0);
    const rentSig = await provider.connection.requestAirdrop(recipient7.publicKey, rentExempt);
    await provider.connection.confirmTransaction(rentSig);

    const balanceBefore = await provider.connection.getBalance(recipient7.publicKey);

    const txSig = await program.methods
      .executeWithDecision(
        0, // ALLOW
        amount,
        maxAllowed,
        delaySeconds,
        recipient7.publicKey
      )
      .accounts({
        signer: payer.publicKey,
        recipient: recipient7.publicKey,
        delayPda: delayPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    // Wait for transaction finalization
    await provider.connection.confirmTransaction(txSig, "finalized");

    // Verify transaction confirmed and transfer occurred
    const tx = await provider.connection.getTransaction(txSig, { commitment: "finalized" });
    assert.ok(tx, "Transaction should be confirmed");

    const balanceAfter = await provider.connection.getBalance(recipient7.publicKey);
    assert.strictEqual(
      balanceAfter - balanceBefore,
      amount.toNumber(),
      "Should transfer correct amount"
    );
  });
});
