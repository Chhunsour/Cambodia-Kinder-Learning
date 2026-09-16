import React, { useEffect } from "react";
import {
  AccessibilityProps,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Text } from "@/components/ui/Text";
import { Palette } from "@/constants/theme";
import { MapNodeData } from "../types";

interface LevelNodeProps extends AccessibilityProps {
  node: MapNodeData;
  onPress: (node: MapNodeData) => void;
  playLabel?: string;
}

export const LevelNode: React.FC<LevelNodeProps> = ({
  node,
  onPress,
  playLabel = "Play",
}) => {
  const { status, levelNumber = 1, stars = 0 } = node;

  const isCurrent = status === "current";
  const isCompleted = status === "completed";
  const isLocked = status === "locked";
  const isUnlocked = status === "unlocked";

  // Reanimated animations
  const pulseScale = useSharedValue(1);
  const shakeX = useSharedValue(0);

  useEffect(() => {
    if (isCurrent) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.06, { duration: 900, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      pulseScale.value = 1;
    }
  }, [isCurrent, pulseScale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: isCurrent ? pulseScale.value : 1 },
      { translateX: shakeX.value },
    ],
  }));

  const handlePress = () => {
    if (isLocked) {
      // Gentle tactile shake feedback when locked
      shakeX.value = withSequence(
        withTiming(-7, { duration: 40 }),
        withTiming(7, { duration: 40 }),
        withTiming(-5, { duration: 40 }),
        withTiming(5, { duration: 40 }),
        withTiming(0, { duration: 40 })
      );
      return;
    }
    onPress(node);
  };

  // Status-dependent visual styles
  let bgColor: string = Palette.softWhite;
  let shadowColor: string = Palette.borderStrong;
  let borderColor: string = Palette.borderSubtle;
  let textColor: string = Palette.primaryText;
  let size = 64;

  if (isCompleted) {
    bgColor = Palette.green;
    shadowColor = Palette.darkGreen;
    borderColor = "#71D15E";
    textColor = Palette.pureWhite;
  } else if (isCurrent) {
    bgColor = Palette.primaryOrange;
    shadowColor = Palette.deepOrange;
    borderColor = Palette.gold;
    textColor = Palette.pureWhite;
    size = 76;
  } else if (isUnlocked) {
    bgColor = Palette.softWhite;
    shadowColor = "#E6D7C3";
    borderColor = Palette.primaryOrange;
    textColor = Palette.primaryOrange;
  } else if (isLocked) {
    bgColor = "#E2E8F0";
    shadowColor = "#CBD5E1";
    borderColor = "#94A3B8";
    textColor = "#94A3B8";
    size = 58;
  }

  const a11yStatus = isCurrent
    ? "current level"
    : isCompleted
    ? `completed with ${stars} stars`
    : isLocked
    ? "locked"
    : "unlocked";

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      {/* Current Level Radiant Halo */}
      {isCurrent && <View style={styles.haloGlow} />}

      <Pressable
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={`Level ${levelNumber}, ${a11yStatus}`}
        accessibilityState={{ disabled: isLocked }}
        style={({ pressed }) => [
          styles.nodeBase,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: bgColor,
            borderBottomColor: shadowColor,
            borderColor,
            transform: [{ translateY: pressed && !isLocked ? 3 : 0 }],
          },
        ]}
      >
        {isLocked ? (
          <Text style={styles.lockIcon}>🔒</Text>
        ) : (
          <Text
            variant="heading2"
            weight="800"
            style={[styles.levelText, { color: textColor }]}
          >
            {levelNumber}
          </Text>
        )}
      </Pressable>

      {/* Completed Stars Row */}
      {isCompleted && (
        <View style={styles.starsRow}>
          {[1, 2, 3].map((starIndex) => (
            <Text
              key={starIndex}
              style={[
                styles.starText,
                { opacity: starIndex <= stars ? 1 : 0.25 },
              ]}
            >
              ⭐
            </Text>
          ))}
        </View>
      )}

      {/* Current "Play" Pill Badge */}
      {isCurrent && (
        <View style={styles.playBadge}>
          <Text variant="caption" weight="800" style={styles.playText}>
            ▶ {playLabel}
          </Text>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  haloGlow: {
    position: "absolute",
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Palette.goldLight,
    opacity: 0.65,
  },
  nodeBase: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderBottomWidth: 7,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.14,
    shadowRadius: 4,
    elevation: 4,
  },
  levelText: {
    fontSize: 24,
    lineHeight: 28,
  },
  lockIcon: {
    fontSize: 20,
  },
  starsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 3,
    gap: 1,
  },
  starText: {
    fontSize: 11,
  },
  playBadge: {
    marginTop: 4,
    backgroundColor: Palette.primaryOrange,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Palette.gold,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 3,
  },
  playText: {
    color: Palette.pureWhite,
    fontSize: 11,
    letterSpacing: 0.3,
  },
});
