#!/bin/bash

# Local Testing Script for guardian_executor
# This runs tests against a local Solana validator with unlimited lamports

set -e

echo "🔧 Guardian Executor - Local Test Setup"
echo "======================================"
echo ""

# Check if solana-test-validator is available
if ! command -v solana-test-validator &> /dev/null; then
    echo "❌ Error: solana-test-validator not found"
    echo "Install Solana CLI: https://docs.solana.com/cli/install-the-solana-tool-suite"
    exit 1
fi

# Check if anchor is available
if ! command -v anchor &> /dev/null; then
    echo "❌ Error: anchor not found"
    echo "Install Anchor: cargo install --git https://github.com/coral-xyz/anchor"
    exit 1
fi

ANCHOR_VERSION=$(anchor --version | awk '{print $2}')
if [[ "$ANCHOR_VERSION" == 0.29.* ]]; then
    echo "❌ Error: Anchor ${ANCHOR_VERSION} is incompatible with Solana 3.x (cargo build-sbf)"
    echo "Upgrade Anchor: cargo install --git https://github.com/coral-xyz/anchor --tag v0.30.1 anchor-cli --locked"
    exit 1
fi

echo "✅ Prerequisites check passed"
echo ""
echo "📦 Installing dependencies..."
yarn install --quiet 2>/dev/null || npm install --quiet

echo ""
echo "🔨 Building program..."
anchor build

echo ""
echo "🧪 Running tests on localnet..."
echo "    (This will start a local validator automatically)"
echo ""

# Run tests - anchor test handles validator setup
anchor test

echo ""
echo "✅ All tests passed!"
echo ""
echo "Your 1 SOL is safe - all tests ran on localnet with unlimited lamports"
