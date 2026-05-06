# 📍 NAVIGATION GUIDE - Where to Start

## 🎯 Your Goals Mapped to Files

### Goal 1: "Just run it"
**Time needed**: 5 minutes  
**Files to read**:
1. [QUICKSTART.md](QUICKSTART.md) - 2 minutes
2. Run `npm test` - 3-5 minutes

**Expected**: See test progress and results

---

### Goal 2: "Understand what was built"
**Time needed**: 15 minutes  
**Files to read**:
1. [SUMMARY.md](SUMMARY.md) - 5 minutes (this overview)
2. [MANIFEST.md](MANIFEST.md) - 10 minutes (detailed breakdown)

**Expected**: Know the 4 components and 10 test categories

---

### Goal 3: "Understand how it works"
**Time needed**: 30 minutes  
**Files to read**:
1. [ARCHITECTURE.md](ARCHITECTURE.md) - 20 minutes (system design)
2. [README.md](README.md) - 10 minutes (configuration)

**Expected**: Understand the 5-stage pipeline and decision logic

---

### Goal 4: "Validate the system"
**Time needed**: 45 minutes  
**Files to read**:
1. [QA-TESTING-GUIDE.md](QA-TESTING-GUIDE.md) - 30 minutes (detailed procedures)
2. [TEST-SUITE.md](TEST-SUITE.md) - 15 minutes (test overview)

**Expected**: Know what each test proves and how to interpret results

---

### Goal 5: "Integrate with real Solana contract"
**Time needed**: 1 hour  
**Files to read**:
1. [ARCHITECTURE.md](ARCHITECTURE.md#integration) - Understand interfaces
2. [README.md](README.md#integration) - Integration steps
3. [MANIFEST.md](MANIFEST.md#integration-guide) - Real contract setup

**Expected**: Know how to replace mock executor with real Anchor program

---

## 📚 Documentation Index

### Quick References
| Need | Read | Time |
|------|------|------|
| 2-minute start | [QUICKSTART.md](QUICKSTART.md) | 2 min |
| What was built | [SUMMARY.md](SUMMARY.md) | 5 min |
| Package overview | [MANIFEST.md](MANIFEST.md) | 10 min |
| Completion status | [CHECKLIST.md](CHECKLIST.md) | 5 min |

### Deep Dives
| Need | Read | Time |
|------|------|------|
| System design | [ARCHITECTURE.md](ARCHITECTURE.md) | 20 min |
| Installation | [README.md](README.md) | 15 min |
| Testing strategy | [TEST-SUITE.md](TEST-SUITE.md) | 15 min |
| QA procedures | [QA-TESTING-GUIDE.md](QA-TESTING-GUIDE.md) | 30 min |

---

## 🎯 Common Questions → Answers

### "How do I run the tests?"
**Answer**: [QUICKSTART.md](QUICKSTART.md)
```bash
npm test
```

### "What will the tests prove?"
**Answer**: [SUMMARY.md](SUMMARY.md#-what-it-proves)
- Context-aware (not rule-based)
- Non-bypassable (enforced on-chain)
- Behavior-dependent (uses history)
- Robust (handles edge cases)

### "How many tests are there?"
**Answer**: [MANIFEST.md](MANIFEST.md#-test-coverage) - 58 tests across 10 categories

### "What's the 5-stage pipeline?"
**Answer**: [ARCHITECTURE.md](ARCHITECTURE.md#5-stage-pipeline-explained)
1. Behavior modeling
2. Embeddings
3. Impact scoring
4. Deviation analysis
5. LLM reasoning

### "How do I know it's context-aware?"
**Answer**: [QA-TESTING-GUIDE.md](QA-TESTING-GUIDE.md#context-awareness-proof)
- Tests context_001-004 prove same TX → different decisions

### "Can it be bypassed?"
**Answer**: [QA-TESTING-GUIDE.md](QA-TESTING-GUIDE.md#non-bypassability-proof)
- NO - Contract enforces decisions, 0% bypass rate

### "How do I integrate with Solana?"
**Answer**: [MANIFEST.md](MANIFEST.md#to-real-solana-contract)
- Replace mock executor with real Anchor program

### "What are the requirements?"
**Answer**: [README.md](README.md#requirements)
- Node.js 22.17+, 2 GB RAM, 2 GB disk

### "How long does it take?"
**Answer**: [MANIFEST.md](MANIFEST.md#-performance)
- Full suite: 3-5 minutes
- Per test: 3-5 seconds

### "What's expected to pass?"
**Answer**: [SUMMARY.md](SUMMARY.md#-expected-test-results)
- >95% pass rate (57/58 expected)
- All REJECT tests should block

---

## 📊 File Size Reference

```
Code Files:
  testRunner.js          500 lines   [Orchestrator - START HERE]
  decisionEngine.js      400 lines   [Core engine]
  testScenarios.js       450 lines   [58 tests]
  contractValidator.js   350 lines   [Contract sim]
  metricsCollector.js    280 lines   [Statistics]

Documentation:
  ARCHITECTURE.md        1000 lines  [Detailed design]
  QA-TESTING-GUIDE.md     800 lines  [Detailed QA]
  README.md               800 lines  [Installation]
  MANIFEST.md             400 lines  [Overview]
  TEST-SUITE.md           500 lines  [Testing guide]
  QUICKSTART.md           300 lines  [Quick ref]
  SUMMARY.md              300 lines  [This overview]
```

---

## 🚀 Recommended Reading Order

### For First-Time Users
1. **QUICKSTART.md** (2 min) - Get it running
2. **SUMMARY.md** (5 min) - Understand what you have
3. Run `npm test` (5 min) - See it work
4. Check `test-report.json` (5 min) - Review results

### For Deep Understanding
1. **MANIFEST.md** (10 min) - Project structure
2. **ARCHITECTURE.md** (20 min) - System design
3. **TEST-SUITE.md** (15 min) - Test strategy
4. **QA-TESTING-GUIDE.md** (30 min) - Detailed validation

### For Integration
1. **MANIFEST.md** - Integration section
2. **ARCHITECTURE.md** - Interface definitions
3. **README.md** - Configuration options
4. Review **testRunner.js** - See how it works

---

## 🔍 Key Concepts Explained In

| Concept | Document | Section |
|---------|----------|---------|
| 5-stage pipeline | [ARCHITECTURE.md](ARCHITECTURE.md) | Architecture section |
| Context-awareness | [QA-TESTING-GUIDE.md](QA-TESTING-GUIDE.md) | Context-Awareness Proof |
| Test categories | [MANIFEST.md](MANIFEST.md) | Test Coverage |
| Contract enforcement | [contractValidator.js](contractValidator.js) | Code comments |
| Metrics calculation | [metricsCollector.js](metricsCollector.js) | Code comments |
| Test execution | [testRunner.js](testRunner.js) | Main flow |

---

## 💡 Tips

### To understand the system quickly
1. Look at test examples in [testScenarios.js](testScenarios.js) (lines 1-50)
2. Review decision logic in [decisionEngine.js](decisionEngine.js)
3. Run `npm test` and watch real decisions being made

### To understand the tests
1. Read [TEST-SUITE.md](TEST-SUITE.md) categories
2. Look at test objects in [testScenarios.js](testScenarios.js)
3. Review expected results in [QA-TESTING-GUIDE.md](QA-TESTING-GUIDE.md#expected-test-output)

### To debug failing tests
1. Check [QA-TESTING-GUIDE.md](QA-TESTING-GUIDE.md#debugging-failed-tests)
2. Review test-report.json output
3. Check console logs during `npm test --verbose`

### To integrate with your code
1. Study [testRunner.js](testRunner.js) main() function
2. Review [MANIFEST.md](MANIFEST.md#-integration-guide)
3. Copy the pattern and adapt for your needs

---

## 📞 Documentation Cross-References

**Looking for information about**:

- **Installation** → [README.md](README.md) + [QUICKSTART.md](QUICKSTART.md)
- **System design** → [ARCHITECTURE.md](ARCHITECTURE.md)
- **Test strategy** → [TEST-SUITE.md](TEST-SUITE.md) + [QA-TESTING-GUIDE.md](QA-TESTING-GUIDE.md)
- **What was built** → [MANIFEST.md](MANIFEST.md) + [SUMMARY.md](SUMMARY.md)
- **Proof points** → [QA-TESTING-GUIDE.md](QA-TESTING-GUIDE.md#key-validation-rules)
- **Performance** → [MANIFEST.md](MANIFEST.md#-performance) + [README.md](README.md#performance)
- **Integration** → [MANIFEST.md](MANIFEST.md#-integration-guide) + [README.md](README.md#as-a-module)
- **Troubleshooting** → [README.md](README.md#troubleshooting) + [QA-TESTING-GUIDE.md](QA-TESTING-GUIDE.md#debugging-failed-tests)
- **Completion** → [CHECKLIST.md](CHECKLIST.md)

---

## ⏱️ Time Estimates

| Activity | Time | Start With |
|----------|------|-----------|
| Run tests | 5 min | [QUICKSTART.md](QUICKSTART.md) |
| Understand overview | 15 min | [SUMMARY.md](SUMMARY.md) |
| Learn design | 30 min | [ARCHITECTURE.md](ARCHITECTURE.md) |
| Validate system | 45 min | [QA-TESTING-GUIDE.md](QA-TESTING-GUIDE.md) |
| Full comprehension | 2 hours | All docs in order |

---

## 🎓 Learning Path

**Level 1: User** (5-15 minutes)
- Read: [QUICKSTART.md](QUICKSTART.md)
- Do: `npm test`
- Know: What the system does

**Level 2: Operator** (30 minutes)
- Read: [SUMMARY.md](SUMMARY.md), [MANIFEST.md](MANIFEST.md)
- Do: `npm test --verbose`
- Know: How to run and interpret results

**Level 3: Validator** (1 hour)
- Read: [QA-TESTING-GUIDE.md](QA-TESTING-GUIDE.md), [TEST-SUITE.md](TEST-SUITE.md)
- Do: Review test-report.json in detail
- Know: What each test proves

**Level 4: Architect** (2 hours)
- Read: [ARCHITECTURE.md](ARCHITECTURE.md), review all code
- Do: Study integration section
- Know: How to extend and integrate

---

**Start here**: [QUICKSTART.md](QUICKSTART.md) (2 minutes) then `npm test`

All documentation is self-contained and cross-referenced. Pick the file that matches your current goal.
