/**
 * Koki Spacing & Radius Tokens
 * Standardized 4, 8, 12, 16, 20, 24, 32, 40, 48 tokens.
 * Friendly large rounded shapes.
 */
export const Spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  base: 16, // alias for md
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  giant: 48,
} as const;

export const Radius = {
  small: 8,
  sm: 8, // alias for small
  medium: 14,
  md: 14, // alias for medium
  large: 20,
  lg: 20, // alias for large
  xl: 28,
  pill: 9999,
  circle: 9999,
} as const;

export const TouchTarget = {
  min: 48,
  minKidTouchTarget: 48,
  kid: 56,
  recommendedKidTouchTarget: 56,
  large: 64,
  kidButtonHeight: 64,
} as const;
