import React, { useEffect, useRef } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { GameIconButton } from "@/components/ui/GameIconButton";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { HeartBadge } from "@/components/ui/HeartBadge";
import { Text } from "@/components/ui/Text";
import { Palette } from "@/constants/theme";
import { Spacing } from "@/constants/spacing";

interface LessonHeaderProps {
  currentActivityIndex: number;
  totalActivities: number;
  progressRatio: number;
  onClosePress: () => void;
  closeAccessibilityLabel?: string;
  hearts?: number;
  maxHearts?: number;
  onHeartsPress?: () => void;
}

/**
 * Reusable Lesson Activity Header.
 *
 * Coordinates:
 * - Close button triggering confirmation
 * - Smooth visual progress bar
 * - Numbered step counter (e.g., "3 / 5")
 * - Dynamic Heart Badge with gentle loss pop animation
 */
export function LessonHeader({
  currentActivityIndex,
  totalActivities,
  progressRatio,
  onClosePress,
  closeAccessibilityLabel = "Close lesson",
  hearts = 5,
  maxHearts = 5,
  onHeartsPress,
}: LessonHeaderProps) {
  const currentStep = Math.min(currentActivityIndex + 1, totalActivities);
  const prevHeartsRef = useRef<number>(hearts);

  // Soft heart loss animation
  const heartScale = useSharedValue(1);

  useEffect(() => {
    if (hearts < prevHeartsRef.current) {
      // Heart was lost: gentle pop without scary effects
      heartScale.value = withSequence(
        withTiming(1.25, { duration: 120 }),
        withTiming(0.85, { duration: 120 }),
        withTiming(1.0, { duration: 150 })
      );
    }
    prevHeartsRef.current = hearts;
  }, [hearts, heartScale]);

  const heartAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  return (
    <View style={styles.header}>
      {/* 1. Close Button */}
      <GameIconButton
        type="close"
        color="cream"
        size="compact"
        onPress={onClosePress}
        accessibilityLabel={closeAccessibilityLabel}
      />

      {/* 2. Progress Area: Smooth Bar + Counter */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBarWrapper}>
          <ProgressBar progress={progressRatio} height={14} />
        </View>
        <Text
          variant="caption"
          weight="800"
          color={Palette.secondaryText}
          style={styles.stepText}
        >
          {currentStep} / {totalActivities}
        </Text>
      </View>

      {/* 3. Hearts Badge with animation */}
      <Animated.View style={heartAnimatedStyle}>
        <HeartBadge
          count={hearts}
          maxCount={maxHearts}
          compact={true}
          onPress={onHeartsPress}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xs,
    gap: Spacing.sm,
  },
  progressContainer: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  progressBarWrapper: {
    width: "100%",
  },
  stepText: {
    letterSpacing: 0.5,
  },
});
