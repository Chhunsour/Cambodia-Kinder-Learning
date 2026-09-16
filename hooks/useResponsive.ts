import { useWindowDimensions, Platform } from "react-native";
import { Layout } from "@/constants/layout";

// Baseline dimensions for scaling (iPhone 14/15: 390 x 844)
const GUIDELINE_BASE_WIDTH = 390;
const GUIDELINE_BASE_HEIGHT = 844;

export interface ResponsiveInfo {
  width: number;
  height: number;
  isTablet: boolean;
  isLandscape: boolean;
  isSmallPhone: boolean;
  scale: (size: number) => number;
  verticalScale: (size: number) => number;
  moderateScale: (size: number, factor?: number) => number;
  maxContainerWidth: number;
  contentPadding: number;
}

export function useResponsive(): ResponsiveInfo {
  const { width, height } = useWindowDimensions();

  const isLandscape = width > height;
  const shortestSide = Math.min(width, height);
  const longestSide = Math.max(width, height);

  // Tablet detection: shortest dimension >= 600 or width >= 768
  const isTablet = shortestSide >= 600 || width >= Layout.breakpoints.tabletMinWidth;
  const isSmallPhone = shortestSide < 375;

  const scale = (size: number): number => {
    const ratio = (isLandscape ? height : width) / GUIDELINE_BASE_WIDTH;
    const factor = isTablet ? Math.min(ratio, 1.4) : ratio;
    return Math.round(size * factor);
  };

  const verticalScale = (size: number): number => {
    const ratio = (isLandscape ? width : height) / GUIDELINE_BASE_HEIGHT;
    const factor = isTablet ? Math.min(ratio, 1.4) : ratio;
    return Math.round(size * factor);
  };

  const moderateScale = (size: number, factor = 0.5): number => {
    const scaled = scale(size);
    return Math.round(size + (scaled - size) * factor);
  };

  const maxContainerWidth = isTablet 
    ? Layout.containers.maxContentWidth 
    : width;

  const contentPadding = isTablet ? 32 : isSmallPhone ? 12 : 16;

  return {
    width,
    height,
    isTablet,
    isLandscape,
    isSmallPhone,
    scale,
    verticalScale,
    moderateScale,
    maxContainerWidth,
    contentPadding,
  };
}
