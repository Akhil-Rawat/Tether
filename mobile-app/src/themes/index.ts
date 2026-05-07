/**
 * Guardian Theme
 * Dark modern, security-focused aesthetic with Apple-like minimalism
 */

export const Colors = {
  // Primary
  primary: '#0066FF', // Solana blue
  primaryDark: '#0052CC',
  primaryLight: '#3385FF',

  // Accent
  accent: '#FF6B35', // Risk/warning orange
  accentDark: '#E85A24',
  accentLight: '#FF8557',

  // Success/Decision colors
  success: '#00D944', // For ALLOW decisions
  warning: '#FFB84D', // For DELAY decisions
  error: '#FF3B30', // For REJECT decisions
  partial: '#A2845E', // For PARTIAL decisions

  // Neutrals - Dark mode palette
  background: '#0A0E27', // Very dark blue-black
  surface: '#1A1F3A', // Slightly lighter surface
  surfaceLight: '#242A45', // For cards/surfaces
  border: '#3A4060', // Border color
  divider: '#2A3050', // Subtle divider

  // Text colors
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A8B8', // Muted text
  textTertiary: '#7A8290', // Even more muted

  // Semantic
  lockIcon: '#FFD60A', // Yellow/gold for security lock
  shieldIcon: '#30B0C0', // Teal for shield
};

export const Typography = {
  h1: {
    fontSize: 32,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 28,
    fontWeight: '600' as const,
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 24,
    fontWeight: '600' as const,
    letterSpacing: 0,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodyStrong: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  caption: {
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 18,
  },
  captionStrong: {
    fontSize: 13,
    fontWeight: '600' as const,
    lineHeight: 18,
  },
  tiny: {
    fontSize: 11,
    fontWeight: '400' as const,
    lineHeight: 14,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const BorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 24,
};

export const Shadows = {
  sm: {
    elevation: 2,
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  md: {
    elevation: 4,
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  lg: {
    elevation: 8,
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
};

export const Theme = {
  colors: Colors,
  typography: Typography,
  spacing: Spacing,
  borderRadius: BorderRadius,
  shadows: Shadows,
};

export type Theme = typeof Theme;
