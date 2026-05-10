/**
 * OCR & Phishing Detection Types
 */

export interface OCRExtraction {
  id: string;
  timestamp: number;
  rawText: string;
  extractedElements: {
    addresses: string[];
    urls: string[];
    tokens: string[];
    phrases: string[];
    numbers: string[];
  };
  imageSource: 'camera' | 'upload' | 'qr';
}

export type ThreatLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';

export interface ThreatIndicator {
  type: 'phishing_domain' | 'urgency_language' | 'impersonation' | 'scam_token' | 'wallet_drain' | 'fake_wallet';
  severity: ThreatLevel;
  confidence: number; // 0-100
  description: string;
  highlightedText: string;
  recommendation: string;
}

export interface PhishingAnalysisResult {
  id: string;
  ocrId: string;
  timestamp: number;
  
  // Threat assessment
  threatLevel: ThreatLevel;
  threatScore: number; // 0-100
  phishingProbability: number; // 0-100
  scamConfidence: number; // 0-100
  
  // Detailed findings
  indicators: ThreatIndicator[];
  suspiciousPatterns: string[];
  riskFactors: string[];
  
  // Recommendations
  recommendedAction: 'ALLOW' | 'REVIEW' | 'REJECT';
  reasoning: string;
  
  // Summary
  summary: string;
}

export interface OCRDemoCase {
  id: string;
  title: string;
  description: string;
  imageSource: OCRExtraction['imageSource'];
  rawText: string;
  previewLabel: string;
}

export interface ThreatDatabase {
  phishingDomains: string[];
  suspiciousKeywords: string[];
  urgencyPhrases: string[];
  scamTokenNames: string[];
  walletDrainPatterns: string[];
}

export interface OCRScanResult {
  imageUri: string;
  extraction: OCRExtraction;
  analysis: PhishingAnalysisResult;
}
