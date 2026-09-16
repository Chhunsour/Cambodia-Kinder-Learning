import React, { useEffect } from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming 
} from "react-native-reanimated";
import { Palette } from "@/constants/theme";
import { Radius, Spacing } from "@/constants/spacing";
import { Text } from "./Text";

export interface ProgressBarProps {
  progress: number; // 0.0 to 1.0
  showLabel?: boolean;
  label?: string;
  height?: number;
  starCheckpoints?: number[]; // checkpoints at e.g. [0.33, 0.66, 1.0]
  style?: ViewStyle;
}

export function ProgressBar({
  progress,
  showLabel = false,
  label,
  height = 22,
  starCheckpoints,
  style,
}: ProgressBarProps) {
  const clamped = Math.min(1, Math.max(0, progress));
  const animatedWidth = useSharedValue(clamped);

  useEffect(() => {
    animatedWidth.value = withSpring(clamped, {
      damping: 14,
      stiffness: 120,
    });
  }, [clamped, animatedWidth]);

  const fillAnimatedStyle = useAnimatedStyle(() => ({
    width: `${Math.max(4, animatedWidth.value * 100)}%`,
  }));

  const percentageText = label || `${Math.round(clamped * 100)}%`;

  return (
    <View style={[styles.container, style]}>
      {/* 3D Inset Track Groove */}
      <View style={[styles.track, { height, borderRadius: height / 2 }]}>
        {/* Animated Green Fill with 3D Gloss Rim */}
        <Animated.View style={[styles.fill, { borderRadius: height / 2 }, fillAnimatedStyle]}>
          <View style={styles.glossHighlight} />
        </Animated.View>

        {/* Optional Star/Milestone Checkpoints */}
        {starCheckpoints && starCheckpoints.map((cp, idx) => (
          <View
            key={idx}
            style={[
              styles.checkpoint,
              { left: `${cp * 100}%`, transform: [{ translateX: -7 }] }
            ]}
          >
            <Text style={{ fontSize: 12 }}>
              {clamped >= cp ? "⭐" : "⚪"}
            </Text>
          </View>
        ))}
      </View>

      {showLabel && (
        <View style={styles.labelContainer}>
          <Text variant="caption" weight="700" color={Palette.secondaryText}>
            {percentageText}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginVertical: Spacing.xs,
  },
  track: {
    width: "100%",
    backgroundColor: "#E6E1D6",
    borderWidth: 2,
    borderColor: "#D4CFC4",
    overflow: "hidden",
    position: "relative",
    justifyContent: "center",
  },
  fill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: Palette.green,
    borderRightWidth: 2,
    borderRightColor: Palette.darkGreen,
  },
  glossHighlight: {
    position: "absolute",
    top: 2,
    left: 4,
    right: 4,
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.45)",
    borderRadius: 2,
  },
  checkpoint: {
    position: "absolute",
    top: 2,
  },
  labelContainer: {
    marginTop: Spacing.xxs,
    alignItems: "flex-end",
  },
});
