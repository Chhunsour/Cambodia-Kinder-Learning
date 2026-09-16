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

interface ChallengeNodeProps {
  node: MapNodeData;
  onPress: (node: MapNodeData) => void;
  label?: string;
}

export const ChallengeNode: React.FC<ChallengeNodeProps> = ({
  node,
  onPress,
  label = "Challenge",
}) => {
  const isLocked = node.status === "locked";
  const isCompleted = node.status === "completed";

  const ringRotate = useSharedValue(0);

  useEffect(() => {
    if (!isLocked) {
      ringRotate.value = withRepeat(
        withTiming(360, { duration: 12000, easing: Easing.linear }),
        -1,
        false
      );
    }
  }, [isLocked, ringRotate]);

  return (
    <View style={styles.container}>
      {/* Outer Golden Laurel Ring */}
      <View
        style={[
          styles.outerRing,
          isLocked ? styles.lockedRing : styles.activeRing,
        ]}
      >
        <Pressable
          onPress={() => onPress(node)}
          accessibilityRole="button"
          accessibilityLabel={`Koki Challenge checkpoint, ${node.status}`}
          style={({ pressed }) => [
            styles.challengeBase,
            isLocked ? styles.lockedBase : styles.activeBase,
            { transform: [{ scale: pressed ? 0.94 : 1 }] },
          ]}
        >
          <Text style={styles.mascotEmoji}>{isLocked ? "🔒" : "🐯"}</Text>
        </Pressable>
      </View>

      <View style={[styles.badge, isLocked && styles.lockedBadge]}>
        <Text
          variant="caption"
          weight="800"
          style={[styles.badgeText, isLocked && styles.lockedBadgeText]}
        >
          ⭐ {label}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  outerRing: {
    padding: 4,
    borderRadius: 44,
    borderWidth: 2,
    borderStyle: "dashed",
  },
  activeRing: {
    borderColor: Palette.gold,
    backgroundColor: Palette.goldLight,
  },
  lockedRing: {
    borderColor: "#94A3B8",
    backgroundColor: "#F1F5F9",
  },
  challengeBase: {
    width: 68,
    height: 68,
    borderRadius: 34,
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
  activeBase: {
    backgroundColor: Palette.primaryOrange,
    borderColor: Palette.gold,
    borderBottomColor: Palette.deepOrange,
  },
  lockedBase: {
    backgroundColor: "#CBD5E1",
    borderColor: "#94A3B8",
    borderBottomColor: "#64748B",
  },
  mascotEmoji: {
    fontSize: 30,
  },
  badge: {
    marginTop: 4,
    backgroundColor: Palette.primaryOrange,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Palette.gold,
  },
  lockedBadge: {
    backgroundColor: "#94A3B8",
    borderColor: "#64748B",
  },
  badgeText: {
    color: Palette.pureWhite,
    fontSize: 10,
  },
  lockedBadgeText: {
    color: "#F1F5F9",
  },
});
