import React, { ReactNode } from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { Layout } from "@/constants/layout";
import { Radius } from "@/constants/spacing";
import { useResponsive } from "@/hooks/useResponsive";

interface GameCanvasContainerProps {
  children: ReactNode;
  aspectRatio?: number;
  style?: ViewStyle;
}

/**
 * Responsive container maintaining kid-friendly game proportions (e.g. 16:9)
 * across both phones and tablets with proper letterboxing/pillarboxing.
 */
export function GameCanvasContainer({
  children,
  aspectRatio = Layout.game.aspectRatio,
  style,
}: GameCanvasContainerProps) {
  const { width, isTablet } = useResponsive();

  const maxCanvasWidth = Math.min(
    width,
    isTablet ? Layout.containers.maxGameCanvasWidth : width - 32
  );

  return (
    <View style={styles.outerCenter}>
      <View
        style={[
          styles.canvasBox,
          {
            width: maxCanvasWidth,
            aspectRatio,
            borderRadius: isTablet ? Radius.xl : Radius.md,
          },
          style,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerCenter: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  canvasBox: {
    overflow: "hidden",
    position: "relative",
  },
});
