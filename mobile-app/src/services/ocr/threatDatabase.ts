/**
 * Threat Database & Phishing Detection Patterns
 * Offline-first local threat intelligence
 */

import type { ThreatDatabase, ThreatLevel } from './types';

export const THREAT_DATABASE: ThreatDatabase = {
  // Known phishing/scam domains (common phishing targets)
  phishingDomains: [
    'coinbase.com', // If seen as "coinbase.co", "coinbase.org", etc.
    'metamask.io',
    'phantom.app',
    'solflare.com',
    'uniswap.org',
    'opensea.io',
    'etherscan.io',
    'pancakeswap.finance',
    'raydium.io',
  ],

  // Suspicious keywords associated with scams
  suspiciousKeywords: [
    'claim your reward',
    'verify your wallet',
    'confirm identity',
    'update security',
    'unusual activity detected',
    'account locked',
    'immediate action required',
    'limited time offer',
    'you have won',
    'congratulations',
    'claim bonus',
    'airdrop',
    'free tokens',
    'private sale',
    'exclusive offer',
  ],

  // Urgency-inducing phrases (social engineering)
  urgencyPhrases: [
    'urgent',
    'act now',
    'immediate',
    'limited time',
    'expires',
    'don\'t miss out',
    'only today',
    'hurry',
    'last chance',
    'now or never',
    'quick action',
    'time sensitive',
  ],

  // Suspicious token names (pump & dump, rug pull patterns)
  scamTokenNames: [
    'SafeMoon',
    'Shiba',
    'Doge',
    'ElonCoin',
    'MarsToken',
    'MoonRocket',
    'GoldenDoge',
    'BabyDoge',
    'CumRocket',
    'Safemars',
  ],

  // Wallet drain patterns
  walletDrainPatterns: [
    'approve spending',
    'unlimited approval',
    'contract address',
    'interact with contract',
    'sign transaction',
    'verify ownership',
    'prove wallet',
  ],
};

// Phishing domain variations to detect
export const generatePhishingVariations = (domain: string): string[] => {
  const baseDomain = domain.split('/')[0];
  const variations = [
    baseDomain,
    `www.${baseDomain}`,
    baseDomain.replace('.com', '.co'),
    baseDomain.replace('.com', '.net'),
    baseDomain.replace('.com', '.org'),
    baseDomain.replace('.io', '.co'),
    baseDomain.replace(/\./, '-'),
  ];
  return variations;
};

export const getThreatLevel = (score: number): ThreatLevel => {
  if (score >= 80) return 'CRITICAL';
  if (score >= 60) return 'HIGH';
  if (score >= 40) return 'MEDIUM';
  if (score >= 20) return 'LOW';
  return 'NONE';
};

export const getThreatColor = (level: ThreatLevel): string => {
  const colors: Record<ThreatLevel, string> = {
    CRITICAL: '#FF1744', // Deep red
    HIGH: '#FF6E40',      // Deep orange
    MEDIUM: '#FFB300',    // Amber
    LOW: '#FDD835',       // Yellow
    NONE: '#66BB6A',      // Green
  };
  return colors[level];
};
