/**
 * Web stub for OCR Pipeline Service
 * The full OCR pipeline requires @qvac/sdk which is Node.js-only
 * This stub provides a web-compatible placeholder
 */

import type { OCRDemoCase, OCRScanResult } from './types';

class OCRPipelineServiceWeb {
  async analyzeImage(_imageUri: string, _imageSource: string): Promise<OCRScanResult> {
    throw new Error('OCR analysis is not available in web version. This feature requires native mobile capabilities.');
  }

  async analyzeDemoCase(demoCase: OCRDemoCase): Promise<OCRScanResult> {
    throw new Error('OCR analysis is not available in web version. This feature requires native mobile capabilities.');
  }

  async analyzeDemoCaseById(_caseId: string): Promise<OCRScanResult> {
    throw new Error('OCR analysis is not available in web version. This feature requires native mobile capabilities.');
  }
}

export const ocrPipelineService = new OCRPipelineServiceWeb();
