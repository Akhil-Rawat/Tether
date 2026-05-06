#!/bin/bash

# QVAC Transaction Decision Engine - Setup Script

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║   QVAC LOCAL Transaction Decision Engine - Setup              ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Check Node.js version
echo "✓ Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 22 ]; then
    echo "❌ Node.js 22.17+ required (you have v$(node -v))"
    exit 1
fi
echo "  ✓ Node.js $(node -v) detected"
echo ""

# Check npm
echo "✓ Checking npm..."
echo "  ✓ npm $(npm -v) detected"
echo ""

# Install dependencies
echo "✓ Installing dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "❌ npm install failed"
    exit 1
fi
echo "  ✓ Dependencies installed"
echo ""

# Check Vulkan (Linux/Windows)
if command -v vulkaninfo &> /dev/null; then
    echo "✓ Vulkan runtime detected"
    echo "  ✓ GPU acceleration available"
else
    echo "⚠ Vulkan not detected (GPU acceleration unavailable)"
    echo "  • Install: sudo apt install libvulkan1 mesa-vulkan-drivers"
fi
echo ""

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║              Setup Complete! Ready to Run                      ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo ""
echo "  1. Start the decision engine:"
echo "     npm start"
echo ""
echo "  2. Or run with direct node:"
echo "     node decisionEngine.js"
echo ""
echo "  3. First run will download models (~500MB total)"
echo "     Models are cached in ~/.qvac/models/"
echo ""
echo "For more info, see README.md"
echo ""
