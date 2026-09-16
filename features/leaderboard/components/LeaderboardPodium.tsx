import React from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "@/components/ui/Text";
import { LeaderboardEntry } from "@/lib/supabase/types";
import { BUILT_IN_AVATARS } from "@/constants/avatars";
import { useLocalization } from "@/hooks/useLocalization";
import { Palette } from "@/constants/theme";
import { Spacing, Radius } from "@/constants/spacing";

interface LeaderboardPodiumProps {
  topThree: LeaderboardEntry[];
}

function getAvatarEmoji(avatarId?: string | null): string {
  const found = BUILT_IN_AVATARS.find((a) => a.id === avatarId);
  return found?.emoji || "🐯";
}

export const LeaderboardPodium: React.FC<LeaderboardPodiumProps> = ({ topThree }) => {
  const { t } = useLocalization();
  if (topThree.length < 3) return null;

  const first = topThree[0];
  const second = topThree[1];
  const third = topThree[2];

  return (
    <View style={styles.podiumContainer}>
      {/* 2nd Place (Left) */}
      <View style={[styles.podiumCol, styles.colSecond]}>
        <View style={styles.medalCircle}>
          <Text style={styles.medalEmoji}>🥈</Text>
        </View>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarEmoji}>{getAvatarEmoji(second.avatar_id)}</Text>
        </View>
        <Text
          variant="caption"
          weight="800"
          color={second.is_current_child ? Palette.primaryOrange : "#1E293B"}
          numberOfLines={1}
          style={styles.name}
        >
          {second.is_current_child ? `${second.nickname} (${t("leaderboard.youTag")})` : second.nickname}
        </Text>
        <View style={styles.scorePill}>
          <Text variant="caption" weight="800" color="#475569">
            {second.weekly_stars} ⭐
          </Text>
        </View>
        <View style={[styles.pedestal, styles.pedestalSecond]}>
          <Text variant="title" weight="800" color="#64748B">2</Text>
        </View>
      </View>

      {/* 1st Place (Center, Raised) */}
      <View style={[styles.podiumCol, styles.colFirst]}>
        <View style={[styles.medalCircle, styles.medalFirstCircle]}>
          <Text style={styles.medalEmoji}>🥇</Text>
        </View>
        <View style={[styles.avatarCircle, styles.avatarFirstCircle]}>
          <Text style={styles.avatarEmojiLarge}>{getAvatarEmoji(first.avatar_id)}</Text>
        </View>
        <Text
          variant="bodySmall"
          weight="800"
          color={first.is_current_child ? Palette.primaryOrange : "#1E293B"}
          numberOfLines={1}
          style={styles.name}
        >
          {first.is_current_child ? `${first.nickname} (${t("leaderboard.youTag")})` : first.nickname}
        </Text>
        <View style={[styles.scorePill, styles.scoreFirstPill]}>
          <Text variant="caption" weight="800" color="#B45309">
            {first.weekly_stars} ⭐
          </Text>
        </View>
        <View style={[styles.pedestal, styles.pedestalFirst]}>
          <Text variant="title" weight="800" color="#D97706">1</Text>
        </View>
      </View>

      {/* 3rd Place (Right) */}
      <View style={[styles.podiumCol, styles.colThird]}>
        <View style={styles.medalCircle}>
          <Text style={styles.medalEmoji}>🥉</Text>
        </View>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarEmoji}>{getAvatarEmoji(third.avatar_id)}</Text>
        </View>
        <Text
          variant="caption"
          weight="800"
          color={third.is_current_child ? Palette.primaryOrange : "#1E293B"}
          numberOfLines={1}
          style={styles.name}
        >
          {third.is_current_child ? `${third.nickname} (${t("leaderboard.youTag")})` : third.nickname}
        </Text>
        <View style={styles.scorePill}>
          <Text variant="caption" weight="800" color="#78350F">
            {third.weekly_stars} ⭐
          </Text>
        </View>
        <View style={[styles.pedestal, styles.pedestalThird]}>
          <Text variant="title" weight="800" color="#9A3412">3</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  podiumContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  podiumCol: {
    flex: 1,
    alignItems: "center",
  },
  colFirst: {
    marginBottom: 0,
    zIndex: 2,
  },
  colSecond: {
    marginBottom: 0,
    zIndex: 1,
  },
  colThird: {
    marginBottom: 0,
    zIndex: 1,
  },
  medalCircle: {
    marginBottom: -4,
    zIndex: 3,
  },
  medalFirstCircle: {
    transform: [{ scale: 1.2 }],
    marginBottom: -2,
  },
  medalEmoji: {
    fontSize: 22,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarFirstCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#FFFBEB",
    borderColor: "#FCD34D",
    borderWidth: 2.5,
  },
  avatarEmoji: {
    fontSize: 26,
  },
  avatarEmojiLarge: {
    fontSize: 32,
  },
  name: {
    marginTop: 4,
    textAlign: "center",
    maxWidth: 90,
  },
  scorePill: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: Radius.circle,
    marginTop: 2,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  scoreFirstPill: {
    backgroundColor: "#FEF3C7",
    borderColor: "#FDE68A",
  },
  pedestal: {
    width: "90%",
    borderTopLeftRadius: Radius.md,
    borderTopRightRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  pedestalFirst: {
    height: 70,
    backgroundColor: "#FEF3C7",
    borderTopWidth: 3,
    borderColor: "#F59E0B",
  },
  pedestalSecond: {
    height: 52,
    backgroundColor: "#E2E8F0",
    borderTopWidth: 3,
    borderColor: "#94A3B8",
  },
  pedestalThird: {
    height: 40,
    backgroundColor: "#FFEDD5",
    borderTopWidth: 3,
    borderColor: "#F97316",
  },
});
