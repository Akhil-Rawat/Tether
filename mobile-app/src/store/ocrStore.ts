import { create } from 'zustand';
import type { OCRDemoCase, OCRScanResult } from '../services/ocr/types';
import { ocrPipelineService } from '../services/ocr/ocrPipelineService';
import { getDemoCase } from '../services/ocr/demoCases';

interface OCRStoreState {
  currentScan: OCRScanResult | null;
  currentDemoCase: OCRDemoCase | null;
  isScanning: boolean;
  error: string | null;
  scanImage: (imageUri: string, imageSource: OCRDemoCase['imageSource']) => Promise<OCRScanResult | null>;
  loadDemoCase: (demoCaseId: string) => Promise<OCRScanResult | null>;
  clearScan: () => void;
}

export const useOCRStore = create<OCRStoreState>((set) => ({
  currentScan: null,
  currentDemoCase: null,
  isScanning: false,
  error: null,

  scanImage: async (imageUri, imageSource) => {
    set({ isScanning: true, error: null });

    try {
      const scan = await ocrPipelineService.analyzeImage(imageUri, imageSource);
      set({ currentScan: scan, currentDemoCase: null, isScanning: false, error: null });
      return scan;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'OCR scan failed';
      set({ isScanning: false, error: message });
      return null;
    }
  },

  loadDemoCase: async (demoCaseId) => {
    const demoCase = getDemoCase(demoCaseId);
    if (!demoCase) {
      set({ error: 'Unknown demo case' });
      return null;
    }

    set({ isScanning: true, error: null, currentDemoCase: demoCase });

    try {
      const scan = await ocrPipelineService.analyzeDemoCase(demoCase);
      set({ currentScan: scan, isScanning: false, error: null });
      return scan;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Demo analysis failed';
      set({ isScanning: false, error: message });
      return null;
    }
  },

  clearScan: () => set({ currentScan: null, currentDemoCase: null, isScanning: false, error: null }),
}));