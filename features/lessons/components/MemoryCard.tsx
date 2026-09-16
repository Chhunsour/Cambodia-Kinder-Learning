import React, { useEffect } from "react";
import {
  AccessibilityState,
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import Animated, {
  interpolate,
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
import { MemoryCardContent } from "../types";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface MemoryCardProps {
  content: MemoryCardContent;
  isRevealed: boolean;
  isMatched: boolean;
  isWiggling?: boolean;
  cardIndex?: number;
  totalCards?: number;
  onPress: () => void;
  disabled?: boolean;
  locale?: string;
  style?: ViewStyle;
}

export const MemoryCard: React.FC<MemoryCardProps> = React.memo(({
  content,
  isRevealed,
  isMatched,
  isWiggling = false,
  cardIndex = 0,
  totalCards = 6,
  onPress,
  disabled = false,
  locale = "km",
  style,
}) => {
  // Flip animation shared value: 0 = face down, 1 = face up
  const flipProgress = useSharedValue(isRevealed || isMatched ? 1 : 0);
  const shakeX = useSharedValue(0);
  const popScale = useSharedValue(1);

  // Sync flip progress smoothly when revealed / matched state changes
  useEffect(() => {
    if (isRevealed || isMatched) {
      flipProgress.value = withTiming(1, { duration: 280 });
    } else {
      flipProgress.value = withTiming(0, { duration: 260 });
    }
  }, [isRevealed, isMatched, flipProgress]);

  // Gentle horizontal shake on mismatch
  useEffect(() => {
    if (isWiggling) {
      shakeX.value = withSequence(
        withTiming(-7, { duration: 45 }),
        withTiming(7, { duration: 45 }),
        withTiming(-5, { duration: 45 }),
        withTiming(5, { duration: 45 }),
        withTiming(0, { duration: 45 })
      );
    }
  }, [isWiggling, shakeX]);

  // Cheerful bouncy pop on correct match
  useEffect(() => {
    if (isMatched) {
      popScale.value = withSequence(
        withTiming(1.08, { duration: 130 }),
        withSpring(1, AnimationPresets.bouncySpring)
      );
    } else {
      popScale.value = withSpring(1);
    }
  }, [isMatched, popScale]);

  // Overall card animated container
  const containerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: shakeX.value },
      { scale: popScale.value },
    ],
  }));

  // Front face (Face Down) animation: rotates 0deg -> 180deg, fades out at 0.5
  const frontAnimatedStyle = useAnimatedStyle(() => {
    const rotateValue = interpolate(flipProgress.value, [0, 1], [0, 180]);
    return {
      transform: [{ rotateY: `${rotateValue}deg` }],
      opacity: flipProgress.value >= 0.5 ? 0 : 1,
      zIndex: flipProgress.value < 0.5 ? 2 : 1,
    };
  });

  // Back face (Revealed) animation: rotates 180deg -> 360deg (upright!), fades in at 0.5
  const backAnimatedStyle = useAnimatedStyle(() => {
    const rotateValue = interpolate(flipProgress.value, [0, 1], [180, 360]);
    return {
      transform: [{ rotateY: `${rotateValue}deg` }],
      opacity: flipProgress.value >= 0.5 ? 1 : 0,
      zIndex: flipProgress.value >= 0.5 ? 2 : 1,
    };
  });

  const isKm = locale === "km";
  const displayLabel = isKm
    ? content.labelKm || content.label || ""
    : content.labelEn || content.label || "";

  const isSingleLetterOrNumber =
    displayLabel.length <= 2 && !content.icon && !content.colorHex;

  // Accessibility formatting: NEVER leak hidden card content before flip!
  const a11yLabel = isRevealed || isMatched
    ? `${content.accessibilityLabel || displayLabel || content.icon || "Card"}, ${
        isMatched ? (isKm ? "បានផ្គូផ្គង" : "matched") : (isKm ? "បានបើក" : "revealed")
      }`
    : isKm
    ? `សន្លឹកបៀទី ${cardIndex + 1} ក្នុងចំណោម ${totalCards} បិទមុខ`
    : `Memory card ${cardIndex + 1} of ${totalCards}, face down`;

  const a11yState: AccessibilityState = {
    disabled: disabled || isRevealed || isMatched,
    expanded: isRevealed || isMatched,
  };

  return (
    <AnimatedPressable
      onPress={disabled || isRevealed || isMatched ? undefined : onPress}
      disabled={disabled || isRevealed || isMatched}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityState={a11yState}
      style={[styles.cardWrapper, containerAnimatedStyle, style]}
    >
      {/* ============================================================ */}
      {/* 1. FRONT FACE (FACE DOWN - PLAYFUL KOKI PATTERN)             */}
      {/* ============================================================ */}
      <Animated.View style={[styles.cardFace, styles.frontFace, frontAnimatedStyle]}>
        {/* 3D Extrusion Lip */}
        <View style={[styles.extrusion, styles.frontExtrusion]} />

        {/* Card Surface */}
        <View style={styles.frontSurface}>
          {/* Subtle Decorative Pattern Ring */}
          <View style={styles.patternMedallion}>
            <Text style={styles.frontMascotIcon}>🐾</Text>
          </View>
        </View>
      </Animated.View>

      {/* ============================================================ */}
      {/* 2. BACK FACE (REVEALED CONTENT - EMOJI / KHMER / WORDS)      */}
      {/* ============================================================ */}
      <Animated.View
        style={[
          styles.cardFace,
          styles.backFace,
          isMatched && styles.backFaceMatched,
          backAnimatedStyle,
        ]}
      >
        {/* 3D Extrusion Lip */}
        <View
          style={[
            styles.extrusion,
            isMatched ? styles.matchedExtrusion : styles.revealedExtrusion,
          ]}
        />

        {/* Card Surface */}
        <View
          style={[
            styles.backSurface,
            isMatched && styles.backSurfaceMatched,
          ]}
        >
          {/* Matched Success Checkmark Badge */}
          {isMatched && (
            <View style={styles.matchedBadge}>
              <Text style={styles.matchedBadgeText}>✓</Text>
            </View>
          )}

          {/* Color Swatch if applicable */}
          {content.colorHex && (
            <View
              style={[
                styles.colorSwatch,
                { backgroundColor: content.colorHex },
              ]}
            />
          )}

          {/* Large Emoji / Icon */}
          {content.icon ? (
            <Text
              style={[
                styles.iconText,
                !displayLabel && styles.iconTextLarge,
              ]}
              accessibilityElementsHidden={true}
            >
              {content.icon}
            </Text>
          ) : null}

          {/* Text Label (Words, Khmer letters, numbers) */}
          {displayLabel ? (
            <Text
              variant={isSingleLetterOrNumber ? "heading1" : "titleSmall"}
              weight="800"
              align="center"
              style={[
                styles.labelText,
                isSingleLetterOrNumber && styles.singleCharText,
                isMatched && styles.labelTextMatched,
              ]}
            >
              {displayLabel}
            </Text>
          ) : null}
        </View>
      </Animated.View>
    </AnimatedPressable>
  );
});

MemoryCard.displayName = "MemoryCard";

const styles = StyleSheet.create({
  cardWrapper: {
    position: "relative",
    flex: 1,
    minHeight: 92,
    aspectRatio: 0.88,
    margin: Spacing.xs,
  },
  cardFace: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backfaceVisibility: "hidden",
  },
  extrusion: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    top: 5,
    borderRadius: Radius.xl,
  },
  frontExtrusion: {
    backgroundColor: Palette.borderStrong,
  },
  revealedExtrusion: {
    backgroundColor: Palette.deepOrange,
  },
  matchedExtrusion: {
    backgroundColor: Palette.darkGreen,
  },
  frontFace: {
    zIndex: 2,
  },
  frontSurface: {
    flex: 1,
    backgroundColor: Palette.warmCream,
    borderRadius: Radius.xl,
    borderWidth: 2.5,
    borderColor: Palette.cardOutline,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 5,
  },
  patternMedallion: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#FCECD4",
    borderWidth: 1.5,
    borderColor: Palette.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Palette.deepOrange,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  frontMascotIcon: {
    fontSize: 22,
    lineHeight: 28,
  },
  backFace: {
    zIndex: 1,
  },
  backFaceMatched: {},
  backSurface: {
    flex: 1,
    backgroundColor: Palette.pureWhite,
    borderRadius: Radius.xl,
    borderWidth: 2.5,
    borderColor: Palette.primaryOrange,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xs,
    marginBottom: 5,
    position: "relative",
    gap: 3,
  },
  backSurfaceMatched: {
    backgroundColor: "#EDF9EC",
    borderColor: Palette.green,
  },
  matchedBadge: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Palette.green,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: Palette.pureWhite,
  },
  matchedBadgeText: {
    color: Palette.pureWhite,
    fontSize: 11,
    fontWeight: "900",
  },
  colorSwatch: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: "rgba(0,0,0,0.1)",
  },
  iconText: {
    fontSize: 32,
    lineHeight: 38,
  },
  iconTextLarge: {
    fontSize: 40,
    lineHeight: 46,
  },
  labelText: {
    color: Palette.primaryText,
    lineHeight: 18,
  },
  singleCharText: {
    fontSize: 32,
    lineHeight: 38,
  },
  labelTextMatched: {
    color: Palette.darkGreen,
  },
});
