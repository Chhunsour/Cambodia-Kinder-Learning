import React, { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
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

interface TreasureNodeProps {
  node: MapNodeData;
  onPress: (node: MapNodeData) => void;
}

export const TreasureNode: React.FC<TreasureNodeProps> = ({ node, onPress }) => {
  const isLocked = node.status === "locked";
  const isCompleted = node.status === "completed";

  // Gentle float animation when available
  const floatY = useSharedValue(0);

  useEffect(() => {
    if (!isLocked) {
      floatY.value = withRepeat(
        withSequence(
          withTiming(-6, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1100, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      floatY.value = 0;
    }
  }, [isLocked, floatY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }));

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <Pressable
        onPress={() => onPress(node)}
        accessibilityRole="button"
        accessibilityLabel={`Treasure chest, ${node.status}`}
        style={({ pressed }) => [
          styles.chestBase,
          isLocked ? styles.lockedBase : styles.availableBase,
          {
            transform: [{ scale: pressed ? 0.94 : 1 }],
          },
        ]}
      >
        <Text style={styles.chestEmoji}>
          {isCompleted ? "✨ 🎁 ✨" : isLocked ? "🔒" : "🎁"}
        </Text>
      </Pressable>

      <View style={[styles.labelBadge, isLocked && styles.lockedBadge]}>
        <Text
          variant="caption"
          weight="700"
          style={[styles.labelText, isLocked && styles.lockedLabelText]}
        >
          {isCompleted ? "Opened" : isLocked ? "Locked" : "Treasure"}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  chestBase: {
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3.5,
    borderBottomWidth: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 4,
    elevation: 4,
  },
  availableBase: {
    backgroundColor: Palette.goldLight,
    borderColor: Palette.gold,
    borderBottomColor: Palette.goldDark,
  },
  lockedBase: {
    backgroundColor: "#F1F5F9",
    borderColor: "#94A3B8",
    borderBottomColor: "#64748B",
  },
  chestEmoji: {
    fontSize: 28,
  },
  labelBadge: {
    marginTop: 3,
    backgroundColor: Palette.gold,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Palette.goldDark,
  },
  lockedBadge: {
    backgroundColor: "#CBD5E1",
    borderColor: "#94A3B8",
  },
  labelText: {
    color: "#78350F",
    fontSize: 10,
  },
  lockedLabelText: {
    color: "#475569",
  },
});
