import React, { useEffect } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { Palette } from "@/constants/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface ConfettiPieceProps {
  index: number;
  total: number;
}

const CONFETTI_COLORS = [
  Palette.primaryOrange,
  Palette.gold,
  Palette.green,
  Palette.purpleAccent,
  "#FF6B8B",
  "#4ECDC4",
  "#FFD166",
];

const ConfettiPiece: React.FC<ConfettiPieceProps> = ({ index, total }) => {
  const translateY = useSharedValue(-20);
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);
  const rotate = useSharedValue(0);

  // Deterministic spread based on index
  const startX = (SCREEN_WIDTH / (total + 1)) * (index + 1);
  const targetX = (index % 2 === 0 ? 1 : -1) * (15 + (index * 7) % 40);
  const targetY = 160 + ((index * 23) % 180);
  const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
  const isCircle = index % 3 === 0;
  const size = 8 + (index % 4) * 2;
  const delay = (index * 65) % 400;

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withTiming(targetY, {
        duration: 1400 + (index % 3) * 200,
        easing: Easing.out(Easing.quad),
      })
    );
    translateX.value = withDelay(
      delay,
      withTiming(targetX, {
        duration: 1400,
        easing: Easing.inOut(Easing.ease),
      })
    );
    rotate.value = withDelay(
      delay,
      withTiming(360 + index * 45, {
        duration: 1400,
        easing: Easing.linear,
      })
    );
    opacity.value = withDelay(
      delay + 900,
      withTiming(0, {
        duration: 600,
      })
    );
  }, [delay, index, targetX, targetY, opacity, rotate, translateX, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.piece,
        {
          left: startX,
          width: size,
          height: isCircle ? size : size * 1.3,
          borderRadius: isCircle ? size / 2 : 2,
          backgroundColor: color,
        },
        animatedStyle,
      ]}
    />
  );
};

export const CelebrationConfetti: React.FC = () => {
  const pieces = Array.from({ length: 16 });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pieces.map((_, i) => (
        <ConfettiPiece key={`confetti-${i}`} index={i} total={pieces.length} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  piece: {
    position: "absolute",
    top: 0,
    zIndex: 99,
  },
});
