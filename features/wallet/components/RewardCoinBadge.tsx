import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Text } from "@/components/ui/Text";
import { Palette } from "@/constants/theme";
import { Radius, Spacing } from "@/constants/spacing";
import { Depth } from "@/constants/depth";
import { useLocalization } from "@/hooks/useLocalization";

export interface RewardCoinBadgeProps {
  coinsEarned: number;
  isStarImprovement?: boolean;
  delayMs?: number;
}

/**
 * Animated celebratory badge popping into view after the star reveal sequence (~1200ms).
 * Displays earned coins with a playful bounce.
 * If 0 coins were earned (e.g. replaying an already completed lesson), shows a gentle encouraging note.
 */
export const RewardCoinBadge: React.FC<RewardCoinBadgeProps> = ({
  coinsEarned,
  isStarImprovement = false,
  delayMs = 1250,
}) => {
  const { t } = useLocalization();

  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(18);

  useEffect(() => {
    scale.value = withDelay(
      delayMs,
      withSpring(1, {
        damping: 10,
        stiffness: 140,
      })
    );
    opacity.value = withDelay(delayMs, withTiming(1, { duration: 220 }));
    translateY.value = withDelay(
      delayMs,
      withSpring(0, {
        damping: 12,
        stiffness: 120,
      })
    );
  }, [delayMs, scale, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  if (coinsEarned <= 0) {
    return (
      <Animated.View style={[styles.container, animatedStyle]}>
        <View style={styles.replayPill}>
          <Text style={styles.replayIcon}>✨</Text>
          <Text
            variant="bodySmall"
            weight="700"
            color={Palette.secondaryText}
            style={styles.replayText}
          >
            {t("result.coinsReplayNoNew")}
          </Text>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[styles.container, animatedStyle]}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={t("result.coinsEarned", { count: coinsEarned })}
    >
      <View style={styles.coinPill}>
        <View style={styles.coinIconCircle}>
          <Text style={styles.coinEmoji}>🪙</Text>
        </View>

        <View style={styles.textStack}>
          <Text
            variant="heading2"
            weight="900"
            color={Palette.primaryText}
            style={styles.coinNumber}
          >
            +{coinsEarned}
          </Text>
          {isStarImprovement && (
            <View style={styles.bonusChip}>
              <Text
                variant="caption"
                weight="800"
                color={Palette.primaryOrange}
                style={styles.bonusChipText}
              >
                {t("result.coinsBonus")}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: Spacing.xs,
  },
  coinPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB", // Soft warm gold
    borderWidth: 2,
    borderColor: "#F59E0B", // Bright amber
    borderRadius: Radius.pill,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
    ...Depth.styles.floatingCard,
    shadowColor: "#F59E0B",
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  coinIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  coinEmoji: {
    fontSize: 22,
  },
  textStack: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  coinNumber: {
    fontSize: 22,
    lineHeight: 28,
    color: "#B45309", // Warm dark amber for high contrast & legibility
  },
  bonusChip: {
    backgroundColor: "#FEF08A",
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
  },
  bonusChipText: {
    fontSize: 11,
    lineHeight: 14,
    color: "#854D0E",
  },
  replayPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: Radius.pill,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  replayIcon: {
    fontSize: 14,
  },
  replayText: {
    fontSize: 13,
  },
});
