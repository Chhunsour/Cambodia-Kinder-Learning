import React, { ReactNode } from "react";
import { 
  Pressable, 
  View, 
  StyleSheet, 
  ViewStyle, 
  ActivityIndicator 
} from "react-native";
import Animated from "react-native-reanimated";
import { Colors } from "@/constants/colors";
import { Radius, TouchTarget, Spacing } from "@/constants/spacing";
import { Layout } from "@/constants/layout";
import { usePressAnimation } from "@/hooks/useAnimation";
import { Text } from "./Text";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type ButtonVariant = "primary" | "secondary" | "mekong" | "palm" | "lotus";

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  style?: ViewStyle;
  testID?: string;
}

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
  icon,
  style,
  testID,
}: ButtonProps) {
  const { onPressIn, onPressOut, animatedStyle } = usePressAnimation();

  const getVariantStyles = () => {
    switch (variant) {
      case "mekong":
        return {
          topBg: Colors.mekong.base,
          bottomBg: Colors.mekong.dark,
          textColor: Colors.text.inverse,
        };
      case "palm":
        return {
          topBg: Colors.palm.base,
          bottomBg: Colors.palm.dark,
          textColor: Colors.text.inverse,
        };
      case "lotus":
        return {
          topBg: Colors.lotus.base,
          bottomBg: Colors.lotus.dark,
          textColor: Colors.text.inverse,
        };
      case "secondary":
        return {
          topBg: Colors.background.card,
          bottomBg: Colors.border.strong,
          textColor: Colors.text.primary,
        };
      case "primary":
      default:
        return {
          topBg: Colors.primary.base,
          bottomBg: Colors.primary.dark,
          textColor: Colors.text.inverse,
        };
    }
  };

  const { topBg, bottomBg, textColor } = getVariantStyles();

  return (
    <AnimatedPressable
      testID={testID}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled || loading}
      style={[styles.wrapper, animatedStyle, style]}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
    >
      {/* 3D Bottom Base Layer */}
      <View style={[styles.bottomLayer, { backgroundColor: disabled ? Colors.game.lockGray : bottomBg }]} />
      
      {/* Top Interactive Surface */}
      <View style={[
        styles.topLayer, 
        { backgroundColor: disabled ? "#CBD5E1" : topBg },
      ]}>
        {loading ? (
          <ActivityIndicator color={textColor} size="small" />
        ) : (
          <View style={styles.contentRow}>
            {icon && <View style={styles.iconContainer}>{icon}</View>}
            <Text variant="titleSmall" color={textColor} weight="700">
              {label}
            </Text>
          </View>
        )}
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    minHeight: TouchTarget.recommendedKidTouchTarget,
    position: "relative",
    marginVertical: Spacing.xs,
  },
  bottomLayer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    top: 6,
    borderRadius: Radius.lg,
  },
  topLayer: {
    minHeight: TouchTarget.recommendedKidTouchTarget - 6,
    borderRadius: Radius.lg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    ...Layout.elevation.button3D,
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    marginRight: Spacing.sm,
  },
});
