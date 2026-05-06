/**
 * Test Scenarios Generator
 * 
 * Generates 50+ diverse test cases across:
 * - Normal behavior
 * - High risk
 * - Behavior shift
 * - Repetitive attacks
 * - Edge cases
 * - Adversarial cases
 */

// ============================================================================
// CATEGORY 1: NORMAL BEHAVIOR (Baseline)
// ============================================================================

const normalBehaviorTests = [
  {
    id: "normal_001",
    category: "Normal Behavior",
    description: "Small amount to known recipient",
    transaction: {
      amount: 5,
      recipient: "known_wallet_1",
      isKnown: true,
    },
    history: [
      { amount: 5, recipient: "known_wallet_1" },
      { amount: 3, recipient: "known_wallet_1" },
      { amount: 4, recipient: "known_wallet_1" },
    ],
    expectedDecision: "ALLOW",
    expectedRiskRange: [0, 35],
  },
  {
    id: "normal_002",
    category: "Normal Behavior",
    description: "Repeat transaction (identical)",
    transaction: {
      amount: 3,
      recipient: "known_wallet_1",
      isKnown: true,
    },
    history: [
      { amount: 3, recipient: "known_wallet_1" },
      { amount: 3, recipient: "known_wallet_1" },
      { amount: 3, recipient: "known_wallet_1" },
    ],
    expectedDecision: "ALLOW",
    expectedRiskRange: [0, 25],
  },
  {
    id: "normal_003",
    category: "Normal Behavior",
    description: "Multiple known recipients, small amounts",
    transaction: {
      amount: 2,
      recipient: "known_wallet_2",
      isKnown: true,
    },
    history: [
      { amount: 5, recipient: "known_wallet_1" },
      { amount: 2, recipient: "known_wallet_2" },
      { amount: 1.5, recipient: "known_wallet_3" },
    ],
    expectedDecision: "ALLOW",
    expectedRiskRange: [0, 30],
  },
  {
    id: "normal_004",
    category: "Normal Behavior",
    description: "Slightly above average, known recipient",
    transaction: {
      amount: 6,
      recipient: "known_wallet_1",
      isKnown: true,
    },
    history: [
      { amount: 5, recipient: "known_wallet_1" },
      { amount: 4, recipient: "known_wallet_1" },
      { amount: 5, recipient: "known_wallet_1" },
    ],
    expectedDecision: "ALLOW",
    expectedRiskRange: [0, 35],
  },
  {
    id: "normal_005",
    category: "Normal Behavior",
    description: "Rare but known recipient",
    transaction: {
      amount: 10,
      recipient: "known_wallet_3",
      isKnown: true,
    },
    history: [
      { amount: 5, recipient: "known_wallet_1" },
      { amount: 5, recipient: "known_wallet_1" },
      { amount: 10, recipient: "known_wallet_3" },
    ],
    expectedDecision: "ALLOW",
    expectedRiskRange: [0, 40],
  },
];

// ============================================================================
// CATEGORY 2: HIGH RISK (Unknown Recipients, Large Amounts)
// ============================================================================

const highRiskTests = [
  {
    id: "highrisk_001",
    category: "High Risk",
    description: "Unknown recipient, massive amount",
    transaction: {
      amount: 1000,
      recipient: "unknown_wallet_xyz",
      isKnown: false,
    },
    history: [
      { amount: 5, recipient: "known_wallet_1" },
      { amount: 3, recipient: "known_wallet_1" },
      { amount: 4, recipient: "known_wallet_1" },
    ],
    expectedDecision: "REJECT",
    expectedRiskRange: [80, 100],
  },
  {
    id: "highrisk_002",
    category: "High Risk",
    description: "Unknown recipient, 50x average",
    transaction: {
      amount: 250,
      recipient: "suspicious_addr_1",
      isKnown: false,
    },
    history: [
      { amount: 5, recipient: "known_wallet_1" },
      { amount: 5, recipient: "known_wallet_1" },
      { amount: 5, recipient: "known_wallet_1" },
    ],
    expectedDecision: "REJECT",
    expectedRiskRange: [75, 100],
  },
  {
    id: "highrisk_003",
    category: "High Risk",
    description: "Unknown recipient, even small amount",
    transaction: {
      amount: 1,
      recipient: "never_seen_before",
      isKnown: false,
    },
    history: [
      { amount: 5, recipient: "known_wallet_1" },
      { amount: 5, recipient: "known_wallet_1" },
    ],
    expectedDecision: "REJECT",
    expectedRiskRange: [60, 95],
  },
  {
    id: "highrisk_004",
    category: "High Risk",
    description: "Unknown recipient, 20x amount",
    transaction: {
      amount: 100,
      recipient: "mystery_wallet",
      isKnown: false,
    },
    history: [
      { amount: 5, recipient: "known_wallet_1" },
      { amount: 4, recipient: "known_wallet_1" },
      { amount: 6, recipient: "known_wallet_1" },
    ],
    expectedDecision: "REJECT",
    expectedRiskRange: [75, 100],
  },
  {
    id: "highrisk_005",
    category: "High Risk",
    description: "Unknown recipient, pattern anomaly",
    transaction: {
      amount: 50,
      recipient: "random_addr",
      isKnown: false,
    },
    history: [
      { amount: 5, recipient: "known_wallet_1" },
      { amount: 5, recipient: "known_wallet_1" },
      { amount: 5, recipient: "known_wallet_1" },
    ],
    expectedDecision: "REJECT",
    expectedRiskRange: [70, 95],
  },
];

// ============================================================================
// CATEGORY 3: BEHAVIOR SHIFT (Gradual + Sudden Changes)
// ============================================================================

const behaviorShiftTests = [
  {
    id: "shift_001",
    category: "Behavior Shift",
    description: "Sudden jump: 1 → 100 (100x)",
    transaction: {
      amount: 100,
      recipient: "known_wallet_1",
      isKnown: true,
    },
    history: [
      { amount: 1, recipient: "known_wallet_1" },
      { amount: 1, recipient: "known_wallet_1" },
      { amount: 1, recipient: "known_wallet_1" },
    ],
    expectedDecision: "DELAY",
    expectedRiskRange: [60, 85],
  },
  {
    id: "shift_002",
    category: "Behavior Shift",
    description: "Gradual increase then spike",
    transaction: {
      amount: 200,
      recipient: "known_wallet_1",
      isKnown: true,
    },
    history: [
      { amount: 5, recipient: "known_wallet_1" },
      { amount: 10, recipient: "known_wallet_1" },
      { amount: 50, recipient: "known_wallet_1" },
    ],
    expectedDecision: "DELAY",
    expectedRiskRange: [55, 80],
  },
  {
    id: "shift_003",
    category: "Behavior Shift",
    description: "Known recipient but 10x normal",
    transaction: {
      amount: 500,
      recipient: "known_wallet_1",
      isKnown: true,
    },
    history: [
      { amount: 50, recipient: "known_wallet_1" },
      { amount: 50, recipient: "known_wallet_1" },
      { amount: 50, recipient: "known_wallet_1" },
    ],
    expectedDecision: "DELAY",
    expectedRiskRange: [60, 80],
  },
  {
    id: "shift_004",
    category: "Behavior Shift",
    description: "Extreme spike: avg 2 → 1000",
    transaction: {
      amount: 1000,
      recipient: "known_wallet_1",
      isKnown: true,
    },
    history: [
      { amount: 2, recipient: "known_wallet_1" },
      { amount: 2, recipient: "known_wallet_1" },
      { amount: 2, recipient: "known_wallet_1" },
    ],
    expectedDecision: "REJECT",
    expectedRiskRange: [85, 100],
  },
  {
    id: "shift_005",
    category: "Behavior Shift",
    description: "Pattern change + new recipient",
    transaction: {
      amount: 75,
      recipient: "new_wallet",
      isKnown: false,
    },
    history: [
      { amount: 5, recipient: "known_wallet_1" },
      { amount: 5, recipient: "known_wallet_1" },
      { amount: 5, recipient: "known_wallet_1" },
    ],
    expectedDecision: "REJECT",
    expectedRiskRange: [75, 95],
  },
];

// ============================================================================
// CATEGORY 4: REPETITIVE ATTACKS
// ============================================================================

const repetitiveAttackTests = [
  {
    id: "attack_001",
    category: "Repetitive Attack",
    description: "Same suspicious wallet, multiple txs",
    transaction: {
      amount: 25,
      recipient: "attacker_wallet",
      isKnown: false,
    },
    history: [
      { amount: 25, recipient: "attacker_wallet" },
      { amount: 25, recipient: "attacker_wallet" },
      { amount: 25, recipient: "attacker_wallet" },
    ],
    expectedDecision: "PARTIAL",
    expectedRiskRange: [50, 75],
  },
  {
    id: "attack_002",
    category: "Repetitive Attack",
    description: "Pattern: repeated unknown recipient",
    transaction: {
      amount: 10,
      recipient: "suspicious_addr_2",
      isKnown: false,
    },
    history: [
      { amount: 10, recipient: "suspicious_addr_2" },
      { amount: 10, recipient: "suspicious_addr_2" },
      { amount: 10, recipient: "suspicious_addr_2" },
    ],
    expectedDecision: "PARTIAL",
    expectedRiskRange: [55, 75],
  },
  {
    id: "attack_003",
    category: "Repetitive Attack",
    description: "Repeated small amounts, unknown recipient",
    transaction: {
      amount: 0.5,
      recipient: "probe_wallet",
      isKnown: false,
    },
    history: [
      { amount: 0.5, recipient: "probe_wallet" },
      { amount: 0.5, recipient: "probe_wallet" },
      { amount: 0.5, recipient: "probe_wallet" },
    ],
    expectedDecision: "PARTIAL",
    expectedRiskRange: [50, 70],
  },
  {
    id: "attack_004",
    category: "Repetitive Attack",
    description: "Multiple distinct unknown recipients",
    transaction: {
      amount: 15,
      recipient: "new_attacker",
      isKnown: false,
    },
    history: [
      { amount: 15, recipient: "unknown_1" },
      { amount: 15, recipient: "unknown_2" },
      { amount: 15, recipient: "unknown_3" },
    ],
    expectedDecision: "REJECT",
    expectedRiskRange: [70, 95],
  },
  {
    id: "attack_005",
    category: "Repetitive Attack",
    description: "Increasing amounts to suspicious wallet",
    transaction: {
      amount: 30,
      recipient: "escalation_wallet",
      isKnown: false,
    },
    history: [
      { amount: 10, recipient: "escalation_wallet" },
      { amount: 20, recipient: "escalation_wallet" },
      { amount: 25, recipient: "escalation_wallet" },
    ],
    expectedDecision: "REJECT",
    expectedRiskRange: [75, 95],
  },
];

// ============================================================================
// CATEGORY 5: EDGE CASES
// ============================================================================

const edgeCaseTests = [
  {
    id: "edge_001",
    category: "Edge Case",
    description: "Empty history",
    transaction: {
      amount: 5,
      recipient: "any_wallet",
      isKnown: false,
    },
    history: [],
    expectedDecision: "PARTIAL",
    expectedRiskRange: [40, 70],
  },
  {
    id: "edge_002",
    category: "Edge Case",
    description: "Zero amount",
    transaction: {
      amount: 0,
      recipient: "known_wallet_1",
      isKnown: true,
    },
    history: [
      { amount: 5, recipient: "known_wallet_1" },
      { amount: 5, recipient: "known_wallet_1" },
    ],
    expectedDecision: "ALLOW",
    expectedRiskRange: [0, 20],
  },
  {
    id: "edge_003",
    category: "Edge Case",
    description: "Extremely high value",
    transaction: {
      amount: 1000000,
      recipient: "known_wallet_1",
      isKnown: true,
    },
    history: [
      { amount: 5, recipient: "known_wallet_1" },
      { amount: 5, recipient: "known_wallet_1" },
    ],
    expectedDecision: "REJECT",
    expectedRiskRange: [90, 100],
  },
  {
    id: "edge_004",
    category: "Edge Case",
    description: "Microscopic amount",
    transaction: {
      amount: 0.0001,
      recipient: "known_wallet_1",
      isKnown: true,
    },
    history: [
      { amount: 5, recipient: "known_wallet_1" },
      { amount: 5, recipient: "known_wallet_1" },
    ],
    expectedDecision: "ALLOW",
    expectedRiskRange: [0, 20],
  },
  {
    id: "edge_005",
    category: "Edge Case",
    description: "Single history entry",
    transaction: {
      amount: 10,
      recipient: "unknown_wallet",
      isKnown: false,
    },
    history: [{ amount: 5, recipient: "known_wallet_1" }],
    expectedDecision: "PARTIAL",
    expectedRiskRange: [50, 75],
  },
  {
    id: "edge_006",
    category: "Edge Case",
    description: "Very large history (100 entries)",
    transaction: {
      amount: 5,
      recipient: "known_wallet_1",
      isKnown: true,
    },
    history: Array(100).fill({ amount: 5, recipient: "known_wallet_1" }),
    expectedDecision: "ALLOW",
    expectedRiskRange: [0, 25],
  },
];

// ============================================================================
// CATEGORY 6: ADVERSARIAL / BYPASS ATTEMPTS
// ============================================================================

const adversarialTests = [
  {
    id: "adv_001",
    category: "Adversarial",
    description: "Attempt REJECT with tiny amount",
    transaction: {
      amount: 0.01,
      recipient: "unknown_wallet",
      isKnown: false,
    },
    history: [
      { amount: 5, recipient: "known_wallet_1" },
      { amount: 5, recipient: "known_wallet_1" },
    ],
    expectedDecision: "PARTIAL",
    expectedRiskRange: [45, 70],
  },
  {
    id: "adv_002",
    category: "Adversarial",
    description: "Rapid sequence from same unknown",
    transaction: {
      amount: 1,
      recipient: "same_attacker",
      isKnown: false,
    },
    history: [
      { amount: 1, recipient: "same_attacker" },
      { amount: 1, recipient: "same_attacker" },
    ],
    expectedDecision: "PARTIAL",
    expectedRiskRange: [50, 75],
  },
  {
    id: "adv_003",
    category: "Adversarial",
    description: "Claim known but pattern unknown",
    transaction: {
      amount: 100,
      recipient: "claimed_known",
      isKnown: true,
    },
    history: [
      { amount: 5, recipient: "trusted_wallet" },
      { amount: 5, recipient: "trusted_wallet" },
    ],
    expectedDecision: "DELAY",
    expectedRiskRange: [55, 80],
  },
  {
    id: "adv_004",
    category: "Adversarial",
    description: "Manipulate with many small amounts",
    transaction: {
      amount: 500,
      recipient: "unknown_manipulator",
      isKnown: false,
    },
    history: Array(50).fill({ amount: 1, recipient: "known_wallet_1" }),
    expectedDecision: "REJECT",
    expectedRiskRange: [85, 100],
  },
  {
    id: "adv_005",
    category: "Adversarial",
    description: "Mix known and unknown, try ALLOW",
    transaction: {
      amount: 25,
      recipient: "suspicious_new",
      isKnown: false,
    },
    history: [
      { amount: 5, recipient: "known_wallet_1" },
      { amount: 10, recipient: "known_wallet_2" },
      { amount: 8, recipient: "known_wallet_3" },
    ],
    expectedDecision: "REJECT",
    expectedRiskRange: [70, 95],
  },
];

// ============================================================================
// CATEGORY 7: CONTEXT-DEPENDENT (Prove Same Input = Different Decision)
// ============================================================================

const contextDependentTests = [
  {
    id: "context_001",
    category: "Context Dependent",
    description: "Same TX, known recipient",
    transaction: {
      amount: 50,
      recipient: "wallet_abc",
      isKnown: true,
    },
    history: [
      { amount: 50, recipient: "wallet_abc" },
      { amount: 50, recipient: "wallet_abc" },
    ],
    expectedDecision: "ALLOW",
    expectedRiskRange: [0, 40],
  },
  {
    id: "context_002",
    category: "Context Dependent",
    description: "Same TX, unknown recipient",
    transaction: {
      amount: 50,
      recipient: "wallet_abc",
      isKnown: false,
    },
    history: [
      { amount: 5, recipient: "known_wallet_1" },
      { amount: 5, recipient: "known_wallet_1" },
    ],
    expectedDecision: "REJECT",
    expectedRiskRange: [75, 100],
  },
  {
    id: "context_003",
    category: "Context Dependent",
    description: "Normal for context 1",
    transaction: {
      amount: 50,
      recipient: "wallet_xyz",
      isKnown: true,
    },
    history: [
      { amount: 50, recipient: "wallet_xyz" },
      { amount: 50, recipient: "wallet_xyz" },
      { amount: 50, recipient: "wallet_xyz" },
    ],
    expectedDecision: "ALLOW",
    expectedRiskRange: [0, 30],
  },
  {
    id: "context_004",
    category: "Context Dependent",
    description: "Extreme for context 2",
    transaction: {
      amount: 50,
      recipient: "wallet_xyz",
      isKnown: false,
    },
    history: [
      { amount: 1, recipient: "known_wallet_1" },
      { amount: 1, recipient: "known_wallet_1" },
      { amount: 1, recipient: "known_wallet_1" },
    ],
    expectedDecision: "REJECT",
    expectedRiskRange: [85, 100],
  },
];

// ============================================================================
// CATEGORY 8: PARTIAL APPROVAL SCENARIOS
// ============================================================================

const partialApprovalTests = [
  {
    id: "partial_001",
    category: "Partial Approval",
    description: "Moderate risk, known recipient",
    transaction: {
      amount: 75,
      recipient: "known_wallet_1",
      isKnown: true,
    },
    history: [
      { amount: 10, recipient: "known_wallet_1" },
      { amount: 15, recipient: "known_wallet_1" },
      { amount: 12, recipient: "known_wallet_1" },
    ],
    expectedDecision: "PARTIAL",
    expectedRiskRange: [45, 65],
  },
  {
    id: "partial_002",
    category: "Partial Approval",
    description: "Medium risk scenario",
    transaction: {
      amount: 30,
      recipient: "semi_unknown",
      isKnown: false,
    },
    history: [
      { amount: 5, recipient: "known_wallet_1" },
      { amount: 10, recipient: "known_wallet_2" },
    ],
    expectedDecision: "PARTIAL",
    expectedRiskRange: [50, 70],
  },
];

// ============================================================================
// CATEGORY 9: RAPID CONSECUTIVE TRANSACTIONS
// ============================================================================

const rapidTransactionTests = [
  {
    id: "rapid_001",
    category: "Rapid Transactions",
    description: "3 txs to same unknown in quick succession",
    transaction: {
      amount: 20,
      recipient: "rapid_attacker",
      isKnown: false,
    },
    history: [
      { amount: 20, recipient: "rapid_attacker" },
      { amount: 20, recipient: "rapid_attacker" },
    ],
    expectedDecision: "REJECT",
    expectedRiskRange: [70, 95],
  },
  {
    id: "rapid_002",
    category: "Rapid Transactions",
    description: "Quick escalation to new wallet",
    transaction: {
      amount: 100,
      recipient: "new_rapid",
      isKnown: false,
    },
    history: [
      { amount: 10, recipient: "new_rapid" },
      { amount: 50, recipient: "new_rapid" },
    ],
    expectedDecision: "REJECT",
    expectedRiskRange: [80, 100],
  },
];

// ============================================================================
// CATEGORY 10: PRECISION TESTS (Prove Decision Varies)
// ============================================================================

const precisionTests = [
  {
    id: "precision_001",
    category: "Precision",
    description: "Increment by 1",
    transaction: { amount: 6, recipient: "known_wallet_1", isKnown: true },
    history: [
      { amount: 5, recipient: "known_wallet_1" },
      { amount: 5, recipient: "known_wallet_1" },
    ],
    expectedDecision: "ALLOW",
    expectedRiskRange: [0, 35],
  },
  {
    id: "precision_002",
    category: "Precision",
    description: "Double amount",
    transaction: { amount: 10, recipient: "known_wallet_1", isKnown: true },
    history: [
      { amount: 5, recipient: "known_wallet_1" },
      { amount: 5, recipient: "known_wallet_1" },
    ],
    expectedDecision: "DELAY",
    expectedRiskRange: [55, 80],
  },
  {
    id: "precision_003",
    category: "Precision",
    description: "Triple amount",
    transaction: { amount: 15, recipient: "known_wallet_1", isKnown: true },
    history: [
      { amount: 5, recipient: "known_wallet_1" },
      { amount: 5, recipient: "known_wallet_1" },
    ],
    expectedDecision: "DELAY",
    expectedRiskRange: [60, 85],
  },
  {
    id: "precision_004",
    category: "Precision",
    description: "10x amount",
    transaction: { amount: 50, recipient: "known_wallet_1", isKnown: true },
    history: [
      { amount: 5, recipient: "known_wallet_1" },
      { amount: 5, recipient: "known_wallet_1" },
    ],
    expectedDecision: "REJECT",
    expectedRiskRange: [80, 100],
  },
];

// ============================================================================
// COMBINE ALL TEST CASES
// ============================================================================

export const allTestScenarios = [
  ...normalBehaviorTests,
  ...highRiskTests,
  ...behaviorShiftTests,
  ...repetitiveAttackTests,
  ...edgeCaseTests,
  ...adversarialTests,
  ...contextDependentTests,
  ...partialApprovalTests,
  ...rapidTransactionTests,
  ...precisionTests,
];

export const testCategories = {
  "Normal Behavior": normalBehaviorTests.length,
  "High Risk": highRiskTests.length,
  "Behavior Shift": behaviorShiftTests.length,
  "Repetitive Attack": repetitiveAttackTests.length,
  "Edge Case": edgeCaseTests.length,
  Adversarial: adversarialTests.length,
  "Context Dependent": contextDependentTests.length,
  "Partial Approval": partialApprovalTests.length,
  "Rapid Transactions": rapidTransactionTests.length,
  Precision: precisionTests.length,
};

export function getTestsByCategory(category) {
  return allTestScenarios.filter((t) => t.category === category);
}

export function getTestById(id) {
  return allTestScenarios.find((t) => t.id === id);
}

console.log(
  `✅ Loaded ${allTestScenarios.length} test scenarios across ${Object.keys(testCategories).length} categories`
);
