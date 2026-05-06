/**
 * Metrics Collector
 *
 * Aggregates test results and generates statistics
 */

export class MetricsCollector {
  constructor() {
    this.results = [];
    this.categoryStats = new Map();
    this.decisionStats = new Map();
    this.timingStats = [];
    this.anomalies = [];
  }

  /**
   * Record a single test result
   */
  recordResult(result) {
    this.results.push(result);

    // Track by category
    const category = result.input.category;
    if (!this.categoryStats.has(category)) {
      this.categoryStats.set(category, {
        total: 0,
        passed: 0,
        failed: 0,
        decisions: {},
        avgRiskScore: 0,
        avgDeviationScore: 0,
        avgImpactScore: 0,
      });
    }

    const catStats = this.categoryStats.get(category);
    catStats.total += 1;
    if (result.success) {
      catStats.passed += 1;
    } else {
      catStats.failed += 1;
    }

    // Track decision distribution
    const decision = result.decision;
    catStats.decisions[decision] = (catStats.decisions[decision] || 0) + 1;

    // Update averages
    catStats.avgRiskScore =
      (catStats.avgRiskScore * (catStats.total - 1) + result.riskScore) /
      catStats.total;
    catStats.avgDeviationScore =
      (catStats.avgDeviationScore * (catStats.total - 1) +
        result.deviationScore) /
      catStats.total;
    catStats.avgImpactScore =
      (catStats.avgImpactScore * (catStats.total - 1) + result.impactScore) /
      catStats.total;

    // Track by decision type
    const decisionKey = decision;
    if (!this.decisionStats.has(decisionKey)) {
      this.decisionStats.set(decisionKey, {
        count: 0,
        succeeded: 0,
        avgRiskScore: 0,
        avgDeviationScore: 0,
      });
    }

    const decStats = this.decisionStats.get(decisionKey);
    decStats.count += 1;
    if (result.success) {
      decStats.succeeded += 1;
    }
    decStats.avgRiskScore =
      (decStats.avgRiskScore * (decStats.count - 1) + result.riskScore) /
      decStats.count;
    decStats.avgDeviationScore =
      (decStats.avgDeviationScore * (decStats.count - 1) +
        result.deviationScore) /
      decStats.count;

    // Track timing
    if (result.executionTimeMs) {
      this.timingStats.push({
        category,
        decision,
        time: result.executionTimeMs,
      });
    }

    // Flag anomalies
    if (result.issues && result.issues.length > 0) {
      this.anomalies.push({
        testId: result.input.id,
        category,
        issues: result.issues,
        decision: result.decision,
        riskScore: result.riskScore,
      });
    }
  }

  /**
   * Get summary statistics
   */
  getSummary() {
    const totalTests = this.results.length;
    const passedTests = this.results.filter((r) => r.success).length;
    const failedTests = totalTests - passedTests;

    const decisionCounts = {
      ALLOW: 0,
      REJECT: 0,
      DELAY: 0,
      PARTIAL: 0,
    };

    const decisionSuccess = {
      ALLOW: 0,
      REJECT: 0,
      DELAY: 0,
      PARTIAL: 0,
    };

    const riskScores = this.results.map((r) => r.riskScore);
    const deviationScores = this.results.map((r) => r.deviationScore);
    const impactScores = this.results.map((r) => r.impactScore);

    this.results.forEach((r) => {
      decisionCounts[r.decision]++;
      if (r.success) {
        decisionSuccess[r.decision]++;
      }
    });

    return {
      totalTests,
      passedTests,
      failedTests,
      passRate: ((passedTests / totalTests) * 100).toFixed(2),
      decisions: decisionCounts,
      decisionSuccess,
      decisionSuccessRate: {
        ALLOW: decisionSuccess.ALLOW / (decisionCounts.ALLOW || 1),
        REJECT: decisionSuccess.REJECT / (decisionCounts.REJECT || 1),
        DELAY: decisionSuccess.DELAY / (decisionCounts.DELAY || 1),
        PARTIAL: decisionSuccess.PARTIAL / (decisionCounts.PARTIAL || 1),
      },
      averageRiskScore: this.average(riskScores),
      medianRiskScore: this.median(riskScores),
      averageDeviationScore: this.average(deviationScores),
      medianDeviationScore: this.median(deviationScores),
      averageImpactScore: this.average(impactScores),
      blockedMaliciousTransactions: this.results.filter(
        (r) => r.decision === "REJECT" && r.success
      ).length,
      anomaliesDetected: this.anomalies.length,
    };
  }

  /**
   * Get category breakdown
   */
  getCategoryBreakdown() {
    const breakdown = {};
    this.categoryStats.forEach((stats, category) => {
      breakdown[category] = {
        total: stats.total,
        passed: stats.passed,
        failed: stats.failed,
        passRate: ((stats.passed / stats.total) * 100).toFixed(2),
        decisions: stats.decisions,
        averageRiskScore: stats.avgRiskScore.toFixed(2),
        averageDeviationScore: stats.avgDeviationScore.toFixed(3),
        averageImpactScore: stats.avgImpactScore.toFixed(2),
      };
    });
    return breakdown;
  }

  /**
   * Get decision statistics
   */
  getDecisionStats() {
    const stats = {};
    this.decisionStats.forEach((stat, decision) => {
      stats[decision] = {
        totalIssued: stat.count,
        successful: stat.succeeded,
        successRate: ((stat.succeeded / stat.count) * 100).toFixed(2),
        averageRiskScore: stat.avgRiskScore.toFixed(2),
        averageDeviationScore: stat.avgDeviationScore.toFixed(3),
      };
    });
    return stats;
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    if (this.timingStats.length === 0) {
      return { message: "No timing data collected" };
    }

    const allTimes = this.timingStats.map((t) => t.time);
    const avgTime = this.average(allTimes);
    const minTime = Math.min(...allTimes);
    const maxTime = Math.max(...allTimes);

    const timeByDecision = {};
    ["ALLOW", "REJECT", "DELAY", "PARTIAL"].forEach((decision) => {
      const times = this.timingStats
        .filter((t) => t.decision === decision)
        .map((t) => t.time);
      if (times.length > 0) {
        timeByDecision[decision] = {
          count: times.length,
          average: this.average(times).toFixed(2),
          min: Math.min(...times),
          max: Math.max(...times),
        };
      }
    });

    return {
      averageExecutionTimeMs: avgTime.toFixed(2),
      minExecutionTimeMs: minTime,
      maxExecutionTimeMs: maxTime,
      medianExecutionTimeMs: this.median(allTimes).toFixed(2),
      timeByDecision,
    };
  }

  /**
   * Get detected anomalies
   */
  getAnomalies() {
    return this.anomalies;
  }

  /**
   * Verify context-awareness (same tx, different decisions)
   */
  verifyContextAwareness() {
    const contextTests = this.results.filter(
      (r) => r.input.category === "Context Dependent"
    );

    const groupedByTx = new Map();
    contextTests.forEach((test) => {
      const key = `${test.input.transaction.amount}_${test.input.transaction.recipient}`;
      if (!groupedByTx.has(key)) {
        groupedByTx.set(key, []);
      }
      groupedByTx.get(key).push(test);
    });

    const contextAwareness = [];
    groupedByTx.forEach((tests, key) => {
      if (tests.length > 1) {
        const decisions = tests.map((t) => t.decision);
        const unique = new Set(decisions).size;
        contextAwareness.push({
          transaction: key,
          testCount: tests.length,
          decisions,
          differentDecisions: unique > 1,
        });
      }
    });

    return {
      contextTestCount: contextTests.length,
      groupedTransactions: contextAwareness.length,
      fullyContextAware: contextAwareness.every((c) => c.differentDecisions),
      details: contextAwareness,
    };
  }

  /**
   * Verify non-bypassability
   */
  verifyNonBypassability() {
    const rejectedTests = this.results.filter((r) => r.decision === "REJECT");
    const successfulRejects = rejectedTests.filter((r) => r.success).length;

    return {
      totalREJECTs: rejectedTests.length,
      blockedREJECTs: successfulRejects,
      bypassRate: ((successfulRejects / rejectedTests.length) * 100).toFixed(2),
      nonBypassable: successfulRejects === rejectedTests.length,
    };
  }

  /**
   * Generate full report
   */
  generateReport() {
    return {
      executionSummary: this.getSummary(),
      categoryBreakdown: this.getCategoryBreakdown(),
      decisionStatistics: this.getDecisionStats(),
      performanceMetrics: this.getPerformanceMetrics(),
      contextAwareness: this.verifyContextAwareness(),
      nonBypassability: this.verifyNonBypassability(),
      anomalies: this.getAnomalies(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Helper: Calculate average
   */
  average(arr) {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  /**
   * Helper: Calculate median
   */
  median(arr) {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  /**
   * Export results as JSON
   */
  exportJSON() {
    return JSON.stringify({
      results: this.results,
      report: this.generateReport(),
    }, null, 2);
  }

  /**
   * Export results as CSV
   */
  exportCSV() {
    const headers = [
      "testId",
      "category",
      "description",
      "decision",
      "riskScore",
      "deviationScore",
      "impactScore",
      "success",
      "executionTimeMs",
      "contractResult",
    ];

    const rows = this.results.map((r) => [
      r.input.id,
      r.input.category,
      r.input.description,
      r.decision,
      r.riskScore,
      r.deviationScore.toFixed(3),
      r.impactScore.toFixed(2),
      r.success,
      r.executionTimeMs || "",
      r.contractResult || "",
    ]);

    return [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");
  }
}
