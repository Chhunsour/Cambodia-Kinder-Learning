import React, { useEffect } from "react";
import {
  AccessibilityState,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Text } from "@/components/ui/Text";
import { Palette } from "@/constants/theme";
import { Radius, Spacing, TouchTarget } from "@/constants/spacing";
import { AnimationPresets } from "@/hooks/useAnimation";
import { MatchingItem } from "../types";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Distinct gentle color accents for visually connecting completed pairs
export const PAIR_ACCENT_COLORS = [
  "#58B947", // Green
  "#0284C7", // Sky Blue
  "#8B5CF6", // Purple
  "#FC6E00", // Warm Orange
  "#EC4899", // Pink
];

export interface MatchingCardProps {
  item: MatchingItem;
  side: "left" | "right";
  isSelected: boolean;
  isCompleted: boolean;
  isIncorrect: boolean;
  pairColorIndex?: number;
  onPress: () => void;
  onLayout?: (event: LayoutChangeEvent) => void;
  locale?: string;
  style?: ViewStyle;
}

export const MatchingCard: React.FC<MatchingCardProps> = React.memo(({
  item,
  side,
  isSelected,
  isCompleted,
  isIncorrect,
  pairColorIndex = 0,
  onPress,
  onLayout,
  locale = "km",
  style,
}) => {
  const shakeX = useSharedValue(0);
  const scale = useSharedValue(1);

  // Gentle horizontal shake on wrong match
  useEffect(() => {
    if (isIncorrect) {
      shakeX.value = withSequence(
        withTiming(-7, { duration: 55 }),
        withTiming(7, { duration: 55 }),
        withTiming(-5, { duration: 55 }),
        withTiming(5, { duration: 55 }),
        withTiming(0, { duration: 55 })
      );
    }
  }, [isIncorrect, shakeX]);

  // Cheerful bouncy pop on correct match
  useEffect(() => {
    if (isCompleted) {
      scale.value = withSequence(
        withTiming(1.05, { duration: 120 }),
        withSpring(1, AnimationPresets.bouncySpring)
      );
    }
  }, [isCompleted, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: shakeX.value },
      { scale: isSelected ? 1.03 : scale.value },
    ],
  }));

  const isKm = locale === "km";
  const displayLabel = isKm
    ? item.labelKm || item.label || ""
    : item.labelEn || item.label || "";

  const pairAccentColor = PAIR_ACCENT_COLORS[pairColorIndex % PAIR_ACCENT_COLORS.length];

  // Dynamic colors
  let backgroundColor: string = Palette.pureWhite;
  let borderColor: string = Palette.cardOutline;
  let extrusionColor: string = Palette.borderStrong;
  let textColor: string = Palette.primaryText;

  if (isCompleted) {
    backgroundColor = "#EDF9EC";
    borderColor = pairAccentColor;
    extrusionColor = "#1D5C2E";
    textColor = Palette.darkGreen;
  } else if (isIncorrect) {
    backgroundColor = "#FFF3EB";
    borderColor = "#FFA372";
    extrusionColor = "#D95600";
    textColor = Palette.primaryText;
  } else if (isSelected) {
    backgroundColor = Palette.warmCream;
    borderColor = Palette.primaryOrange;
    extrusionColor = Palette.deepOrange;
    textColor = Palette.deepOrange;
  }

  const a11yState: AccessibilityState = {
    selected: isSelected,
    disabled: isCompleted,
  };

  const a11yLabel =
    item.accessibilityLabel ||
    `${displayLabel || item.icon || "Item"}, ${side} matching option${
      isCompleted ? ", matched" : isSelected ? ", selected" : ""
    }`;

  const isSingleLetterOrNumber =
    displayLabel.length === 1 && !item.icon && !item.colorHex;

  return (
    <AnimatedPressable
      onPress={onPress}
      onLayout={onLayout}
      disabled={isCompleted}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityState={a11yState}
      style={[styles.wrapper, animatedStyle, style]}
    >
      {/* 3D Bottom Extrusion Rim */}
      <View style={[styles.extrusion, { backgroundColor: extrusionColor }]} />

      {/* Card Face */}
      <View
        style={[
          styles.face,
          { backgroundColor, borderColor },
          isSelected && styles.faceSelected,
          isCompleted && styles.faceCompleted,
          isIncorrect && styles.faceIncorrect,
        ]}
      >
        {/* Pair Color Indicator Tag */}
        {isCompleted && (
          <View
            style={[
              styles.pairIndicator,
              side === "left" ? styles.pairIndicatorLeft : styles.pairIndicatorRight,
              { backgroundColor: pairAccentColor },
            ]}
          />
        )}

        {/* Color Swatch */}
        {item.colorHex && (
          <View
            style={[styles.colorSwatch, { backgroundColor: item.colorHex }]}
          />
        )}

        {/* Icon / Emoji */}
        {item.icon && (
          <Text
            style={[
              styles.iconText,
              !displayLabel && styles.iconTextLarge,
            ]}
            accessibilityElementsHidden={true}
          >
            {item.icon}
          </Text>
        )}

        {/* Text Label (Khmer words, English labels, numbers, or letters) */}
        {displayLabel ? (
          <Text
            variant={isSingleLetterOrNumber ? "heading1" : "title"}
            weight="800"
            align="center"
            style={[
              styles.label,
              { color: textColor },
              isSingleLetterOrNumber && styles.singleCharLabel,
            ]}
          >
            {displayLabel}
          </Text>
        ) : null}

        {/* Checkmark Badge on Completion */}
        {isCompleted && (
          <View
            style={[
              styles.checkmarkBadge,
              { backgroundColor: pairAccentColor },
            ]}
          >
            <Text style={styles.checkmarkText}>✓</Text>
          </View>
        )}
      </View>
    </AnimatedPressable>
  );
});

MatchingCard.displayName = "MatchingCard";

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
    width: "100%",
    minHeight: TouchTarget.kid,
  },
  extrusion: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    top: 5,
    borderRadius: Radius.lg,
  },
  face: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderBottomWidth: 2,
    position: "relative",
    minHeight: 68,
    gap: Spacing.xs,
  },
  faceSelected: {
    borderWidth: 2.5,
  },
  faceCompleted: {
    borderWidth: 2.5,
  },
  faceIncorrect: {
    borderWidth: 2,
  },
  pairIndicator: {
    position: "absolute",
    top: 6,
    width: 6,
    height: 18,
    borderRadius: 3,
  },
  pairIndicatorLeft: {
    right: 6,
  },
  pairIndicatorRight: {
    left: 6,
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "rgba(0,0,0,0.1)",
  },
  iconText: {
    fontSize: 28,
    lineHeight: 34,
  },
  iconTextLarge: {
    fontSize: 38,
    lineHeight: 46,
  },
  label: {
    lineHeight: 30,
    letterSpacing: 0.2,
  },
  singleCharLabel: {
    fontSize: 30,
    lineHeight: 38,
  },
  checkmarkBadge: {
    position: "absolute",
    bottom: 4,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  checkmarkText: {
    color: Palette.pureWhite,
    fontSize: 12,
    fontWeight: "900",
  },
});
