import React, { ReactNode } from "react";
import { View, StyleSheet, ViewStyle, Pressable } from "react-native";
import Animated from "react-native-reanimated";
import { Palette } from "@/constants/theme";
import { Radius, Spacing } from "@/constants/spacing";
import { Depth } from "@/constants/depth";
import { useKokiButtonPress } from "@/hooks/useKokiAnimations";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type KokiCardVariant = "normal" | "elevated" | "outlined" | "interactive";
export type KokiCardPadding = "none" | "sm" | "md" | "lg" | "xl" | "giant";

export interface KokiCardProps {
  children: ReactNode;
  variant?: KokiCardVariant;
  padding?: KokiCardPadding;
  onPress?: () => void;
  style?: ViewStyle;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityRole?: "button" | "none";
}

export function KokiCard({
  children,
  variant = "normal",
  padding = "md",
  onPress,
  style,
  testID,
  accessibilityLabel,
  accessibilityRole,
}: KokiCardProps) {
  const isInteractive = variant === "interactive" || Boolean(onPress);
  const { onPressIn, onPressOut, faceAnimatedStyle } = useKokiButtonPress(3);

  const getPadding = () => {
    switch (padding) {
      case "none": return 0;
      case "sm": return Spacing.sm;
      case "lg": return Spacing.lg;
      case "xl": return Spacing.xl;
      case "giant": return Spacing.xxl;
      case "md":
      default: return Spacing.md;
    }
  };

  const getVariantStyle = () => {
    switch (variant) {
      case "elevated":
        return [styles.elevated, Depth.styles.elevatedCard];
      case "outlined":
        return styles.outlined;
      case "interactive":
        return [styles.elevated, Depth.styles.subtleCard];
      case "normal":
      default:
        return [styles.normal, Depth.styles.subtleCard];
    }
  };

  if (isInteractive && onPress) {
    return (
      <AnimatedPressable
        testID={testID}
        accessibilityRole={accessibilityRole || "button"}
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[
          styles.base,
          getVariantStyle(),
          { padding: getPadding() },
          faceAnimatedStyle,
          style,
        ]}
      >
        {children}
      </AnimatedPressable>
    );
  }

  return (
    <View
      testID={testID}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.base,
        getVariantStyle(),
        { padding: getPadding() },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: Palette.pureWhite,
    borderRadius: Radius.large,
    overflow: "hidden",
  },
  normal: {
    borderWidth: 1,
    borderColor: Palette.cardOutline,
  },
  elevated: {
    borderWidth: 1,
    borderColor: Palette.borderSubtle,
  },
  outlined: {
    backgroundColor: Palette.softWhite,
    borderWidth: 2,
    borderColor: Palette.borderStrong,
  },
});
