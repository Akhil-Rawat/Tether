/**
 * Production-Grade Validation Report Generator
 * 
 * Creates comprehensive markdown + JSON reports for validation results.
 * Focuses on logical correctness, not hardcoded expectations.
 */

export class ReportGenerator {
  /**
   * Generate markdown validation report
   * @param {Object} validationResults - All validation data
   * @returns {string} Markdown report
   */
  static generateMarkdownReport(validationResults) {
    const {
      summary,
      decisionAnalysis,
      contextAwareness,
      enforcement,
      issues,
      timestamp,
    } = validationResults;

    let report = `# 🔍 QVAC + Anchor Contract - Production Validation Report

**Generated:** ${timestamp}

---

## 📊 Executive Summary

| Metric | Result |
|--------|--------|
| Total Tests | ${summary.totalTests} |
| Logically Valid Decisions | ${summary.logicallyValidCount} / ${summary.totalTests} (${summary.validPercentage}%) |
| Decision Alignment Score | ${summary.alignmentScore}% |
| Enforcement Success Rate | ${summary.enforcementSuccessRate}% |
| Bypass Rate | ${summary.bypassRate}% |
| Context Awareness | ${contextAwareness.verdict} |

### Overall Verdict

**${summary.overallVerdict}**

${
  summary.overallVerdict === "PRODUCTION_READY"
    ? "✅ System demonstrates logical consistency, proper enforcement, and context awareness. Ready for production deployment."
    : summary.overallVerdict === "GOOD_WITH_NOTES"
      ? "⚠️ System is mostly sound with minor inconsistencies. Recommended for production with monitoring."
      : "❌ System has critical issues. Recommended for further development before production deployment."
}

---

## 🧠 Decision Logic Analysis

### Decision Distribution

\`\`\`
ALLOW:   ${decisionAnalysis.distribution.ALLOW} (${decisionAnalysis.distribution.ALLOW_pct}%)
REJECT:  ${decisionAnalysis.distribution.REJECT} (${decisionAnalysis.distribution.REJECT_pct}%)
PARTIAL: ${decisionAnalysis.distribution.PARTIAL} (${decisionAnalysis.distribution.PARTIAL_pct}%)
DELAY:   ${decisionAnalysis.distribution.DELAY} (${decisionAnalysis.distribution.DELAY_pct}%)
\`\`\`

### Decision-to-Metric Correlation

| Decision | Avg Deviation | Avg Impact | % Known Recipients | Avg Risk Score |
|----------|---------------|------------|-------------------|----------------|
| ALLOW | ${decisionAnalysis.byDecision.ALLOW?.avgDeviation || "N/A"} | ${decisionAnalysis.byDecision.ALLOW?.avgImpact || "N/A"} | ${decisionAnalysis.byDecision.ALLOW?.knownPercentage || 0}% | ${decisionAnalysis.byDecision.ALLOW?.avgRisk || "N/A"} |
| REJECT | ${decisionAnalysis.byDecision.REJECT?.avgDeviation || "N/A"} | ${decisionAnalysis.byDecision.REJECT?.avgImpact || "N/A"} | ${decisionAnalysis.byDecision.REJECT?.knownPercentage || 0}% | ${decisionAnalysis.byDecision.REJECT?.avgRisk || "N/A"} |
| PARTIAL | ${decisionAnalysis.byDecision.PARTIAL?.avgDeviation || "N/A"} | ${decisionAnalysis.byDecision.PARTIAL?.avgImpact || "N/A"} | ${decisionAnalysis.byDecision.PARTIAL?.knownPercentage || 0}% | ${decisionAnalysis.byDecision.PARTIAL?.avgRisk || "N/A"} |
| DELAY | ${decisionAnalysis.byDecision.DELAY?.avgDeviation || "N/A"} | ${decisionAnalysis.byDecision.DELAY?.avgImpact || "N/A"} | ${decisionAnalysis.byDecision.DELAY?.knownPercentage || 0}% | ${decisionAnalysis.byDecision.DELAY?.avgRisk || "N/A"} |

**Interpretation:**
- ALLOW should have: low deviation, low-moderate impact, often known recipients
- REJECT should have: high deviation, variable impact, often unknown recipients
- PARTIAL should have: medium deviation, medium impact
- DELAY should have: high impact or significant behavioral shift

### Logical Consistency

- **Logically Sound Decisions:** ${summary.logicallyValidCount} / ${summary.totalTests}
- **Alignment with Metrics:** ${summary.alignedCount} / ${summary.totalTests}
- **Free of Obvious Errors:** ${summary.withoutErrorsCount} / ${summary.totalTests}

---

## 🛡️ Contract Enforcement

### Decision Enforcement Success

\`\`\`
REJECT blocks transfers:    ${enforcement.byDecision?.REJECT?.successRate || "N/A"}%
ALLOW transfers full amount: ${enforcement.byDecision?.ALLOW?.successRate || "N/A"}%
PARTIAL transfers 50%:      ${enforcement.byDecision?.PARTIAL?.successRate || "N/A"}%
DELAY stores without transfer: ${enforcement.byDecision?.DELAY?.successRate || "N/A"}%
\`\`\`

### Bypass Testing

**Total Bypass Attempts:** ${enforcement.bypassAttempts?.length || 0}
**Successful Bypasses:** ${enforcement.bypassesSuccessful || 0}
**Blocked Bypass Attempts:** ${enforcement.bypassesBlocked || 0}

**Bypass Rate:** ${summary.bypassRate}%

${
  summary.bypassRate === 0
    ? "✅ **NO SUCCESSFUL BYPASSES** - Contract enforcement is robust"
    : summary.bypassRate < 5
      ? "⚠️ Minimal bypass rate - Contract is mostly secure"
      : "❌ Significant bypass rate - Security issues detected"
}

---

## 🧭 Context Awareness

### Verdict: ${contextAwareness.verdict}

**Context Awareness Score:** ${contextAwareness.contextAwarenessScore}%

### Test Results

| Scenario | Status |
|----------|--------|
${contextAwareness.scenarios?.map((s) => `| ${s.scenario || s.name} | ${s.differentDecisions ? "✓ Context-Aware" : "✗ Same Decision"} |`).join("\n") || "| No scenarios tested | - |"}

**Analysis:**
${
  contextAwareness.verdict === "FULLY_CONTEXT_AWARE"
    ? "✅ System is fully context-aware. Same input parameters produce different decisions based on historical context."
    : contextAwareness.verdict === "MOSTLY_CONTEXT_AWARE"
      ? "✓ System demonstrates good context awareness in most scenarios."
      : "⚠️ Limited context awareness detected. Some scenarios show identical decisions despite different contexts."
}

---

## ⚠️ Issues & Findings

### Critical Issues
${
  issues.critical.length > 0
    ? issues.critical.map((i) => `- **${i.type}**: ${i.description}`).join("\n")
    : "✅ No critical issues detected"
}

### Warnings
${
  issues.warnings.length > 0
    ? issues.warnings.map((w) => `- ${w.description}`).join("\n")
    : "✅ No warnings"
}

### Notes
${
  issues.notes.length > 0
    ? issues.notes.map((n) => `- ${n.description}`).join("\n")
    : "✅ No additional notes"
}

---

## 📈 Metrics Summary

### Consistency Metrics

- **Decision Consistency Score:** ${summary.consistencyScore}%
- **Alignment with Expected Logic:** ${summary.alignmentScore}%
- **Error-Free Decisions:** ${summary.withoutErrorsCount} / ${summary.totalTests}

### Performance Metrics

- **Average Decision Time:** ${summary.avgDecisionTime}ms
- **Deviation Score Range:** ${summary.deviationRange.min.toFixed(3)} - ${summary.deviationRange.max.toFixed(3)}
- **Impact Score Range:** ${summary.impactRange.min.toFixed(2)} - ${summary.impactRange.max.toFixed(2)}

---

## ✅ Validation Checklist

- [${summary.logicallyValidCount === summary.totalTests ? "x" : " "}] All decisions are logically sound
- [${summary.enforcementSuccessRate === 100 ? "x" : " "}] Contract enforcement 100% successful
- [${summary.bypassRate === 0 ? "x" : " "}] No successful bypass attempts
- [${contextAwareness.verdict.includes("AWARE") ? "x" : " "}] System is context-aware
- [${summary.alignmentScore > 85 ? "x" : " "}] Decisions align with metrics (>85%)
- [${summary.withoutErrorsCount === summary.totalTests ? "x" : " "}] No obvious decision errors

---

## 🎯 Recommendations

${this._generateRecommendations(validationResults)}

---

## 📋 Detailed Test Results

See \`validation-report.json\` for complete test-by-test results.

---

**Report Generated:** ${new Date(timestamp).toISOString()}
`;

    return report;
  }

  /**
   * Generate recommendations based on results
   */
  static _generateRecommendations(validationResults) {
    const { summary, enforcement, contextAwareness, issues } = validationResults;
    const recommendations = [];

    if (summary.logicallyValidCount < summary.totalTests * 0.95) {
      recommendations.push(
        "🔧 **Decision Logic:** Review LLM prompt engineering to improve logical consistency"
      );
    }

    if (summary.alignmentScore < 85) {
      recommendations.push(
        "🔧 **Metric Calibration:** Adjust deviation/impact score thresholds or LLM rules"
      );
    }

    if (summary.bypassRate > 0) {
      recommendations.push(
        "🔒 **Security:** Review contract enforcement logic to close bypass vectors"
      );
    }

    if (!contextAwareness.verdict.includes("AWARE")) {
      recommendations.push(
        "🧠 **Context Handling:** Improve system sensitivity to historical context"
      );
    }

    if (issues.critical.length > 0) {
      recommendations.push(
        "⚡ **Priority:** Address critical issues before production deployment"
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        "✅ **Status:** System is performing well. Proceed with confidence monitoring."
      );
    }

    return recommendations.map((r) => `- ${r}`).join("\n");
  }

  /**
   * Generate JSON report
   */
  static generateJSONReport(validationResults) {
    return JSON.stringify(validationResults, null, 2);
  }

  /**
   * Create summary object from test results
   */
  static createSummary(testResults) {
    const {
      logicalValidation,
      alignmentAnalysis,
      enforcement,
      contextTests,
    } = testResults;

    const totalTests = logicalValidation.length;
    const logicallyValidCount = logicalValidation.filter(
      (r) => r.isValid
    ).length;
    const alignedCount = alignmentAnalysis.filter((r) => r.aligned).length;
    const withoutErrorsCount = logicalValidation.filter(
      (r) => !r.hasObviousError
    ).length;

    // Decision metrics
    const decisionCounts = { ALLOW: 0, REJECT: 0, PARTIAL: 0, DELAY: 0 };
    const decisionMetrics = {
      ALLOW: { deviations: [], impacts: [], risks: [], known: 0, total: 0 },
      REJECT: { deviations: [], impacts: [], risks: [], known: 0, total: 0 },
      PARTIAL: { deviations: [], impacts: [], risks: [], known: 0, total: 0 },
      DELAY: { deviations: [], impacts: [], risks: [], known: 0, total: 0 },
    };

    for (const result of testResults.allResults) {
      const decision = result.decision;
      decisionCounts[decision]++;
      decisionMetrics[decision].total++;
      decisionMetrics[decision].deviations.push(
        result.deviationScore
      );
      decisionMetrics[decision].impacts.push(result.impactScore);
      decisionMetrics[decision].risks.push(result.riskScore);
      if (result.isKnown) decisionMetrics[decision].known++;
    }

    // Calculate averages
    const getAvg = (arr) =>
      arr.length > 0 ? (arr.reduce((a, b) => a + b) / arr.length).toFixed(2) : "N/A";

    return {
      totalTests,
      logicallyValidCount,
      validPercentage: Math.round((logicallyValidCount / totalTests) * 100),
      alignedCount,
      alignmentScore: Math.round((alignedCount / totalTests) * 100),
      withoutErrorsCount,
      enforcementSuccessRate: enforcement.successRate,
      bypassRate: enforcement.bypassRate,
      consistencyScore: Math.round(
        ((logicallyValidCount + alignedCount + withoutErrorsCount) /
          (totalTests * 3)) *
          100
      ),
      overallVerdict:
        logicallyValidCount / totalTests > 0.95 &&
        enforcement.successRate === 100 &&
        enforcement.bypassRate === 0
          ? "PRODUCTION_READY"
          : logicallyValidCount / totalTests > 0.85 &&
              enforcement.successRate > 95
            ? "GOOD_WITH_NOTES"
            : "NEEDS_IMPROVEMENT",
      avgDecisionTime: testResults.avgExecutionTime || 0,
      deviationRange: {
        min: Math.min(...testResults.allResults.map((r) => r.deviationScore)),
        max: Math.max(...testResults.allResults.map((r) => r.deviationScore)),
      },
      impactRange: {
        min: Math.min(...testResults.allResults.map((r) => r.impactScore)),
        max: Math.max(...testResults.allResults.map((r) => r.impactScore)),
      },
    };
  }
}
