import React, { ReactNode } from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { Palette } from "@/constants/theme";
import { Spacing } from "@/constants/spacing";
import { Text } from "./Text";

export interface SectionTitleProps {
  title: string;
  subtitle?: string;
  rightAccessory?: ReactNode;
  icon?: string;
  style?: ViewStyle;
}

export function SectionTitle({
  title,
  subtitle,
  rightAccessory,
  icon,
  style,
}: SectionTitleProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.titleColumn}>
        <View style={styles.titleRow}>
          {icon && <Text style={styles.icon}>{icon}</Text>}
          <Text variant="heading2" weight="800" color={Palette.primaryText}>
            {title}
          </Text>
        </View>
        {subtitle && (
          <Text variant="bodySmall" color={Palette.secondaryText} style={styles.subtitle}>
            {subtitle}
          </Text>
        )}
      </View>

      {rightAccessory && (
        <View style={styles.accessoryContainer}>
          {rightAccessory}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: Spacing.sm,
    width: "100%",
  },
  titleColumn: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  icon: {
    fontSize: 22,
    marginRight: Spacing.xs,
  },
  subtitle: {
    marginTop: 2,
  },
  accessoryContainer: {
    marginLeft: Spacing.md,
  },
});
