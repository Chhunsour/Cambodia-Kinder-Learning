import React from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "@/components/ui/Text";
import { KokiCard } from "@/components/ui/KokiCard";
import { LeaderboardEntry } from "@/lib/supabase/types";
import { BUILT_IN_AVATARS } from "@/constants/avatars";
import { useLocalization } from "@/hooks/useLocalization";
import { Palette } from "@/constants/theme";
import { Spacing, Radius } from "@/constants/spacing";

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  isTied?: boolean;
}

function getAvatarEmoji(avatarId?: string | null): string {
  const found = BUILT_IN_AVATARS.find((a) => a.id === avatarId);
  return found?.emoji || "🐯";
}

function getRankBadge(rank: number): { emoji: string; bg: string; text: string } {
  switch (rank) {
    case 1:
      return { emoji: "🥇", bg: "#FEF3C7", text: "#92400E" };
    case 2:
      return { emoji: "🥈", bg: "#F1F5F9", text: "#475569" };
    case 3:
      return { emoji: "🥉", bg: "#FFEDD5", text: "#9A3412" };
    default:
      return { emoji: `#${rank}`, bg: "#F8FAFC", text: "#64748B" };
  }
}

export const LeaderboardRow: React.FC<LeaderboardRowProps> = ({ entry, isTied = false }) => {
  const { t } = useLocalization();
  const rankInfo = getRankBadge(entry.rank);
  const isSelf = entry.is_current_child;

  const a11yText = isTied
    ? t("leaderboard.tiedRankA11y")
        .replace("{rank}", String(entry.rank))
        .replace("{name}", isSelf ? t("leaderboard.youTag") : entry.nickname)
        .replace("{stars}", String(entry.weekly_stars))
    : t("leaderboard.rankA11y")
        .replace("{rank}", String(entry.rank))
        .replace("{name}", isSelf ? t("leaderboard.youTag") : entry.nickname)
        .replace("{stars}", String(entry.weekly_stars));

  return (
    <View
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={a11yText}
      style={[
        styles.rowContainer,
        isSelf && styles.selfContainer,
      ]}
    >
      {/* Rank Indicator */}
      <View style={[styles.rankBox, { backgroundColor: rankInfo.bg }]}>
        <Text variant="caption" weight="800" color={rankInfo.text}>
          {rankInfo.emoji}
        </Text>
      </View>

      {/* Avatar */}
      <View style={styles.avatarBox}>
        <Text style={styles.avatarEmoji}>{getAvatarEmoji(entry.avatar_id)}</Text>
      </View>

      {/* Name and Tie Tag */}
      <View style={styles.nameCol}>
        <View style={styles.nameRow}>
          <Text
            variant="body"
            weight={isSelf ? "800" : "700"}
            color={isSelf ? Palette.primaryOrange : "#1E293B"}
            numberOfLines={1}
            style={styles.nameText}
          >
            {entry.nickname}
          </Text>
          {isSelf && (
            <View style={styles.youBadge}>
              <Text variant="caption" weight="800" color="#FFFFFF">
                {t("leaderboard.youTag")}
              </Text>
            </View>
          )}
        </View>
        {isTied && (
          <Text variant="caption" weight="600" color="#94A3B8" style={{ marginTop: 1 }}>
            {t("leaderboard.tiedTag")}
          </Text>
        )}
      </View>

      {/* Weekly Stars Pill */}
      <View style={styles.starsPill}>
        <Text style={styles.starIcon}>⭐</Text>
        <Text variant="bodySmall" weight="800" color="#B45309">
          {entry.weekly_stars}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  rowContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.lg,
    marginBottom: Spacing.xs + 2,
    borderWidth: 1.5,
    borderColor: "#F1F5F9",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  selfContainer: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FCD34D",
    borderWidth: 2,
  },
  rankBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },
  avatarBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },
  avatarEmoji: {
    fontSize: 24,
  },
  nameCol: {
    flex: 1,
    justifyContent: "center",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  nameText: {
    flexShrink: 1,
  },
  youBadge: {
    backgroundColor: Palette.primaryOrange,
    paddingVertical: 1,
    paddingHorizontal: 6,
    borderRadius: Radius.sm,
    marginLeft: Spacing.xs,
  },
  starsPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: Radius.circle,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  starIcon: {
    fontSize: 14,
    marginRight: 4,
  },
});
