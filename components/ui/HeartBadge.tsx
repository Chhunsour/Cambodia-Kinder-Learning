import React from "react";
import { View, StyleSheet, ViewStyle, TouchableOpacity } from "react-native";
import { Palette } from "@/constants/theme";
import { Radius, Spacing } from "@/constants/spacing";
import { Depth } from "@/constants/depth";
import { Text } from "./Text";

export interface HeartBadgeProps {
  count: number;
  maxCount?: number;
  compact?: boolean;
  style?: ViewStyle;
  onPress?: () => void;
}

export function HeartBadge({
  count,
  maxCount = 5,
  compact = false,
  style,
  onPress,
}: HeartBadgeProps) {
  const content = (
    <View style={[styles.outerWrapper, compact && styles.compactWrapper, style]}>
      {/* 3D bottom extrusion */}
      <View style={styles.extrusion} />

      <View style={[styles.pill, compact && styles.compactPill]}>
        <Text style={compact ? styles.heartIconCompact : styles.heartIcon}>
          {count > 0 ? "❤️" : "🤍"}
        </Text>
        <Text
          variant={compact ? "bodySmall" : "gameNumber"}
          color={count > 0 ? Palette.friendlyRedDark : Palette.secondaryText}
          weight="900"
          style={styles.countText}
        >
          {count}
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
        accessibilityLabel={`${count} of ${maxCount} hearts remaining`}
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
    backgroundColor: Palette.friendlyRedDark,
    borderRadius: Radius.pill,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Palette.friendlyRedLight,
    borderWidth: 1.5,
    borderColor: "#FFA8A8",
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xxs,
    ...Depth.styles.subtleCard,
  },
  compactPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  heartIcon: {
    fontSize: 18,
    marginRight: Spacing.xs,
  },
  heartIconCompact: {
    fontSize: 14,
    marginRight: 4,
  },
  countText: {
    letterSpacing: 0.5,
  },
});
