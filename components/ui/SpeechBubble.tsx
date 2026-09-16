import React, { ReactNode } from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { Palette } from "@/constants/theme";
import { Radius, Spacing } from "@/constants/spacing";
import { Depth } from "@/constants/depth";
import { Text } from "./Text";

export type TailDirection = "bottom" | "top" | "left" | "right" | "none";

export interface SpeechBubbleProps {
  message: string;
  speakerName?: string;
  tailDirection?: TailDirection;
  accessory?: ReactNode;
  style?: ViewStyle;
}

export function SpeechBubble({
  message,
  speakerName,
  tailDirection = "bottom",
  accessory,
  style,
}: SpeechBubbleProps) {
  return (
    <View style={[styles.wrapper, style]}>
      {/* Top Tail */}
      {tailDirection === "top" && <View style={[styles.tail, styles.tailTop]} />}

      {/* Main Bubble */}
      <View style={[styles.bubble, Depth.styles.subtleCard]}>
        {speakerName && (
          <Text variant="caption" weight="800" color={Palette.primaryOrange} style={styles.speaker}>
            {speakerName}
          </Text>
        )}
        <Text variant="body" weight="600" color={Palette.primaryText} style={styles.message}>
          {message}
        </Text>
        {accessory && <View style={styles.accessoryContainer}>{accessory}</View>}
      </View>

      {/* Bottom Tail */}
      {tailDirection === "bottom" && <View style={[styles.tail, styles.tailBottom]} />}
      {/* Left Tail */}
      {tailDirection === "left" && <View style={[styles.tail, styles.tailLeft]} />}
      {/* Right Tail */}
      {tailDirection === "right" && <View style={[styles.tail, styles.tailRight]} />}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
    marginVertical: Spacing.xs,
    maxWidth: "92%",
    alignSelf: "center",
  },
  bubble: {
    backgroundColor: Palette.pureWhite,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderWidth: 2,
    borderColor: Palette.cardOutline,
  },
  speaker: {
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  message: {
    lineHeight: 24,
  },
  accessoryContainer: {
    marginTop: Spacing.xs,
  },
  tail: {
    position: "absolute",
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderStyle: "solid",
  },
  tailBottom: {
    bottom: -10,
    left: 28,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 10,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: Palette.pureWhite,
  },
  tailTop: {
    top: -10,
    left: 28,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 10,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: Palette.pureWhite,
  },
  tailLeft: {
    left: -10,
    top: "40%",
    borderTopWidth: 10,
    borderBottomWidth: 10,
    borderRightWidth: 10,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    borderRightColor: Palette.pureWhite,
  },
  tailRight: {
    right: -10,
    top: "40%",
    borderTopWidth: 10,
    borderBottomWidth: 10,
    borderLeftWidth: 10,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    borderLeftColor: Palette.pureWhite,
  },
});
