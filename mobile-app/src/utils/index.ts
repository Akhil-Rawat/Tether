/**
 * Utility Functions
 */

/**
 * Format a number as currency (SOL)
 */
export const formatSOL = (amount: number): string => {
  return `${amount.toFixed(4)} SOL`;
};

/**
 * Format address with ellipsis
 */
export const truncateAddress = (address: string, chars = 8): string => {
  if (!address) return "";
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
};

/**
 * Get risk level label from score
 */
export const getRiskLevel = (score: number): string => {
  if (score >= 75) return "CRITICAL";
  if (score >= 50) return "HIGH";
  if (score >= 25) return "MEDIUM";
  return "LOW";
};

/**
 * Format timestamp to readable time
 */
export const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Format timestamp to readable date
 */
export const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

/**
 * Calculate time until a unix timestamp
 */
export const timeUntil = (timestamp: number): string => {
  const now = Date.now();
  const diff = Math.max(0, timestamp - now);

  const seconds = Math.floor((diff / 1000) % 60);
  const minutes = Math.floor((diff / 1000 / 60) % 60);
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

/**
 * Validate Solana address format
 */
export const isValidSolanaAddress = (address: string): boolean => {
  // Use Solana PublicKey constructor for robust validation
  try {
    // Lazy import to avoid bundling issues in non-solana contexts
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PublicKey } = require("@solana/web3.js");
    // Will throw if invalid
    // eslint-disable-next-line no-new
    new PublicKey(address);
    return true;
  } catch (e) {
    return false;
  }
};
