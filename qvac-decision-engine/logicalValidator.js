/**
 * Logical Decision Validator
 * 
 * Validates AI decisions based on LOGICAL CORRECTNESS, not hardcoded expectations.
 * 
 * Decision Logic:
 * - ALLOW: deviation < 0.3 AND (known OR impact < 1.5)
 * - PARTIAL: (0.3 <= deviation < 0.6) OR (1.5 <= impact <= 5)
 * - DELAY: impact > 5 OR high deviation + moderate impact
 * - REJECT: deviation > 0.7 OR (unknown AND impact > 2)
 */

export class LogicalValidator {
  /**
   * Define valid decision ranges for each decision type
   */
  static getDecisionRanges() {
    return {
      ALLOW: {
        maxDeviation: 0.3,
        maxImpact: 1.5,
        requiredKnown: false, // Can be known or unknown if metrics are low
        description: "Low deviation + low impact",
      },
      PARTIAL: {
        minDeviation: 0.3,
        maxDeviation: 0.6,
        minImpact: 1.5,
        maxImpact: 5,
        description: "Medium deviation or moderate impact",
      },
      DELAY: {
        minImpact: 5,
        // OR: high deviation (0.6-0.8) with moderate-high impact
        description: "High impact OR significant behavioral shift",
      },
      REJECT: {
        minDeviation: 0.7,
        // OR: unknown recipient + risky metrics
        description: "Very high deviation OR unknown + risky",
      },
    };
  }

  /**
   * Check if a decision is LOGICALLY VALID given the metrics
   * @param {string} decision - ALLOW, PARTIAL, DELAY, REJECT
   * @param {number} deviationScore - 0-1 (0=similar, 1=anomalous)
   * @param {number} impactScore - 1-10+ (1=normal, 5+=extreme)
   * @param {boolean} isKnown - Is recipient known
   * @returns {Object} {isValid, logicalReason, confidence, issues}
   */
  static validateDecisionLogic(decision, deviationScore, impactScore, isKnown) {
    const issues = [];
    let confidence = 0.95; // Start high, reduce for edge cases

    // ===== ALLOW VALIDATION =====
    if (decision === "ALLOW") {
      // Valid if: low deviation + known, OR very low metrics
      const deviationOk = deviationScore < 0.35;
      const impactOk = impactScore < 1.5;
      const knownOk = isKnown || (deviationScore < 0.1 && impactScore < 1.1);

      if (deviationOk && (knownOk || impactOk)) {
        return {
          isValid: true,
          logicalReason:
            `Low deviation (${deviationScore.toFixed(2)}) ` +
            (isKnown ? "to known recipient" : "with low impact"),
          confidence: Math.min(confidence, 0.98),
          issues: [],
        };
      }

      if (deviationScore > 0.5 || impactScore > 2) {
        issues.push(
          `ALLOW for high deviation (${deviationScore.toFixed(2)}) or high impact (${impactScore.toFixed(2)}x) is risky`
        );
        confidence = 0.6;
      }

      if (!isKnown && deviationScore > 0.3) {
        issues.push(
          `ALLOW to unknown recipient with medium deviation (${deviationScore.toFixed(2)}) is risky`
        );
        confidence = 0.5;
      }
    }

    // ===== PARTIAL VALIDATION =====
    if (decision === "PARTIAL") {
      // Valid if: medium deviation OR medium impact
      const deviationInRange =
        deviationScore >= 0.25 && deviationScore <= 0.65;
      const impactInRange = impactScore >= 1.4 && impactScore <= 5.5;

      if (deviationInRange || impactInRange) {
        return {
          isValid: true,
          logicalReason:
            `Medium risk: deviation=${deviationScore.toFixed(2)}, ` +
            `impact=${impactScore.toFixed(2)}x, recipient=${isKnown ? "known" : "unknown"}`,
          confidence: Math.min(confidence, 0.92),
          issues: [],
        };
      }

      if (deviationScore < 0.25 && impactScore < 1.5) {
        issues.push(
          `PARTIAL for very low-risk scenario (deviation=${deviationScore.toFixed(2)}, ` +
            `impact=${impactScore.toFixed(2)}x). ALLOW might be more appropriate.`
        );
        confidence = 0.7;
      }

      if (deviationScore > 0.7 || impactScore > 6) {
        issues.push(
          `PARTIAL for high-risk scenario (deviation=${deviationScore.toFixed(2)}, ` +
            `impact=${impactScore.toFixed(2)}x). DELAY or REJECT might be more appropriate.`
        );
        confidence = 0.65;
      }
    }

    // ===== DELAY VALIDATION =====
    if (decision === "DELAY") {
      // Valid if: high impact OR significant behavioral change
      const impactHigh = impactScore > 5;
      const deviationHighWithImpact = deviationScore > 0.55 && impactScore > 2;

      if (impactHigh || deviationHighWithImpact) {
        return {
          isValid: true,
          logicalReason:
            `High-risk pattern: deviation=${deviationScore.toFixed(2)}, ` +
            `impact=${impactScore.toFixed(2)}x. Requires review.`,
          confidence: Math.min(confidence, 0.94),
          issues: [],
        };
      }

      if (deviationScore < 0.5 && impactScore < 4) {
        issues.push(
          `DELAY for moderate-risk scenario (deviation=${deviationScore.toFixed(2)}, ` +
            `impact=${impactScore.toFixed(2)}x). PARTIAL might be more efficient.`
        );
        confidence = 0.7;
      }
    }

    // ===== REJECT VALIDATION =====
    if (decision === "REJECT") {
      // Valid if: very high deviation OR (unknown + risky)
      const deviationVeryHigh = deviationScore > 0.7;
      const unknownRisky = !isKnown && deviationScore > 0.5 && impactScore > 1.5;

      if (deviationVeryHigh || unknownRisky) {
        return {
          isValid: true,
          logicalReason:
            `High anomaly: deviation=${deviationScore.toFixed(2)}, ` +
            `impact=${impactScore.toFixed(2)}x, recipient=${isKnown ? "known" : "unknown"}`,
          confidence: Math.min(confidence, 0.96),
          issues: [],
        };
      }

      if (deviationScore < 0.6 && (isKnown || impactScore < 1.5)) {
        issues.push(
          `REJECT for low-risk scenario (deviation=${deviationScore.toFixed(2)}, ` +
            `impact=${impactScore.toFixed(2)}x, recipient=${isKnown ? "known" : "unknown"}). ` +
            `PARTIAL or ALLOW might be more appropriate.`
        );
        confidence = 0.55;
      }
    }

    // Return result
    const isLogical = issues.length === 0;
    return {
      isValid: isLogical || confidence > 0.65, // Still valid if logical or high confidence
      logicalReason: isLogical
        ? `${decision} decision is logically consistent with metrics`
        : `${decision} has some risk profile misalignment`,
      confidence,
      issues,
    };
  }

  /**
   * Analyze metric-to-decision ALIGNMENT
   * @param {Object} metrics - {deviationScore, impactScore, isKnown, riskScore}
   * @param {string} decision - Actual decision made
   * @returns {Object} Alignment analysis
   */
  static analyzeAlignment(metrics, decision) {
    const { deviationScore, impactScore, isKnown, riskScore } = metrics;

    // Expected decision based on metrics alone
    let expectedDecision = "ALLOW"; // Default

    if (deviationScore > 0.7 || (impactScore > 6 && !isKnown)) {
      expectedDecision = "REJECT";
    } else if (impactScore > 5) {
      expectedDecision = "DELAY";
    } else if (deviationScore > 0.4 || impactScore > 2) {
      expectedDecision = "PARTIAL";
    }

    const aligned =
      decision === expectedDecision ||
      (decision === "DELAY" && expectedDecision === "PARTIAL") ||
      (decision === "PARTIAL" && expectedDecision === "DELAY");

    return {
      expectedDecision,
      actualDecision: decision,
      aligned,
      deviationFromExpected:
        decision !== expectedDecision
          ? `Expected ${expectedDecision}, got ${decision}`
          : null,
      metrics: {
        deviationScore: deviationScore.toFixed(3),
        impactScore: impactScore.toFixed(2),
        isKnown,
        riskScore: riskScore.toFixed(1),
      },
    };
  }

  /**
   * Check if decision is "obviously wrong"
   * @param {string} decision
   * @param {number} deviationScore
   * @param {number} impactScore
   * @param {boolean} isKnown
   * @returns {Object} {isObviouslyWrong, reason}
   */
  static checkForObviousErrors(decision, deviationScore, impactScore, isKnown) {
    // ALLOW for very high deviation + unknown = obviously wrong
    if (
      decision === "ALLOW" &&
      deviationScore > 0.8 &&
      !isKnown &&
      impactScore > 3
    ) {
      return {
        isObviouslyWrong: true,
        severity: "CRITICAL",
        reason: `ALLOW to unknown recipient with very high deviation (${deviationScore.toFixed(2)}) and high impact (${impactScore.toFixed(2)}x)`,
      };
    }

    // REJECT for very low risk metrics = obviously wrong
    if (
      decision === "REJECT" &&
      deviationScore < 0.2 &&
      isKnown &&
      impactScore < 1.1
    ) {
      return {
        isObviouslyWrong: true,
        severity: "HIGH",
        reason: `REJECT to known recipient with low deviation (${deviationScore.toFixed(2)}) and normal impact (${impactScore.toFixed(2)}x)`,
      };
    }

    // DELAY when not needed
    if (
      decision === "DELAY" &&
      deviationScore < 0.2 &&
      isKnown &&
      impactScore < 1.1
    ) {
      return {
        isObviouslyWrong: true,
        severity: "MEDIUM",
        reason: `DELAY for very low-risk transaction. ALLOW more appropriate.`,
      };
    }

    return {
      isObviouslyWrong: false,
      severity: null,
      reason: null,
    };
  }

  /**
   * Compute overall consistency score
   * @param {Array} results - Array of validation results
   * @returns {Object} Consistency metrics
   */
  static computeConsistencyScore(results) {
    // Filter out undefined/null results
    const validResults = results.filter(r => r && typeof r === 'object');
    
    if (validResults.length === 0) {
      return {
        totalTests: 0,
        logicallySound: 0,
        aligned: 0,
        withoutErrors: 0,
        consistencyScore: 0,
        consistency: "NO_DATA",
      };
    }
    
    const total = validResults.length;
    const logicallySound = validResults.filter((r) => r.isValid || r.validation?.isValid).length;
    const aligned = validResults.filter((r) => r.aligned !== false && r.alignment?.aligned !== false).length;
    const withoutErrors = validResults.filter(
      (r) => !r.hasObviousError && !r.errorCheck?.isObviouslyWrong
    ).length;

    const consistencyScore =
      (logicallySound + aligned + withoutErrors) / (total * 3);

    return {
      totalTests: total,
      logicallySound,
      aligned,
      withoutErrors,
      consistencyScore: Math.round(consistencyScore * 100),
      consistency: consistencyScore > 0.85 ? "EXCELLENT" : 
                  consistencyScore > 0.75 ? "GOOD" : 
                  consistencyScore > 0.65 ? "ACCEPTABLE" : 
                  "NEEDS_IMPROVEMENT",
    };
  }
}
