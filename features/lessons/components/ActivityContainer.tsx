import React, { ReactNode } from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { useKokiResponsive } from "@/hooks/useKokiResponsive";
import { Palette } from "@/constants/theme";
import { Radius, Spacing } from "@/constants/spacing";

interface ActivityContainerProps {
  children: ReactNode;
  style?: ViewStyle;
}

/**
 * Generic Activity Container.
 *
 * Provides a responsive, centered stage for any activity type
 * (choice, drag/drop, audio, trace, counting) across phones and tablets.
 */
export function ActivityContainer({ children, style }: ActivityContainerProps) {
  const responsive = useKokiResponsive();

  return (
    <View
      style={[
        styles.outerContainer,
        responsive.isTablet && styles.tabletOuter,
        style,
      ]}
    >
      <View
        style={[
          styles.innerStage,
          responsive.isTablet && styles.tabletStage,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    width: "100%",
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.sm,
  },
  tabletOuter: {
    maxWidth: 580,
    alignSelf: "center",
  },
  innerStage: {
    width: "100%",
    backgroundColor: Palette.pureWhite,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    borderWidth: 2,
    borderColor: Palette.cardOutline,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  tabletStage: {
    padding: Spacing.xl,
    borderRadius: Radius.xl,
  },
});
