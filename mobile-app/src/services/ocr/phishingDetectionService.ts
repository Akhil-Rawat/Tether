/**
 * Phishing Detection Service
 * Local AI-powered threat analysis using pattern matching and heuristics
 */

import type {
  OCRExtraction,
  PhishingAnalysisResult,
  ThreatIndicator,
  ThreatLevel,
} from './types';
import { THREAT_DATABASE, generatePhishingVariations, getThreatLevel } from './threatDatabase';

interface AnalysisWeights {
  domainPhishing: number;
  urgencyLanguage: number;
  impersonation: number;
  scamTokens: number;
  walletDrain: number;
}

const ANALYSIS_WEIGHTS: AnalysisWeights = {
  domainPhishing: 0.35,
  urgencyLanguage: 0.20,
  impersonation: 0.15,
  scamTokens: 0.15,
  walletDrain: 0.15,
};

export class PhishingDetectionService {
  private threatDb = THREAT_DATABASE;

  /**
   * Main analysis pipeline: OCR extraction → threat analysis
   */
  async analyzeExtraction(extraction: OCRExtraction): Promise<PhishingAnalysisResult> {
    const indicators: ThreatIndicator[] = [];
    let domainScore = 0;
    let urgencyScore = 0;
    let impersonationScore = 0;
    let tokenScore = 0;
    let walletDrainScore = 0;

    const textLower = extraction.rawText.toLowerCase();

    // ===== 1. PHISHING DOMAIN DETECTION =====
    const domainFindings = this.detectPhishingDomains(
      extraction.extractedElements.urls,
      textLower
    );
    indicators.push(...domainFindings.indicators);
    domainScore = domainFindings.score;

    // ===== 2. URGENCY LANGUAGE DETECTION =====
    const urgencyFindings = this.detectUrgencyLanguage(textLower);
    if (urgencyFindings.detected) {
      indicators.push(urgencyFindings.indicator);
      urgencyScore = urgencyFindings.score;
    }

    // ===== 3. IMPERSONATION DETECTION =====
    const impersonationFindings = this.detectImpersonation(textLower);
    if (impersonationFindings.detected) {
      indicators.push(impersonationFindings.indicator);
      impersonationScore = impersonationFindings.score;
    }

    // ===== 4. SCAM TOKEN DETECTION =====
    const tokenFindings = this.detectScamTokens(
      extraction.extractedElements.tokens,
      textLower
    );
    if (tokenFindings.detected) {
      indicators.push(tokenFindings.indicator);
      tokenScore = tokenFindings.score;
    }

    // ===== 5. WALLET DRAIN PATTERN DETECTION =====
    const drainFindings = this.detectWalletDrainPatterns(textLower);
    if (drainFindings.detected) {
      indicators.push(drainFindings.indicator);
      walletDrainScore = drainFindings.score;
    }

    // ===== CALCULATE THREAT SCORE =====
    const threatScore = Math.round(
      domainScore * ANALYSIS_WEIGHTS.domainPhishing +
        urgencyScore * ANALYSIS_WEIGHTS.urgencyLanguage +
        impersonationScore * ANALYSIS_WEIGHTS.impersonation +
        tokenScore * ANALYSIS_WEIGHTS.scamTokens +
        walletDrainScore * ANALYSIS_WEIGHTS.walletDrain
    );

    const threatLevel = getThreatLevel(threatScore);
    const recommendedAction = this.getRecommendedAction(threatLevel);
    const reasoning = this.generateReasoning(indicators, threatLevel);
    const summary = this.generateSummary(threatLevel, indicators.length);

    return {
      id: `threat-${extraction.id}`,
      ocrId: extraction.id,
      timestamp: Date.now(),
      threatLevel,
      threatScore,
      phishingProbability: Math.min(100, threatScore * 1.2),
      scamConfidence: Math.min(100, threatScore),
      indicators,
      suspiciousPatterns: this.extractSuspiciousPatterns(textLower),
      riskFactors: indicators.map((i) => i.description),
      recommendedAction,
      reasoning,
      summary,
    };
  }

  // ===== DETECTION METHODS =====

  private detectPhishingDomains(urls: string[], text: string) {
    const indicators: ThreatIndicator[] = [];
    let score = 0;

    for (const url of urls) {
      const urlLower = url.toLowerCase();
      for (const knownDomain of this.threatDb.phishingDomains) {
        const variations = generatePhishingVariations(knownDomain);
        for (const variation of variations) {
          if (urlLower.includes(variation)) {
            // Check if it's a phishing variation (typo, different TLD, etc.)
            const isExactMatch = urlLower === knownDomain || urlLower === `www.${knownDomain}`;
            const confidence = isExactMatch ? 30 : 75;

            indicators.push({
              type: 'phishing_domain',
              severity: isExactMatch ? 'LOW' : 'HIGH',
              confidence,
              description: isExactMatch
                ? `Legitimate domain detected: ${url}`
                : `Suspicious domain resembling ${knownDomain}: ${url}`,
              highlightedText: url,
              recommendation: isExactMatch
                ? 'Domain appears legitimate but verify independently'
                : 'This domain resembles a known service. Verify authenticity before proceeding.',
            });

            score = Math.max(score, confidence);
          }
        }
      }
    }

    return { indicators, score };
  }

  private detectUrgencyLanguage(text: string) {
    const detectedPhrases: string[] = [];

    for (const phrase of this.threatDb.urgencyPhrases) {
      if (text.includes(phrase)) {
        detectedPhrases.push(phrase);
      }
    }

    if (detectedPhrases.length === 0) {
      return { detected: false, indicator: null as any, score: 0 };
    }

    const score = Math.min(100, detectedPhrases.length * 20);

    return {
      detected: true,
      indicator: {
        type: 'urgency_language' as const,
        severity: score >= 60 ? 'HIGH' : 'MEDIUM',
        confidence: Math.min(100, score),
        description: `Detected ${detectedPhrases.length} urgency-inducing phrases`,
        highlightedText: detectedPhrases.join(', '),
        recommendation:
          'Scammers use urgency to bypass careful decision-making. Take time to verify.',
      },
      score,
    };
  }

  private detectImpersonation(text: string) {
    const impersonationKeywords = [
      'verify your account',
      'confirm your identity',
      'update your profile',
      're-authenticate',
      'sign in again',
      're-enter password',
      'connect wallet',
      'authorize wallet',
      'approve transaction',
      'sign message',
    ];

    const found = impersonationKeywords.filter((kw) => text.includes(kw));
    const score = Math.min(100, found.length * 25);

    if (found.length === 0) {
      return { detected: false, indicator: null as any, score: 0 };
    }

    return {
      detected: true,
      indicator: {
        type: 'impersonation' as const,
        severity: score >= 50 ? 'HIGH' : 'MEDIUM',
        confidence: Math.min(100, score),
        description: 'Detected language attempting to impersonate legitimate service',
        highlightedText: found.join(', '),
        recommendation:
          'Legitimate services never ask to re-enter credentials or confirm identity via links.',
      },
      score,
    };
  }

  private detectScamTokens(tokens: string[], text: string) {
    const detectedTokens = tokens.filter((token) =>
      this.threatDb.scamTokenNames.some(
        (scamToken) =>
          token.toLowerCase().includes(scamToken.toLowerCase()) ||
          scamToken.toLowerCase().includes(token.toLowerCase())
      )
    );

    if (detectedTokens.length === 0) {
      return { detected: false, indicator: null as any, score: 0 };
    }

    return {
      detected: true,
      indicator: {
        type: 'scam_token' as const,
        severity: 'HIGH',
        confidence: 70,
        description: `Found suspicious token(s): ${detectedTokens.join(', ')}`,
        highlightedText: detectedTokens.join(', '),
        recommendation:
          'These token names are associated with pump-and-dump or rug pull scams.',
      },
      score: 80,
    };
  }

  private detectWalletDrainPatterns(text: string) {
    const drainPatterns = this.threatDb.walletDrainPatterns;
    const detected = drainPatterns.filter((pattern) => text.includes(pattern));

    if (detected.length === 0) {
      return { detected: false, indicator: null as any, score: 0 };
    }

    return {
      detected: true,
      indicator: {
        type: 'wallet_drain' as const,
        severity: 'CRITICAL',
        confidence: 85,
        description: 'Detected wallet drain attack pattern',
        highlightedText: detected.join(', '),
        recommendation:
          'This appears to be a wallet drain attack. NEVER approve unlimited token spending.',
      },
      score: 90,
    };
  }

  // ===== UTILITY METHODS =====

  private getRecommendedAction(
    threatLevel: ThreatLevel
  ): 'ALLOW' | 'REVIEW' | 'REJECT' {
    switch (threatLevel) {
      case 'CRITICAL':
      case 'HIGH':
        return 'REJECT';
      case 'MEDIUM':
        return 'REVIEW';
      default:
        return 'ALLOW';
    }
  }

  private extractSuspiciousPatterns(text: string): string[] {
    const patterns: string[] = [];

    // Extract suspicious phrases
    for (const keyword of this.threatDb.suspiciousKeywords) {
      if (text.includes(keyword)) {
        patterns.push(keyword);
      }
    }

    return patterns.slice(0, 5); // Top 5 patterns
  }

  private generateReasoning(indicators: ThreatIndicator[], threatLevel: ThreatLevel): string {
    if (indicators.length === 0) {
      return 'No significant threats detected. Proceeding with standard Guardian analysis.';
    }

    const topIndicators = indicators.slice(0, 3);
    const indicatorTexts = topIndicators.map((i) => `• ${i.description}`).join('\n');

    const levelText = {
      CRITICAL: 'This appears to be a critical security threat.',
      HIGH: 'This shows signs of a phishing or scam attempt.',
      MEDIUM: 'There are moderate warning signs that warrant additional review.',
      LOW: 'Minor warning signs detected but likely not a threat.',
      NONE: 'No threats detected.',
    }[threatLevel];

    return `${levelText}\n\nDetected indicators:\n${indicatorTexts}`;
  }

  private generateSummary(threatLevel: ThreatLevel, indicatorCount: number): string {
    const summaries: Record<ThreatLevel, string> = {
      CRITICAL: `🚨 CRITICAL: ${indicatorCount} threat indicators detected. This is likely a malicious attempt.`,
      HIGH: `⚠️ HIGH RISK: ${indicatorCount} warning signs suggest phishing or scam activity.`,
      MEDIUM: `⚠️ MEDIUM RISK: ${indicatorCount} suspicious indicators found. Review carefully.`,
      LOW: `ℹ️ LOW RISK: Minor concerns detected but likely not a significant threat.`,
      NONE: `✅ SAFE: No threats detected in this image.`,
    };
    return summaries[threatLevel];
  }
}

export const phishingDetectionService = new PhishingDetectionService();
