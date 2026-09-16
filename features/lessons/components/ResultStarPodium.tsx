import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Text } from "@/components/ui/Text";
import { Palette } from "@/constants/theme";
import { Depth } from "@/constants/depth";

interface ResultStarPodiumProps {
  starsEarned: 1 | 2 | 3;
  onStarPop?: (starNumber: number) => void;
}

interface AnimatedStarProps {
  starNumber: number;
  isEarned: boolean;
  delayMs: number;
  isCenter?: boolean;
  onPop?: () => void;
}

const AnimatedStar: React.FC<AnimatedStarProps> = ({
  starNumber,
  isEarned,
  delayMs,
  isCenter = false,
  onPop,
}) => {
  const scale = useSharedValue(0);
  const rotation = useSharedValue(-25);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (isEarned) {
      scale.value = withDelay(
        delayMs,
        withSpring(1, {
          damping: 8,
          stiffness: 140,
        })
      );
      rotation.value = withDelay(
        delayMs,
        withSpring(0, {
          damping: 10,
          stiffness: 120,
        })
      );
      opacity.value = withDelay(delayMs, withTiming(1, { duration: 150 }));

      if (onPop) {
        const timer = setTimeout(() => {
          onPop();
        }, delayMs);
        return () => clearTimeout(timer);
      }
    } else {
      // Unearned star appears gently in a muted placeholder state
      scale.value = withDelay(
        delayMs,
        withTiming(0.9, {
          duration: 350,
        })
      );
      rotation.value = withDelay(delayMs, withTiming(0, { duration: 350 }));
      opacity.value = withDelay(delayMs, withTiming(0.4, { duration: 350 }));
    }
  }, [delayMs, isEarned, onPop, opacity, rotation, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
    opacity: opacity.value,
  }));

  const size = isCenter ? 84 : 68;
  const starFontSize = isCenter ? 44 : 34;

  return (
    <View
      style={[
        styles.starSlot,
        isCenter && styles.centerSlot,
      ]}
      accessibilityRole="image"
      accessibilityLabel={`Star ${starNumber} ${isEarned ? "earned" : "unearned"}`}
    >
      {/* Radiant Halo for center or earned stars */}
      {isEarned && (
        <View
          style={[
            styles.starGlow,
            {
              width: size + 20,
              height: size + 20,
              borderRadius: (size + 20) / 2,
            },
          ]}
        />
      )}

      <Animated.View
        style={[
          styles.starCircle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: isEarned ? "#FFF8DC" : "#F1F5F9",
            borderColor: isEarned ? Palette.gold : "#CBD5E1",
            borderBottomColor: isEarned ? Palette.goldDark : "#94A3B8",
          },
          isEarned ? Depth.styles.elevatedCard : undefined,
          animatedStyle,
        ]}
      >
        <Text
          style={[
            styles.starIcon,
            {
              fontSize: starFontSize,
              opacity: isEarned ? 1 : 0.45,
            },
          ]}
        >
          ⭐
        </Text>
      </Animated.View>
    </View>
  );
};

export const ResultStarPodium: React.FC<ResultStarPodiumProps> = ({
  starsEarned,
  onStarPop,
}) => {
  return (
    <View style={styles.podiumRow}>
      {/* Star 1 (Left, 300ms) */}
      <AnimatedStar
        starNumber={1}
        isEarned={starsEarned >= 1}
        delayMs={300}
        onPop={() => onStarPop?.(1)}
      />

      {/* Star 2 (Center / Elevated, 650ms) */}
      <AnimatedStar
        starNumber={2}
        isEarned={starsEarned >= 2}
        delayMs={650}
        isCenter={true}
        onPop={() => onStarPop?.(2)}
      />

      {/* Star 3 (Right, 1000ms) */}
      <AnimatedStar
        starNumber={3}
        isEarned={starsEarned >= 3}
        delayMs={1000}
        onPop={() => onStarPop?.(3)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  podiumRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 16,
    paddingVertical: 12,
  },
  starSlot: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  centerSlot: {
    marginBottom: 14, // Elevated center star
  },
  starGlow: {
    position: "absolute",
    backgroundColor: Palette.goldLight,
    opacity: 0.5,
  },
  starCircle: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderBottomWidth: 6,
  },
  starIcon: {
    textAlign: "center",
    includeFontPadding: false,
  },
});
