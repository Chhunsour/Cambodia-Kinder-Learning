import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { Text } from "@/components/ui/Text";
import { KokiCard } from "@/components/ui/KokiCard";
import { KokiButton } from "@/components/ui/KokiButton";
import { LeaderboardRow } from "./LeaderboardRow";
import { LeaderboardPodium } from "./LeaderboardPodium";
import { LeaderboardService, GetLeaderboardResult } from "../services/leaderboardService";
import { useLocalization } from "@/hooks/useLocalization";
import { useParentAccount } from "@/hooks/useParentAccount";
import { ChildProfile } from "@/types/user";
import { Palette } from "@/constants/theme";
import { Spacing, Radius } from "@/constants/spacing";

interface FriendsLeaderboardViewProps {
  profile: ChildProfile | null;
  onOpenParentGate: () => void;
}

export const FriendsLeaderboardView: React.FC<FriendsLeaderboardViewProps> = ({
  profile,
  onOpenParentGate,
}) => {
  const { t } = useLocalization();
  const { isBound, bindingInfo } = useParentAccount();
  const cloudChildId = bindingInfo?.cloud_child_id;

  const [leaderboardData, setLeaderboardData] = useState<GetLeaderboardResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadLeaderboard = useCallback(async (refresh = false) => {
    if (!profile?.id) return;
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const res = await LeaderboardService.getWeeklyLeaderboard(
        profile.id,
        cloudChildId,
        profile.nickname,
        profile.avatarId
      );
      setLeaderboardData(res);
    } catch (err) {
      console.warn("[FriendsLeaderboardView] Error fetching leaderboard:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [profile?.id, profile?.nickname, profile?.avatarId, cloudChildId]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  const entries = leaderboardData?.entries || [];
  const currentChildStars = leaderboardData?.currentChildStars ?? 0;
  const isOffline = Boolean(leaderboardData?.isOffline);
  const hasFriends = entries.length > 1;

  // Dynamic supportive encouragement message
  const encouragementText = useMemo(() => {
    if (currentChildStars >= 50) return t("leaderboard.encouragementMilestone50");
    if (currentChildStars >= 25) return t("leaderboard.encouragementMilestone25");
    if (currentChildStars >= 10) return t("leaderboard.encouragementMilestone10");
    return t("leaderboard.encouragement");
  }, [currentChildStars, t]);

  // Unbound guest state
  if (!isBound || !cloudChildId) {
    return (
      <View style={styles.container}>
        <KokiCard style={styles.card}>
          <Text variant="titleSmall" weight="800" color="#1E293B" align="center">
            {t("leaderboard.unboundTitle")}
          </Text>
          <Text
            variant="bodySmall"
            color="#64748B"
            align="center"
            style={styles.cardDesc}
          >
            {t("leaderboard.unboundDesc")}
          </Text>
          <KokiButton
            variant="primary"
            title={t("leaderboard.unboundCTA")}
            onPress={onOpenParentGate}
            style={{ marginTop: Spacing.md }}
          />
        </KokiCard>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 1. Weekly Progress Header */}
      <View style={styles.headerCard}>
        <View style={styles.headerTopRow}>
          <View>
            <Text variant="caption" weight="800" color="#B45309" style={{ textTransform: "uppercase" }}>
              📅 {t("leaderboard.thisWeek")}
            </Text>
            <Text variant="title" weight="800" color="#1E293B" style={{ marginTop: 2 }}>
              ⭐ {t("leaderboard.starsEarned").replace("{count}", String(currentChildStars))}
            </Text>
          </View>
          <Pressable
            onPress={() => loadLeaderboard(true)}
            style={({ pressed }) => [styles.refreshBtn, pressed && styles.refreshBtnPressed]}
            accessibilityRole="button"
            accessibilityLabel={t("leaderboard.refresh")}
          >
            {isRefreshing ? (
              <ActivityIndicator size="small" color="#B45309" />
            ) : (
              <Text style={{ fontSize: 18 }}>🔄</Text>
            )}
          </Pressable>
        </View>
        <Text variant="bodySmall" weight="700" color="#78350F" style={styles.encouragement}>
          {encouragementText}
        </Text>
      </View>

      {/* 2. Offline Notice */}
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Text variant="caption" weight="700" color="#92400E" align="center">
            📡 {t("leaderboard.offlineNotice")}
          </Text>
        </View>
      )}

      {/* Loading state */}
      {isLoading && !leaderboardData ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Palette.primaryOrange} />
        </View>
      ) : !hasFriends ? (
        /* 3. No Approved Friends State */
        <View>
          <KokiCard style={styles.card}>
            <Text style={styles.emptyEmoji} align="center">
              🌟
            </Text>
            <Text variant="titleSmall" weight="800" color="#1E293B" align="center" style={{ marginTop: Spacing.xs }}>
              {t("leaderboard.noFriendsTitle")}
            </Text>
            <Text
              variant="bodySmall"
              color="#64748B"
              align="center"
              style={styles.cardDesc}
            >
              {t("leaderboard.noFriendsDesc").replace("{stars}", String(currentChildStars))}
            </Text>
            <KokiButton
              variant="green"
              title={t("leaderboard.addFriendsCTA")}
              onPress={onOpenParentGate}
              style={{ marginTop: Spacing.md }}
            />
          </KokiCard>

          {/* Child's own row displayed below */}
          <View style={{ marginTop: Spacing.md }}>
            {entries.map((entry) => (
              <LeaderboardRow
                key={entry.child_id}
                entry={entry}
                isTied={false}
              />
            ))}
          </View>
        </View>
      ) : (
        /* 4. Active Friends Leaderboard */
        <View>
          {/* Top 3 Podium when 3+ friends */}
          {entries.length >= 3 && (
            <LeaderboardPodium topThree={entries.slice(0, 3)} />
          )}

          {/* Full List of Rankings */}
          <View style={styles.listContainer}>
            {entries.map((entry, index) => {
              const prev = entries[index - 1];
              const next = entries[index + 1];
              const isTied =
                (prev && prev.weekly_stars === entry.weekly_stars) ||
                (next && next.weekly_stars === entry.weekly_stars);

              return (
                <LeaderboardRow
                  key={entry.child_id}
                  entry={entry}
                  isTied={Boolean(isTied)}
                />
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  headerCard: {
    backgroundColor: "#FEF3C7",
    padding: Spacing.md,
    borderRadius: Radius.xl,
    marginBottom: Spacing.md,
    borderWidth: 1.5,
    borderColor: "#FDE68A",
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  refreshBtnPressed: {
    opacity: 0.7,
  },
  encouragement: {
    marginTop: Spacing.xs + 2,
  },
  offlineBanner: {
    backgroundColor: "#FFFBEB",
    paddingVertical: 6,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  loadingContainer: {
    paddingVertical: Spacing.xl,
    alignItems: "center",
  },
  card: {
    width: "100%",
    padding: Spacing.lg,
  },
  emptyEmoji: {
    fontSize: 44,
  },
  cardDesc: {
    marginTop: Spacing.xs,
    lineHeight: 20,
  },
  listContainer: {
    marginTop: Spacing.xs,
  },
});
