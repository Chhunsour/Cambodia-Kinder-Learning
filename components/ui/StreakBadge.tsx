import React from "react";
import { View, StyleSheet, ViewStyle, TouchableOpacity } from "react-native";
import { Palette } from "@/constants/theme";
import { Radius, Spacing } from "@/constants/spacing";
import { Text } from "./Text";

export interface StreakBadgeProps {
  days: number;
  compact?: boolean;
  style?: ViewStyle;
  onPress?: () => void;
}

/**
 * Reusable 3D Game Streak Counter Badge
 * Highlights daily learning streak with flame icon (🔥) and chunky soft-3D pill.
 */
export function StreakBadge({
  days,
  compact = false,
  style,
  onPress,
}: StreakBadgeProps) {
  const content = (
    <View style={[styles.outerWrapper, compact && styles.compactWrapper, style]}>
      {/* 3D bottom extrusion rim */}
      <View style={styles.extrusion} />

      <View style={[styles.pill, compact && styles.compactPill]}>
        <Text style={compact ? styles.streakIconCompact : styles.streakIcon}>
          🔥
        </Text>
        <Text
          variant={compact ? "bodySmall" : "gameNumber"}
          color={Palette.primaryOrange}
          weight="900"
          style={styles.daysText}
        >
          {days}
        </Text>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`Streak ${days} days`}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  outerWrapper: {
    position: "relative",
    alignSelf: "flex-start",
  },
  compactWrapper: {
    transform: [{ scale: 0.9 }],
  },
  extrusion: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    top: 3,
    backgroundColor: Palette.borderStrong,
    borderRadius: Radius.pill,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Palette.pureWhite,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Palette.cardOutline,
    gap: Spacing.xxs,
  },
  compactPill: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderWidth: 1.2,
  },
  streakIcon: {
    fontSize: 18,
  },
  streakIconCompact: {
    fontSize: 15,
  },
  daysText: {
    letterSpacing: 0.5,
  },
});
