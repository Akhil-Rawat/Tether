/**
 * OCR Extraction Service
 * Extracts text and structured data from images using pattern matching
 */

import type { OCRExtraction } from './types';

export class OCRService {
  /**
   * Extract structured data from raw text
   */
  extractElements(rawText: string): OCRExtraction['extractedElements'] {
    return {
      addresses: this.extractAddresses(rawText),
      urls: this.extractUrls(rawText),
      tokens: this.extractTokens(rawText),
      phrases: this.extractPhrases(rawText),
      numbers: this.extractNumbers(rawText),
    };
  }

  /**
   * Extract Solana wallet addresses (Base58, 44 chars)
   */
  private extractAddresses(text: string): string[] {
    // Solana addresses: 44 char Base58 strings
    const solanaNaPattern = /\b[1-9A-HJ-NP-Z]{43,44}\b/g;

    // Ethereum addresses: 0x + 40 hex chars
    const ethPattern = /\b0x[a-fA-F0-9]{40}\b/g;

    const solanaAddrs = text.match(solanaNaPattern) || [];
    const ethAddrs = text.match(ethPattern) || [];

    return [...new Set([...solanaAddrs, ...ethAddrs])];
  }

  /**
   * Extract URLs
   */
  private extractUrls(text: string): string[] {
    const urlPattern =
      /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/\/=]*)/gi;

    const urls = text.match(urlPattern) || [];
    return [...new Set(urls)];
  }

  /**
   * Extract token symbols (ALL CAPS sequences)
   */
  private extractTokens(text: string): string[] {
    // Look for token-like patterns: 3-10 uppercase letters
    const tokenPattern = /\b[A-Z]{3,10}\b/g;
    const tokens = text.match(tokenPattern) || [];

    // Filter out common non-token words
    const excludeWords = [
      'THE',
      'AND',
      'FOR',
      'YOUR',
      'PLEASE',
      'VERIFY',
      'ACCOUNT',
      'WALLET',
      'TRANSACTION',
      'CONFIRM',
      'SIGN',
      'CONNECT',
    ];

    return tokens.filter((t) => !excludeWords.includes(t.toUpperCase()));
  }

  /**
   * Extract suspicious phrases
   */
  private extractPhrases(text: string): string[] {
    const phrases: string[] = [];

    // Look for sentences/phrases ending with punctuation
    const sentencePattern = /[^.!?]*[.!?]/g;
    const sentences = text.match(sentencePattern) || [];

    // Return top suspicious phrases (first 5)
    return sentences
      .map((s) => s.trim())
      .filter((s) => s.length > 10)
      .slice(0, 5);
  }

  /**
   * Extract numbers (potential amounts, timestamps)
   */
  private extractNumbers(text: string): string[] {
    const numberPattern = /\b\d+(?:\.\d+)?\b/g;
    const numbers = text.match(numberPattern) || [];
    return [...new Set(numbers.slice(0, 20))]; // Top 20 unique numbers
  }

  /**
   * Create OCR extraction from raw text
   */
  createExtraction(
    rawText: string,
    imageSource: 'camera' | 'upload' | 'qr' = 'upload'
  ): OCRExtraction {
    const id = `ocr-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    return {
      id,
      timestamp: Date.now(),
      rawText,
      extractedElements: this.extractElements(rawText),
      imageSource,
    };
  }
}

export const ocrService = new OCRService();
