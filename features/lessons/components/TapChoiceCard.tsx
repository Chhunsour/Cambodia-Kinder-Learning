import React, { useEffect } from "react";
import {
  AccessibilityState,
  Image,
  Platform,
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
import { TapChoiceOption, TapChoiceLayout } from "../types";
import { resolveImageAsset } from "@/features/contentPacks/services/assetResolver";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface TapChoiceCardProps {
  option: TapChoiceOption;
  layout: "text" | "image" | "image_label";
  isSelected: boolean;
  isCorrect: boolean;
  isIncorrect: boolean;
  isLocked: boolean;
  onPress: () => void;
  locale?: string;
  style?: ViewStyle;
}

export const TapChoiceCard: React.FC<TapChoiceCardProps> = React.memo(({
  option,
  layout,
  isSelected,
  isCorrect,
  isIncorrect,
  isLocked,
  onPress,
  locale = "km",
  style,
}) => {
  const shakeX = useSharedValue(0);
  const scale = useSharedValue(1);

  // Reanimated shake on incorrect selection
  useEffect(() => {
    if (isIncorrect) {
      shakeX.value = withSequence(
        withTiming(-8, { duration: 55 }),
        withTiming(8, { duration: 55 }),
        withTiming(-6, { duration: 55 }),
        withTiming(6, { duration: 55 }),
        withTiming(0, { duration: 55 })
      );
    }
  }, [isIncorrect, shakeX]);

  // Reanimated bouncy pop on correct selection
  useEffect(() => {
    if (isCorrect) {
      scale.value = withSequence(
        withTiming(1.06, { duration: 140 }),
        withSpring(1, AnimationPresets.bouncySpring)
      );
    }
  }, [isCorrect, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: shakeX.value },
      { scale: scale.value },
    ],
  }));

  // Resolve display text based on language preference
  const isKm = locale === "km";
  const displayLabel = isKm
    ? option.labelKm || option.label || ""
    : option.labelEn || option.label || "";

  // Dynamic color palette based on state
  let backgroundColor: string = Palette.pureWhite;
  let borderColor: string = Palette.cardOutline;
  let extrusionColor: string = Palette.borderStrong;
  let textColor: string = Palette.primaryText;

  if (isCorrect) {
    backgroundColor = "#EDF9EC";
    borderColor = Palette.green;
    extrusionColor = Palette.darkGreen;
    textColor = Palette.darkGreen;
  } else if (isIncorrect) {
    // Gentle warm coral (never harsh red)
    backgroundColor = "#FFF3EB";
    borderColor = "#FFA372";
    extrusionColor = "#D95600";
    textColor = Palette.primaryText;
  } else if (isSelected) {
    backgroundColor = Palette.warmCream;
    borderColor = Palette.primaryOrange;
    extrusionColor = Palette.deepOrange;
  }

  // Accessibility state and description
  const a11yState: AccessibilityState = {
    selected: isSelected,
    disabled: isLocked,
  };

  const a11yLabel =
    option.accessibilityLabel ||
    `${displayLabel || option.icon || "Option"}${
      isCorrect ? ", Correct" : isIncorrect ? ", Incorrect, try again" : ""
    }`;

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={isLocked}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityState={a11yState}
      style={[styles.wrapper, animatedStyle, style]}
    >
      {/* 3D Bottom Extrusion Rim */}
      <View style={[styles.extrusion, { backgroundColor: extrusionColor }]} />

      {/* Card Face Surface */}
      <View
        style={[
          styles.face,
          layout === "image" && styles.faceImage,
          layout === "image_label" && styles.faceImageLabel,
          { backgroundColor, borderColor },
          isCorrect && styles.faceCorrect,
          isIncorrect && styles.faceIncorrect,
        ]}
      >
        {/* Color Swatch Visual */}
        {option.colorHex && (
          <View
            style={[
              styles.colorSwatch,
              { backgroundColor: option.colorHex },
              layout === "image_label" && styles.colorSwatchSmall,
            ]}
          />
        )}

        {/* Emoji / Symbol Visual */}
        {option.icon && !option.colorHex && !option.imageKey && (
          <Text
            style={[
              styles.iconVisual,
              layout === "image" && styles.iconVisualLarge,
              layout === "image_label" && styles.iconVisualMedium,
            ]}
            accessibilityElementsHidden={true}
          >
            {option.icon}
          </Text>
        )}

        {/* Downloaded / Bundled Image Visual */}
        {option.imageKey && (
          <Image
            source={resolveImageAsset(option.imageKey)}
            style={[
              styles.imageVisual,
              layout === "image" && styles.imageVisualLarge,
              layout === "image_label" && styles.imageVisualMedium,
            ]}
            resizeMode="contain"
          />
        )}

        {/* Text Label & Optional Khmer Helper */}
        {displayLabel ? (
          <View style={styles.labelContainer}>
            <Text
              variant={layout === "text" ? "heading1" : "title"}
              weight="800"
              align="center"
              style={[
                styles.label,
                { color: textColor },
                layout === "text" && styles.labelTextOnly,
              ]}
            >
              {displayLabel}
            </Text>
            {isKm && (option.helperKm || option.helperText) ? (
              <Text
                variant="caption"
                weight="700"
                align="center"
                color={Palette.secondaryText}
                style={styles.helperLabel}
              >
                {option.helperKm || option.helperText}
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* Success Checkmark Badge */}
        {isCorrect && (
          <View style={styles.checkmarkBadge}>
            <Text style={styles.checkmarkText}>✓</Text>
          </View>
        )}
      </View>
    </AnimatedPressable>
  );
});

TapChoiceCard.displayName = "TapChoiceCard";

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
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
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderBottomWidth: 2,
    position: "relative",
  },
  faceImage: {
    paddingVertical: Spacing.lg,
    minHeight: 96,
  },
  faceImageLabel: {
    paddingVertical: Spacing.md,
    gap: Spacing.xs,
    minHeight: 104,
  },
  faceCorrect: {
    borderWidth: 2.5,
  },
  faceIncorrect: {
    borderWidth: 2,
  },
  colorSwatch: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 3,
    borderColor: "rgba(0,0,0,0.1)",
    marginBottom: Spacing.xs,
  },
  colorSwatchSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginBottom: 2,
  },
  iconVisual: {
    fontSize: 32,
    lineHeight: 40,
  },
  iconVisualLarge: {
    fontSize: 44,
    lineHeight: 52,
  },
  iconVisualMedium: {
    fontSize: 34,
    lineHeight: 42,
  },
  imageVisual: {
    width: 60,
    height: 60,
  },
  imageVisualLarge: {
    width: 84,
    height: 84,
  },
  imageVisualMedium: {
    width: 48,
    height: 48,
    marginBottom: 4,
  },
  labelContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    letterSpacing: 0.3,
    // Generous line height ensures Khmer subscripts and diacritics never clip
    lineHeight: 34,
  },
  helperLabel: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  labelTextOnly: {
    fontSize: 28,
    lineHeight: 38,
  },
  checkmarkBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: Radius.pill,
    backgroundColor: Palette.green,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 3,
  },
  checkmarkText: {
    color: Palette.pureWhite,
    fontSize: 15,
    fontWeight: "900",
  },
});
