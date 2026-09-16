import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { Palette } from "@/constants/theme";
import { Radius, Spacing } from "@/constants/spacing";
import { Depth } from "@/constants/depth";
import { Text } from "./Text";

export interface StarBadgeProps {
  count?: number;
  mode?: "count" | "single";
  compact?: boolean;
  style?: ViewStyle;
}

export function StarBadge({
  count = 0,
  mode = "count",
  compact = false,
  style,
}: StarBadgeProps) {
  if (mode === "single") {
    return (
      <View style={[styles.singleWrapper, style]}>
        <Text style={{ fontSize: compact ? 20 : 28 }}>⭐</Text>
      </View>
    );
  }

  return (
    <View style={[styles.outerWrapper, compact && styles.compactWrapper, style]}>
      {/* 3D bottom extrusion */}
      <View style={styles.extrusion} />

      <View style={[styles.pill, compact && styles.compactPill]}>
        <Text style={compact ? styles.starIconCompact : styles.starIcon}>
          ⭐
        </Text>
        <Text
          variant={compact ? "bodySmall" : "gameNumber"}
          color={Palette.primaryText}
          weight="900"
          style={styles.countText}
        >
          {count}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  singleWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
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
    backgroundColor: Palette.goldDark,
    borderRadius: Radius.pill,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Palette.pureWhite,
    borderWidth: 1.5,
    borderColor: Palette.gold,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xxs,
    ...Depth.styles.subtleCard,
  },
  compactPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  starIcon: {
    fontSize: 18,
    marginRight: Spacing.xs,
  },
  starIconCompact: {
    fontSize: 14,
    marginRight: 4,
  },
  countText: {
    letterSpacing: 0.5,
  },
});
