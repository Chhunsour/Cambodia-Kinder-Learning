import React, { useEffect, useState, useMemo } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { Text } from "@/components/ui/Text";
import { KokiCard } from "@/components/ui/KokiCard";
import { KokiButton } from "@/components/ui/KokiButton";
import { StarBadge } from "@/components/ui/StarBadge";
import { CoinBadge } from "@/components/ui/CoinBadge";
import { HeartBadge } from "@/components/ui/HeartBadge";
import { StreakBadge } from "@/components/ui/StreakBadge";
import { StreakPet } from "@/components/koki";
import { useLocalization } from "@/hooks/useLocalization";
import { useParentAccount } from "@/hooks/useParentAccount";
import { ParentAccountModal } from "./ParentAccountModal";
import { useWorldProgression } from "@/features/progression";
import { useHearts } from "@/features/hearts";
import { useWallet } from "@/features/wallet";
import { useStreak, PET_STAGE_DETAILS } from "@/features/streak";
import { LessonProgressRepository, LessonProgress } from "@/storage/repositories/lessonProgressRepository";
import { getLessonDefinition } from "@/features/lessons/services/lessonRegistry";
import { ChildProfile } from "@/types/user";
import { Palette } from "@/constants/theme";
import { Spacing, Radius } from "@/constants/spacing";

interface ParentOverviewTabProps {
  profile: ChildProfile | null;
}

export const ParentOverviewTab: React.FC<ParentOverviewTabProps> = ({ profile }) => {
  const { locale, t } = useLocalization();
  const isKm = locale === "km";

  // Main Adventure (Khmer) progress
  const { summary: mainSummary } = useWorldProgression("world-1");

  // English Side Quest progress
  const { summary: englishSummary } = useWorldProgression("english_basics");

  // Hearts & Wallet & Streak
  const { currentHearts } = useHearts();
  const { coinBalance } = useWallet();
  const { streak, pet, currentStreak } = useStreak();

  // Cloud Sync & Parent Account
  const {
    status: accountStatus,
    email: parentEmail,
    isBound,
    bindingInfo,
    syncUIStatus,
    syncNow,
  } = useParentAccount();
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  const syncBadgeInfo = useMemo(() => {
    switch (syncUIStatus) {
      case "syncing":
        return {
          label: t("parent.syncStatusSyncing"),
          color: "#2563EB",
          bg: "#EFF6FF",
          border: "#BFDBFE",
          icon: "🔄",
        };
      case "saved_to_account":
        return {
          label: t("parent.syncStatusSavedToAccount"),
          color: "#047857",
          bg: "#ECFDF5",
          border: "#A7F3D0",
          icon: "☁️",
        };
      case "offline_pending":
        return {
          label: t("parent.syncStatusOffline"),
          color: "#D97706",
          bg: "#FFFBEB",
          border: "#FDE68A",
          icon: "⏳",
        };
      case "needs_attention":
        return {
          label: t("parent.syncStatusNeedsAttention"),
          color: "#DC2626",
          bg: "#FEF2F2",
          border: "#FECACA",
          icon: "⚠️",
        };
      case "saved_locally":
      default:
        return {
          label: t("parent.syncStatusSavedLocally"),
          color: "#475569",
          bg: "#F1F5F9",
          border: "#E2E8F0",
          icon: "🛡️",
        };
    }
  }, [syncUIStatus, t]);

  const handleManualSync = async () => {
    setIsManualSyncing(true);
    await syncNow();
    setIsManualSyncing(false);
  };

  // Real Recent Learning Activity from SQLite
  const [recentLessons, setRecentLessons] = useState<LessonProgress[]>([]);
  const [isLoadingRecent, setIsLoadingRecent] = useState(true);

  useEffect(() => {
    if (!profile?.id) return;
    let isMounted = true;

    LessonProgressRepository.getAllProgressRecords(profile.id)
      .then((records) => {
        if (!isMounted) return;
        // Filter completed, sort by last completed timestamp descending
        const completed = records
          .filter((r) => r.status === "completed" && r.lastCompletedAt > 0)
          .sort((a, b) => b.lastCompletedAt - a.lastCompletedAt)
          .slice(0, 4);

        setRecentLessons(completed);
        setIsLoadingRecent(false);
      })
      .catch((err) => {
        console.warn("[ParentOverviewTab] Error loading recent lessons:", err);
        if (isMounted) setIsLoadingRecent(false);
      });

    return () => {
      isMounted = false;
    };
  }, [profile?.id]);

  const totalCompletedLessons = useMemo(() => {
    return (mainSummary?.completedLessons || 0) + (englishSummary?.completedLessons || 0);
  }, [mainSummary, englishSummary]);

  const totalAllStars = useMemo(() => {
    return (mainSummary?.starsEarned || 0) + (englishSummary?.starsEarned || 0);
  }, [mainSummary, englishSummary]);

  const bandTitle = useMemo(() => {
    switch (profile?.learningBand) {
      case "champion":
        return isKm ? "ជើងឯក (Champion)" : "Champion (Ages 8–9)";
      case "adventurer":
        return isKm ? "អ្នកផ្សងព្រេង (Adventurer)" : "Adventurer (Ages 6–7)";
      case "explorer":
      default:
        return isKm ? "អ្នករុករក (Explorer)" : "Explorer (Ages 3–5)";
    }
  }, [profile?.learningBand, isKm]);

  return (
    <View style={styles.container}>
      {/* 1. Child High-Level Summary Card */}
      <KokiCard variant="normal" padding="md" style={styles.childHeaderCard}>
        <View style={styles.childHeaderRow}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarEmoji}>🐯</Text>
          </View>
          <View style={styles.childInfoColumn}>
            <Text variant="title" weight="800" color="#1E293B">
              {profile?.nickname || (isKm ? "អ្នករុករកតូច" : "Little Explorer")}
            </Text>
            <Text variant="caption" weight="600" color="#64748B" style={{ marginTop: 2 }}>
              {profile?.age || 5} {t("parent.ageYears")} • {bandTitle}
            </Text>
          </View>
        </View>

        <View style={styles.statsBadgesRow}>
          <View style={styles.statPill}>
            <Text style={styles.statPillIcon}>⭐</Text>
            <View>
              <Text variant="caption" weight="800" color="#1E293B">
                {totalAllStars}
              </Text>
              <Text variant="caption" weight="600" color="#64748B" style={{ fontSize: 10 }}>
                {t("parent.totalStars")}
              </Text>
            </View>
          </View>

          <View style={styles.statPill}>
            <Text style={styles.statPillIcon}>🔥</Text>
            <View>
              <Text variant="caption" weight="800" color="#1E293B">
                {currentStreak}
              </Text>
              <Text variant="caption" weight="600" color="#64748B" style={{ fontSize: 10 }}>
                {t("parent.streakTitle")}
              </Text>
            </View>
          </View>

          <View style={styles.statPill}>
            <Text style={styles.statPillIcon}>❤️</Text>
            <View>
              <Text variant="caption" weight="800" color="#1E293B">
                {currentHearts} / 5
              </Text>
              <Text variant="caption" weight="600" color="#64748B" style={{ fontSize: 10 }}>
                {t("parent.heartsTitle")}
              </Text>
            </View>
          </View>
        </View>
      </KokiCard>

      {/* 2. Subject / Track Progress Cards */}
      <View style={styles.sectionHeader}>
        <Text variant="titleSmall" weight="800" color="#1E293B">
          📚 {t("parent.subjects")}
        </Text>
      </View>

      {/* Khmer Main Adventure */}
      <KokiCard variant="normal" padding="md" style={styles.trackCard}>
        <View style={styles.trackCardRow}>
          <View style={[styles.trackIconBadge, { backgroundColor: "#FFF4E6" }]}>
            <Text style={styles.trackIconEmoji}>🇰🇭</Text>
          </View>
          <View style={styles.trackTextCol}>
            <Text variant="body" weight="800" color="#1E293B">
              {t("parent.khmerTrack")}
            </Text>
            <Text variant="caption" weight="600" color="#64748B">
              {mainSummary?.completedLessons || 0} / {mainSummary?.totalLessons || 10}{" "}
              {t("parent.lessonsCompleted")} • {mainSummary?.starsEarned || 0} /{" "}
              {mainSummary?.maxStars || 30} ⭐
            </Text>
          </View>
        </View>
      </KokiCard>

      {/* English Side Quest */}
      <KokiCard variant="normal" padding="md" style={styles.trackCard}>
        <View style={styles.trackCardRow}>
          <View style={[styles.trackIconBadge, { backgroundColor: "#E8EEFF" }]}>
            <Text style={styles.trackIconEmoji}>🔤</Text>
          </View>
          <View style={styles.trackTextCol}>
            <Text variant="body" weight="800" color="#1E293B">
              {t("parent.englishTrack")}
            </Text>
            <Text variant="caption" weight="600" color="#64748B">
              {englishSummary?.completedLessons || 0} / {englishSummary?.totalLessons || 6}{" "}
              {t("parent.lessonsCompleted")} • {englishSummary?.starsEarned || 0} /{" "}
              {englishSummary?.maxStars || 18} ⭐
            </Text>
          </View>
        </View>
      </KokiCard>

      {/* 3. Real Recent Learning Activity */}
      <View style={styles.sectionHeader}>
        <Text variant="titleSmall" weight="800" color="#1E293B">
          🕒 {t("parent.recentActivity")}
        </Text>
      </View>

      <KokiCard variant="normal" padding="md" style={styles.recentCard}>
        {recentLessons.length === 0 ? (
          <Text variant="bodySmall" color="#64748B" align="center" style={{ paddingVertical: Spacing.sm }}>
            {t("parent.noRecentActivity")}
          </Text>
        ) : (
          recentLessons.map((item, idx) => {
            const def = getLessonDefinition(item.lessonId);
            const title = isKm
              ? def?.titleKm || item.lessonId
              : def?.titleEn || item.lessonId;
            const isLast = idx === recentLessons.length - 1;

            const dateStr = item.lastCompletedAt
              ? new Date(item.lastCompletedAt).toLocaleDateString(
                  isKm ? "km-KH" : "en-US",
                  { month: "short", day: "numeric" }
                )
              : "";

            return (
              <View key={item.id} style={[styles.recentItemRow, !isLast && styles.recentItemBorder]}>
                <View style={styles.recentItemLeft}>
                  <Text variant="bodySmall" weight="700" color="#1E293B">
                    {title}
                  </Text>
                  <Text variant="caption" weight="600" color="#64748B">
                    {dateStr} • {item.completionCount}x
                  </Text>
                </View>
                <Text style={styles.recentStars}>
                  {"⭐".repeat(item.bestStars || 3)}
                </Text>
              </View>
            );
          })
        )}
      </KokiCard>

      {/* 4. Interactive Cloud Sync Card */}
      <KokiCard variant="outlined" padding="md" style={styles.syncCard}>
        <View style={styles.syncRow}>
          <Text style={styles.syncIcon}>{syncBadgeInfo.icon}</Text>
          <View style={styles.syncTextCol}>
            <View style={styles.syncHeaderLine}>
              <Text variant="bodySmall" weight="800" color="#334155">
                {t("parent.syncTitle")}
              </Text>
              <View
                style={[
                  styles.statusBadgePill,
                  {
                    backgroundColor: syncBadgeInfo.bg,
                    borderColor: syncBadgeInfo.border,
                  },
                ]}
              >
                <Text
                  variant="caption"
                  weight="800"
                  color={syncBadgeInfo.color}
                  style={{ fontSize: 11 }}
                >
                  {syncBadgeInfo.label}
                </Text>
              </View>
            </View>
            <Text variant="caption" weight="600" color="#64748B" style={{ marginTop: 2 }}>
              {isBound && parentEmail
                ? `${parentEmail}${
                    bindingInfo?.last_sync_at
                      ? ` • ${new Date(bindingInfo.last_sync_at).toLocaleDateString(
                          isKm ? "km-KH" : "en-US",
                          { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }
                        )}`
                      : ""
                  }`
                : isKm
                ? "ទិន្នន័យត្រូវបានរក្សាទុកតែលើឧបករណ៍នេះ។ ភ្ជាប់គណនីដើម្បីបម្រុងទុក។"
                : "Progress is saved on this device. Sign in to back up stars & streaks."}
            </Text>

            <View style={{ marginTop: Spacing.sm, flexDirection: "row", gap: Spacing.xs }}>
              {isBound && (
                <View style={{ flex: 1 }}>
                  <KokiButton
                    variant="primary"
                    title={isManualSyncing ? t("parent.syncing") : `☁️ ${t("parent.syncNow")}`}
                    onPress={handleManualSync}
                    disabled={isManualSyncing || syncUIStatus === "syncing"}
                  />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <KokiButton
                  variant={isBound ? "secondary" : "primary"}
                  title={
                    isBound
                      ? isKm
                        ? "គ្រប់គ្រង"
                        : "Manage"
                      : t("parent.saveProgressPromptCTA")
                  }
                  onPress={() => setIsAccountModalOpen(true)}
                />
              </View>
            </View>
          </View>
        </View>
      </KokiCard>

      {/* Account & Sync Modal */}
      <ParentAccountModal
        visible={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        profile={profile}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: Spacing.xl,
  },
  childHeaderCard: {
    backgroundColor: Palette.pureWhite,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    marginBottom: Spacing.md,
  },
  childHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FFF4E6",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FDBA74",
  },
  avatarEmoji: {
    fontSize: 26,
  },
  childInfoColumn: {
    flex: 1,
  },
  statsBadgesRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: Spacing.sm,
    gap: 6,
  },
  statPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flex: 1,
    gap: 6,
  },
  statPillIcon: {
    fontSize: 16,
  },
  sectionHeader: {
    marginBottom: Spacing.xs,
    marginTop: Spacing.xs,
  },
  trackCard: {
    backgroundColor: Palette.pureWhite,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    marginBottom: Spacing.sm,
  },
  trackCardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  trackIconBadge: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  trackIconEmoji: {
    fontSize: 22,
  },
  trackTextCol: {
    flex: 1,
  },
  recentCard: {
    backgroundColor: Palette.pureWhite,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    marginBottom: Spacing.md,
  },
  recentItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.xs,
  },
  recentItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  recentItemLeft: {
    flex: 1,
  },
  recentStars: {
    fontSize: 14,
  },
  syncCard: {
    backgroundColor: "#F8FAFC",
    borderColor: "#CBD5E1",
    borderStyle: "dashed",
    marginTop: Spacing.xs,
  },
  syncRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  syncIcon: {
    fontSize: 24,
  },
  syncTextCol: {
    flex: 1,
  },
  syncHeaderLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusBadgePill: {
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  boundPill: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  guestPill: {
    backgroundColor: "#F1F5F9",
    borderColor: "#E2E8F0",
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
});
