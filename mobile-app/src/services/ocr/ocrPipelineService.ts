/**
 * OCR Pipeline Service
 * Automatically selects the correct implementation based on platform
 */

let implementation: any;

// Check if we're in a web environment
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
	// Web environment
	const webModule = require('./ocrPipelineService.web');
	implementation = webModule.ocrPipelineService;
} else {
	// Native environment - try to load native implementation
	try {
		const nativeModule = require('./ocrPipelineService.native');
		implementation = nativeModule.ocrPipelineService;
	} catch (error) {
		// Fallback to web if native fails
		const webModule = require('./ocrPipelineService.web');
		implementation = webModule.ocrPipelineService;
	}
}

export const ocrPipelineService = implementation;
