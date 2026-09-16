import { useWindowDimensions } from "react-native";
import { Spacing } from "@/constants/spacing";

export type DeviceTier = "smallPhone" | "normalPhone" | "largePhone" | "tablet";

export interface KokiResponsive {
  width: number;
  height: number;
  deviceTier: DeviceTier;
  isTablet: boolean;
  isSmallPhone: boolean;
  isLandscape: boolean;
  isPortrait: boolean;

  // Layout bounds
  horizontalPadding: number;
  maxContentWidth: number;
  cardPadding: number;

  // Bounded scaling helpers (prevents gigantic text/buttons on tablets)
  scaleFont: (size: number) => number;
  scaleButtonHeight: (baseHeight: number) => number;
}

const TABLET_MIN_SHORT_SIDE = 600;
const SMALL_PHONE_MAX_WIDTH = 374;
const NORMAL_PHONE_MAX_WIDTH = 430;

export function useKokiResponsive(): KokiResponsive {
  const { width, height } = useWindowDimensions();

  const shortestSide = Math.min(width, height);
  const isLandscape = width > height;
  const isPortrait = !isLandscape;

  const isTablet = shortestSide >= TABLET_MIN_SHORT_SIDE;
  const isSmallPhone = !isTablet && shortestSide <= SMALL_PHONE_MAX_WIDTH;
  const isLargePhone = !isTablet && shortestSide > NORMAL_PHONE_MAX_WIDTH;

  let deviceTier: DeviceTier = "normalPhone";
  if (isTablet) {
    deviceTier = "tablet";
  } else if (isSmallPhone) {
    deviceTier = "smallPhone";
  } else if (isLargePhone) {
    deviceTier = "largePhone";
  }

  // Padding tokens
  const horizontalPadding = isTablet 
    ? Spacing.xxl 
    : isLargePhone 
    ? Spacing.lg 
    : isSmallPhone 
    ? Spacing.sm 
    : Spacing.md;

  const cardPadding = isTablet ? Spacing.xl : Spacing.md;
  const maxContentWidth = isTablet ? 720 : width;

  // Bounded font scaling (small phone: 0.9x, normal: 1x, large phone: 1.05x, tablet: max 1.15x)
  const scaleFont = (size: number): number => {
    if (isSmallPhone) return Math.round(size * 0.92);
    if (isTablet) return Math.round(size * 1.12);
    if (isLargePhone) return Math.round(size * 1.04);
    return size;
  };

  // Bounded button height scaling
  const scaleButtonHeight = (baseHeight: number): number => {
    if (isSmallPhone) return Math.max(48, Math.round(baseHeight * 0.92));
    if (isTablet) return Math.round(baseHeight * 1.15);
    return baseHeight;
  };

  return {
    width,
    height,
    deviceTier,
    isTablet,
    isSmallPhone,
    isLandscape,
    isPortrait,
    horizontalPadding,
    maxContentWidth,
    cardPadding,
    scaleFont,
    scaleButtonHeight,
  };
}
