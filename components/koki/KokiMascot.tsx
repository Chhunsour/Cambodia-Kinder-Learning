import React, { useEffect } from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withSequence, 
  withTiming, 
  Easing 
} from "react-native-reanimated";
import { Palette } from "@/constants/theme";
import { Depth } from "@/constants/depth";
import { Text } from "@/components/ui/Text";

export type MascotMood = "idle" | "happy" | "thinking" | "cheering";

interface KokiMascotProps {
  size?: number;
  mood?: MascotMood;
  emoji?: string;
  style?: ViewStyle;
}

/**
 * Animated Mascot component for Koki (Tiger 🐯)
 * Animation-ready Reanimated wrapper with soft 3D rim and playful motion.
 */
export function KokiMascot({
  size = 120,
  mood = "idle",
  emoji = "🐯",
  style,
}: KokiMascotProps) {
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (mood === "idle") {
      // Gentle breathing / floating
      translateY.value = withRepeat(
        withSequence(
          withTiming(-8, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else if (mood === "happy" || mood === "cheering") {
      // Joyful bounce
      translateY.value = withRepeat(
        withSequence(
          withTiming(-16, { duration: 380, easing: Easing.out(Easing.back(1.5)) }),
          withTiming(0, { duration: 380, easing: Easing.in(Easing.ease) })
        ),
        -1,
        true
      );
      scale.value = withRepeat(
        withSequence(
          withTiming(1.06, { duration: 380 }),
          withTiming(0.96, { duration: 380 })
        ),
        -1,
        true
      );
    }
  }, [mood, translateY, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const fontSize = Math.round(size * 0.52);

  return (
    <View style={[styles.container, style]}>
      {/* 3D Bottom Base Drop Shadow */}
      <View style={[
        styles.shadowBase, 
        { width: size * 0.7, height: size * 0.18, borderRadius: size * 0.09 }
      ]} />

      <Animated.View
        style={[
          styles.mascotCircle,
          { 
            width: size, 
            height: size, 
            borderRadius: size / 2,
            borderWidth: Math.max(3, Math.round(size * 0.04)),
          },
          Depth.styles.subtleCard,
          animatedStyle,
        ]}
      >
        <Text style={{ fontSize, lineHeight: fontSize * 1.15 }} align="center">
          {emoji}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  shadowBase: {
    position: "absolute",
    bottom: -6,
    backgroundColor: "rgba(42, 42, 42, 0.12)",
  },
  mascotCircle: {
    backgroundColor: "#FFE8D6",
    borderColor: Palette.primaryOrange,
    alignItems: "center",
    justifyContent: "center",
  },
});
