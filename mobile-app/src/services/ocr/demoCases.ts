import type { OCRDemoCase } from './types';

export const OCR_DEMO_CASES: OCRDemoCase[] = [
  {
    id: 'fake-wallet-login',
    title: 'Fake Wallet Login',
    description: 'Impersonation screen that tries to capture wallet credentials.',
    imageSource: 'upload',
    previewLabel: 'Phantom / Solflare lookalike',
    rawText:
      'Connect wallet now to continue. Urgent: account locked. Verify your wallet at https://phantom-app.co and sign message to restore access.',
  },
  {
    id: 'malicious-qr-drain',
    title: 'Malicious QR Payment',
    description: 'QR-based payment request with a hidden wallet drain prompt.',
    imageSource: 'qr',
    previewLabel: 'Scam QR transfer',
    rawText:
      'Scan to approve unlimited spending. Contract address 0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef. Limited time offer. Free tokens await.',
  },
  {
    id: 'scam-token-page',
    title: 'Scam Token Page',
    description: 'Token page with urgency language and pump-and-dump language.',
    imageSource: 'upload',
    previewLabel: 'Airdrop / reward lure',
    rawText:
      'Congratulations! Claim your reward airdrop now. BabyDoge presale ends today. Connect wallet and approve spending to claim bonus.',
  },
];

export const getDemoCase = (caseId: string): OCRDemoCase | undefined => {
  return OCR_DEMO_CASES.find((demoCase) => demoCase.id === caseId);
};