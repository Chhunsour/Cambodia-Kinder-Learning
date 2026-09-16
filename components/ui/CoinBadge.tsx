import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { Palette } from "@/constants/theme";
import { Radius, Spacing } from "@/constants/spacing";
import { Depth } from "@/constants/depth";
import { Text } from "./Text";

export interface CoinBadgeProps {
  amount: number;
  compact?: boolean;
  style?: ViewStyle;
}

export function CoinBadge({
  amount,
  compact = false,
  style,
}: CoinBadgeProps) {
  return (
    <View style={[styles.outerWrapper, compact && styles.compactWrapper, style]}>
      {/* 3D bottom extrusion rim */}
      <View style={styles.extrusion} />

      <View style={[styles.pill, compact && styles.compactPill]}>
        <Text style={compact ? styles.coinIconCompact : styles.coinIcon}>
          🪙
        </Text>
        <Text
          variant={compact ? "bodySmall" : "gameNumber"}
          color={Palette.primaryText}
          weight="900"
          style={styles.amountText}
        >
          {amount.toLocaleString()}
        </Text>
      </View>
    </View>
  );
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
    backgroundColor: Palette.goldDark,
    borderRadius: Radius.pill,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Palette.goldLight,
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
  coinIcon: {
    fontSize: 18,
    marginRight: Spacing.xs,
  },
  coinIconCompact: {
    fontSize: 14,
    marginRight: 4,
  },
  amountText: {
    letterSpacing: 0.5,
  },
});
