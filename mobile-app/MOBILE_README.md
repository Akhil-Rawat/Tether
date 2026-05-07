# Guardian Mobile App - React Native

Production-ready mobile interface for Guardian Executor with dark modern security-focused aesthetic.

## Architecture

```
src/
├── screens/           # All app screens
│   ├── HomeScreen.tsx         # Dashboard with transaction history
│   ├── SendScreen.tsx         # Input form for new transaction
│   ├── AnalysisScreen.tsx     # Hero screen with AI analysis & decision
│   ├── DelayScreen.tsx        # Timelock configuration
│   └── PartialApprovalScreen.tsx # Amount slider for partial approvals
├── components/        # Reusable UI components
│   ├── Button.tsx             # Variant button (primary, secondary, success, error, warning, partial)
│   ├── Card.tsx               # Surface container
│   ├── ScoreBar.tsx           # Visual score representation
│   ├── DecisionBadge.tsx      # Decision type display (ALLOW, REJECT, DELAY, PARTIAL)
│   ├── SafeAreaWrapper.tsx    # Consistent safe area with padding
│   └── index.ts               # Centralized exports
├── navigation/        # React Navigation setup
│   └── AppNavigator.tsx       # Native Stack navigator with routes
├── store/            # State management
│   └── transactionStore.ts    # Zustand store for transactions
├── types/            # TypeScript definitions
│   └── index.ts               # All types and enums
├── themes/           # Design system
│   └── index.ts               # Colors, typography, spacing, shadows
├── mocks/            # Mock data generators
│   └── analysisData.ts        # Simulated AI analysis responses
└── utils/            # Helper functions
    └── index.ts               # Formatting, validation utilities
```

## Tech Stack

- **Expo** - React Native framework
- **React Navigation** - Native stack navigation
- **TypeScript** - Type safety
- **Zustand** - State management
- **Dark Modern Theme** - Security-focused aesthetic

## Screen Flows

### Main Flow: Send → Analyze → Decide

```
Home Screen
    ↓
Send Screen (enter recipient, amount)
    ↓
Analysis Screen (AI decision, risk scores) [HERO SCREEN]
    ├→ ALLOW: Approve & Send (→ Home)
    ├→ REJECT: Block & Warn (→ Home)
    ├→ DELAY: Timelock (→ Delay Screen → Home)
    └→ PARTIAL: Amount Slider (→ Partial Approval Screen → Home)

History: Home Screen shows recent transactions (clickable → Analysis Screen)
```

## Features

### HomeScreen
- ✅ Welcome header with lock icon
- ✅ Quick stats (total protected, blocked, delayed)
- ✅ Send Transaction button
- ✅ Recent activity feed with decision badges
- ✅ Transaction history navigation

### SendScreen
- ✅ Recipient address input (with paste support)
- ✅ Amount input (decimal support)
- ✅ Validation (address format, positive amount)
- ✅ Error handling with user feedback
- ✅ Loading state during analysis

### AnalysisScreen (Hero Screen)
- ✅ Large decision badge (✓ ✕ ⏱ ◐)
- ✅ Decision title & explanation
- ✅ Transaction summary (amount, recipient)
- ✅ Risk score breakdown (confidence, risk, deviation, impact)
- ✅ AI reasoning explanation
- ✅ Risk factors list
- ✅ Behavior analysis
- ✅ Decision-specific action buttons

### DelayScreen
- ✅ Transaction summary
- ✅ 5 timelock options (1h, 6h, 24h, 3d, 7d)
- ✅ Execution time preview
- ✅ Risk assessment scores
- ✅ Confirm/Cancel buttons

### PartialApprovalScreen
- ✅ Requested vs approved amount display
- ✅ Interactive slider for amount adjustment
- ✅ Remaining amount calculation
- ✅ Recipient display
- ✅ Risk profile assessment
- ✅ Confirm/Cancel buttons

## Components

### Button
Multiple variants for different contexts:
- `primary` - Main CTAs (blue)
- `secondary` - Alternative actions (muted)
- `success` - ALLOW decision (green)
- `error` - REJECT decision (red)
- `warning` - DELAY decision (orange)
- `partial` - PARTIAL decision (brown)

Sizes: `sm`, `md`, `lg`

### Card
Reusable surface containers:
- `default` - Standard card
- `elevated` - With shadow
- `surface` - Light surface variant

### ScoreBar
Visual representation of 0-100 scores with auto-coloring based on value.

### DecisionBadge
Large decision display with icon and label. Sizes: `sm`, `md`, `lg`.

### SafeAreaWrapper
Consistent safe area handling with optional scrolling.

## Zustand Store

Transaction store with actions:
- `startNewTransaction(recipient, amount)` - Create new transaction
- `analyzeTransaction(transaction)` - Simulate AI analysis (2s delay)
- `confirmDecision(decision)` - Save to history
- `clearError()` - Clear error state
- `reset()` - Reset all state

## Mocked Data

`getMockAnalysis(transaction)` generates realistic analysis:
- Decision based on recipient & amount
- Risk-appropriate scores
- AI reasoning explanation
- Risk factor list
- Behavior analysis

Decision logic:
- **ALLOW**: Known recipient, small amount (<10 SOL)
- **PARTIAL**: Known recipient, medium amount (10-50 SOL)
- **DELAY**: Unknown recipient, small amount (<5 SOL)
- **REJECT**: Everything else

## Theme

Dark modern palette with security focus:
- Background: `#0A0E27` (very dark)
- Surface: `#1A1F3A` (lighter)
- Primary: `#0066FF` (Solana blue)
- Success: `#00D944` (green)
- Warning: `#FFB84D` (orange)
- Error: `#FF3B30` (red)
- Partial: `#A2845E` (brown)

Typography follows Apple-like minimalism with clear hierarchy.

## Running the App

```bash
# Install dependencies
npm install

# Start Expo dev server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android

# Run on web
npm run web
```

## Current Status

✅ All screens implemented
✅ Full navigation flow working
✅ Mocked analysis data
✅ Zustand store configured
✅ Dark modern theme applied
✅ All 5 decision types supported
✅ TypeScript throughout

## TODO (Next Phase)

- [ ] Integrate guardianClient.ts for real signing
- [ ] Connect to actual Solana RPC
- [ ] Real transaction analysis (not mocked)
- [ ] Wallet integration (phantom, solflare)
- [ ] Transaction history persistence
- [ ] Push notifications
- [ ] Biometric authentication
- [ ] Transaction QR code scanning
- [ ] Deep linking from notifications
- [ ] Animation polish

## Notes

**No blockchain integration yet** - All responses are mocked for UI/UX validation.

**Mobile-first design** - Optimized for touch, readable in direct sunlight.

**Security-focused** - Visual language emphasizes protection and control.

**Minimal Apple-like** - Clean, spacious, focused on key information.
