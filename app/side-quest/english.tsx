import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  useWindowDimensions,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { KokiScreen } from "@/components/ui/KokiScreen";
import { Text } from "@/components/ui/Text";
import { KokiButton } from "@/components/ui/KokiButton";
import { KokiCard } from "@/components/ui/KokiCard";
import { HeartBadge } from "@/components/ui/HeartBadge";
import { StarBadge } from "@/components/ui/StarBadge";
import { SpeechBubble } from "@/components/ui/SpeechBubble";
import { KokiAvatar } from "@/components/koki/KokiAvatar";
import { useLocalization } from "@/hooks/useLocalization";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import { useKokiResponsive } from "@/hooks/useKokiResponsive";
import { useWorldProgression } from "@/features/progression";
import { useHearts, HeartRecoveryModal } from "@/features/hearts";
import { useWardrobe } from "@/features/wardrobe";
import { MapNodeData } from "@/features/adventure/types";
import { Palette } from "@/constants/theme";
import { Spacing, Radius } from "@/constants/spacing";

// Node topic metadata for visual richness
const LESSON_ICONS: Record<string, string> = {
  en_001: "👋",
  en_002: "🎨",
  en_003: "🔢",
  en_004: "🦁",
  en_005: "🍎",
  en_006: "🌟",
};

/**
 * Dedicated English Side Quest Screen
 *
 * Child-friendly English exploration trail with:
 * - ABC visual theme with gentle sky-blue / lavender tones (#4A6FA5, #7B61FF)
 * - Independent progress tracking in SQLite (world_id = "english_basics")
 * - 6 structured beginner English lessons + Star Chest milestone
 * - Visual topic carousel (Greetings, Colors, Numbers, Animals, Food, Review)
 * - Hearts integration with automatic Practice Mode fallback on 0 hearts
 */
export default function EnglishSideQuestScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const responsive = useKokiResponsive();
  const { locale, t } = useLocalization();
  const isKm = locale === "km";

  const { profile } = useActiveProfile();
  const { equippedAppearance } = useWardrobe();

  // Dynamic progression for the English Side Quest track
  const { world, summary } = useWorldProgression("english_basics");

  // Dynamic hearts & practice state
  const { currentHearts, nextHeartInMs, fullRegenInMs } = useHearts();
  const [heartModalVisible, setHeartModalVisible] = useState(false);
  const [pendingLessonId, setPendingLessonId] = useState<string | null>(null);

  // Locked notice modal state
  const [lockedNoticeVisible, setLockedNoticeVisible] = useState(false);

  // Treasure modal state
  const [selectedTreasure, setSelectedTreasure] = useState<MapNodeData | null>(null);

  // Handle tapping a node on the trail
  const handleNodePress = useCallback(
    (node: MapNodeData) => {
      if (node.status === "locked") {
        setLockedNoticeVisible(true);
        return;
      }

      if (node.type === "treasure") {
        setSelectedTreasure(node);
        return;
      }

      const lessonId = node.lessonId || "en_001";

      if (node.status === "completed") {
        // Replaying completed lesson: if hearts > 0, progress mode, else practice mode
        const mode = currentHearts > 0 ? "progress" : "practice";
        router.push(
          `/lesson/${lessonId}?trackId=english_basics&origin=english_side_quest&mode=${mode}`
        );
        return;
      }

      // New lesson to progress
      if (currentHearts > 0) {
        router.push(
          `/lesson/${lessonId}?trackId=english_basics&origin=english_side_quest&mode=progress`
        );
      } else {
        setPendingLessonId(lessonId);
        setHeartModalVisible(true);
      }
    },
    [currentHearts, router]
  );

  const topicPills = useMemo(
    () => [
      { id: "greetings", icon: "👋", label: t("sideQuest.topicGreetings") },
      { id: "colors", icon: "🎨", label: t("sideQuest.topicColors") },
      { id: "numbers", icon: "🔢", label: t("sideQuest.topicNumbers") },
      { id: "animals", icon: "🦁", label: t("sideQuest.topicAnimals") },
      { id: "food", icon: "🍎", label: t("sideQuest.topicFood") },
      { id: "review", icon: "🌟", label: t("sideQuest.topicReview") },
    ],
    [t]
  );

  return (
    <KokiScreen
      scrollable={true}
      backgroundColor="#F4F7FC"
      contentContainerStyle={{
        ...styles.scrollContent,
        paddingTop: insets.top + Spacing.xs,
        paddingBottom: insets.bottom + Spacing.xxl,
      }}
    >
      <View
        style={[
          styles.container,
          responsive.isTablet && { maxWidth: 540, alignSelf: "center", width: "100%" },
        ]}
      >
        {/* ============================================================ */}
        {/* 1. TOP BAR: Back, Badge, Stars, Hearts                       */}
        {/* ============================================================ */}
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel={t("sideQuest.backToMain")}
          >
            <Text style={styles.backArrow}>‹</Text>
          </Pressable>

          <View style={styles.badgeWrapper}>
            <View style={styles.abcBadge}>
              <Text variant="caption" weight="800" color="#FFFFFF">
                {t("sideQuest.badge")}
              </Text>
            </View>
          </View>

          <View style={styles.statusGroup}>
            <StarBadge count={summary?.starsEarned ?? 0} compact={true} />
            <HeartBadge
              count={currentHearts}
              compact={true}
              onPress={() => setHeartModalVisible(true)}
            />
          </View>
        </View>

        {/* ============================================================ */}
        {/* 2. HERO SECTION: Mascot & Speech Bubble                      */}
        {/* ============================================================ */}
        <View style={styles.heroSection}>
          <Animated.View
            entering={FadeInDown.duration(400).springify()}
            style={styles.speechWrapper}
          >
            <SpeechBubble
              message={t("sideQuest.kokiGreeting")}
              speakerName="Koki"
              tailDirection="bottom"
              style={styles.speechBubble}
            />
          </Animated.View>

          <View style={styles.mascotWrapper}>
            <KokiAvatar
              appearance={equippedAppearance}
              size={responsive.isTablet ? 130 : 110}
              mood="happy"
            />
          </View>

          <View style={styles.titleContainer}>
            <Text variant="heading2" weight="800" align="center" color="#1E293B">
              {t("sideQuest.englishTitle")}
            </Text>
            <Text
              variant="bodySmall"
              weight="600"
              align="center"
              color="#64748B"
              style={styles.subtitle}
            >
              {t("sideQuest.englishSubtitle")}
            </Text>
          </View>
        </View>

        {/* ============================================================ */}
        {/* 3. TOPIC PILLS CAROUSEL                                      */}
        {/* ============================================================ */}
        <View style={styles.topicPillsSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.topicPillsList}
          >
            {topicPills.map((p) => (
              <View key={p.id} style={styles.topicPill}>
                <Text style={styles.topicPillIcon}>{p.icon}</Text>
                <Text variant="caption" weight="700" color="#334155">
                  {p.label}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* ============================================================ */}
        {/* 4. PROGRESS SUMMARY CARD                                     */}
        {/* ============================================================ */}
        <KokiCard variant="normal" padding="sm" style={styles.progressCard}>
          <View style={styles.progressCardRow}>
            <View style={styles.progressIconCircle}>
              <Text style={styles.progressIconText}>🏆</Text>
            </View>
            <View style={styles.progressInfo}>
              <Text variant="titleSmall" weight="800" color="#1E293B">
                {summary
                  ? `${summary.completedLessons} / ${summary.totalLessons} ${
                      isKm ? "មេរៀនបានបញ្ចប់" : "Lessons Completed"
                    }`
                  : "0 / 6"}
              </Text>
              <Text variant="caption" weight="600" color="#64748B">
                {summary && summary.completedLessons >= summary.totalLessons
                  ? t("sideQuest.allCompleted")
                  : isKm
                  ? `ប្រមូលផ្កាយបាន ${summary?.starsEarned || 0} ផ្កាយ`
                  : `Earned ${summary?.starsEarned || 0} / ${summary?.maxStars || 18} stars`}
              </Text>
            </View>
          </View>
        </KokiCard>

        {/* ============================================================ */}
        {/* 5. PLAYFUL ADVENTURE TRAIL                                   */}
        {/* ============================================================ */}
        <View style={styles.trailContainer}>
          {world?.nodes.map((node, index) => {
            const isLast = index === (world.nodes.length - 1);
            const isTreasure = node.type === "treasure";
            const isCompleted = node.status === "completed";
            const isCurrent = node.status === "current";
            const isLocked = node.status === "locked";

            const icon = isTreasure
              ? "🎁"
              : LESSON_ICONS[node.lessonId || ""] || "📖";

            const primaryTitle = node.titleEn || "";
            const secondaryTitle = isKm ? node.titleKm : null;

            return (
              <View key={node.id} style={styles.nodeItemContainer}>
                {/* Visual trail vertical connector */}
                {!isLast && (
                  <View
                    style={[
                      styles.trailConnector,
                      isCompleted ? styles.connectorCompleted : styles.connectorPending,
                    ]}
                  />
                )}

                {/* Node interactive row */}
                <Pressable
                  onPress={() => handleNodePress(node)}
                  accessibilityRole="button"
                  accessibilityLabel={`${primaryTitle}, ${node.status}`}
                  style={({ pressed }) => [
                    styles.nodeCard,
                    isCurrent && styles.nodeCardCurrent,
                    isCompleted && styles.nodeCardCompleted,
                    isLocked && styles.nodeCardLocked,
                    pressed && { transform: [{ scale: 0.98 }] },
                  ]}
                >
                  {/* Left Token Circle */}
                  <View
                    style={[
                      styles.nodeTokenCircle,
                      isCurrent && styles.tokenCurrent,
                      isCompleted && styles.tokenCompleted,
                      isLocked && styles.tokenLocked,
                    ]}
                  >
                    <Text style={styles.nodeTokenEmoji}>
                      {isLocked ? "🔒" : icon}
                    </Text>
                  </View>

                  {/* Middle Lesson Info */}
                  <View style={styles.nodeDetails}>
                    <View style={styles.nodeLevelRow}>
                      <Text
                        variant="caption"
                        weight="800"
                        color={isCurrent ? "#7B61FF" : isCompleted ? "#059669" : "#94A3B8"}
                      >
                        {isTreasure
                          ? isKm
                            ? "កាដូពិសេស"
                            : "SPECIAL CHEST"
                          : `${isKm ? "មេរៀនទី" : "LESSON"} ${node.levelNumber || index + 1}`}
                      </Text>
                    </View>

                    <Text
                      variant="titleSmall"
                      weight="800"
                      color={isLocked ? "#94A3B8" : "#1E293B"}
                      style={styles.nodeTitle}
                    >
                      {primaryTitle}
                    </Text>

                    {secondaryTitle && (
                      <Text
                        variant="caption"
                        weight="600"
                        color={isLocked ? "#CBD5E1" : "#64748B"}
                      >
                        ({secondaryTitle})
                      </Text>
                    )}
                  </View>

                  {/* Right Status / Stars / Play Action */}
                  <View style={styles.nodeRightColumn}>
                    {isCompleted ? (
                      <View style={styles.starsContainer}>
                        <Text style={styles.starRow}>
                          {"⭐".repeat(node.stars || 3)}
                        </Text>
                        <Text variant="caption" weight="700" color="#059669">
                          {isKm ? "លេងឡើងវិញ" : "Replay"}
                        </Text>
                      </View>
                    ) : isCurrent ? (
                      <View style={styles.playPill}>
                        <Text variant="caption" weight="800" color="#FFFFFF">
                          {isKm ? "ចូលលេង" : "Start"} ▶
                        </Text>
                      </View>
                    ) : isTreasure && !isLocked ? (
                      <View style={styles.claimPill}>
                        <Text variant="caption" weight="800" color="#FFFFFF">
                          {isKm ? "បើកកាដូ" : "Open"}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.lockedPill}>
                        <Text style={styles.lockedIcon}>🔒</Text>
                      </View>
                    )}
                  </View>
                </Pressable>
              </View>
            );
          })}
        </View>

        {/* Gentle Heart Advice */}
        {currentHearts === 0 && (
          <View style={styles.practiceBanner}>
            <Text style={styles.practiceBannerIcon}>💡</Text>
            <Text
              variant="caption"
              weight="600"
              color="#475569"
              style={styles.practiceBannerText}
            >
              {t("hearts.recoveryHint")}
            </Text>
          </View>
        )}
      </View>

      {/* Heart Recovery & Practice Mode Modal */}
      <HeartRecoveryModal
        visible={heartModalVisible}
        currentHearts={currentHearts}
        nextHeartInMs={nextHeartInMs}
        fullRegenInMs={fullRegenInMs}
        showPracticeButton={true}
        onPractice={() => {
          setHeartModalVisible(false);
          const target = pendingLessonId || "en_001";
          setPendingLessonId(null);
          router.push(
            `/lesson/${target}?trackId=english_basics&origin=english_side_quest&mode=practice`
          );
        }}
        onClose={() => {
          setHeartModalVisible(false);
          setPendingLessonId(null);
        }}
      />

      {/* Locked Level Notice Modal */}
      <Modal
        visible={lockedNoticeVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLockedNoticeVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setLockedNoticeVisible(false)}
        >
          <View style={styles.noticeCard}>
            <View style={styles.noticeIconCircle}>
              <Text style={styles.noticeIconEmoji}>🔒</Text>
            </View>
            <Text variant="title" weight="800" align="center" color="#1E293B">
              {isKm ? "មេរៀនត្រូវបានចាក់សោ" : "Lesson Locked"}
            </Text>
            <Text
              variant="bodySmall"
              weight="600"
              align="center"
              color="#64748B"
              style={styles.noticeBody}
            >
              {t("sideQuest.finishPreviousHint")}
            </Text>
            <KokiButton
              variant="primary"
              title={isKm ? "យល់ព្រម" : "Got It"}
              onPress={() => setLockedNoticeVisible(false)}
            />
          </View>
        </Pressable>
      </Modal>

      {/* Treasure Opened Modal */}
      <Modal
        visible={!!selectedTreasure}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedTreasure(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setSelectedTreasure(null)}
        >
          <View style={styles.noticeCard}>
            <View style={[styles.noticeIconCircle, { backgroundColor: "#FEF3C7" }]}>
              <Text style={styles.noticeIconEmoji}>🎁</Text>
            </View>
            <Text variant="title" weight="800" align="center" color="#1E293B">
              {isKm
                ? selectedTreasure?.titleKm || "ប្រអប់ផ្កាយអង់គ្លេស"
                : selectedTreasure?.titleEn || "English Star Chest"}
            </Text>
            <Text
              variant="bodySmall"
              weight="600"
              align="center"
              color="#64748B"
              style={styles.noticeBody}
            >
              {isKm
                ? selectedTreasure?.descriptionKm || "អបអរសាទរ! ប្អូនបានរៀនពាក្យអង់គ្លេសយ៉ាងស្ទាត់ជំនាញ!"
                : selectedTreasure?.descriptionEn || "Hooray! You mastered Greetings and Colors in English!"}
            </Text>
            <KokiButton
              variant="green"
              title={isKm ? "អស្ចារ្យណាស់!" : "Awesome!"}
              onPress={() => setSelectedTreasure(null)}
            />
          </View>
        </Pressable>
      </Modal>
    </KokiScreen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    paddingHorizontal: Spacing.sm,
  },

  // 1. Top Bar
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.xs,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    backgroundColor: Palette.pureWhite,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  backArrow: {
    fontSize: 28,
    color: "#334155",
    fontWeight: "700",
    marginTop: -2,
  },
  badgeWrapper: {
    alignItems: "center",
  },
  abcBadge: {
    backgroundColor: "#7B61FF",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: "#6C4DF6",
  },
  statusGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },

  // 2. Hero Section
  heroSection: {
    alignItems: "center",
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  speechWrapper: {
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
    zIndex: 2,
  },
  speechBubble: {
    maxWidth: "96%",
  },
  mascotWrapper: {
    alignItems: "center",
    marginTop: -8,
    zIndex: 1,
  },
  titleContainer: {
    marginTop: Spacing.xs,
    alignItems: "center",
  },
  subtitle: {
    marginTop: 3,
  },

  // 3. Topic Pills
  topicPillsSection: {
    marginVertical: Spacing.xs,
  },
  topicPillsList: {
    gap: Spacing.xs,
    paddingHorizontal: Spacing.xxs,
  },
  topicPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Palette.pureWhite,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    gap: 5,
  },
  topicPillIcon: {
    fontSize: 15,
  },

  // 4. Progress Card
  progressCard: {
    backgroundColor: Palette.pureWhite,
    borderColor: "#E2E8F0",
    marginVertical: Spacing.xs,
  },
  progressCardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  progressIconCircle: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  progressIconText: {
    fontSize: 22,
  },
  progressInfo: {
    flex: 1,
  },

  // 5. Adventure Trail
  trailContainer: {
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  nodeItemContainer: {
    position: "relative",
  },
  trailConnector: {
    position: "absolute",
    left: 36,
    top: 56,
    bottom: -Spacing.sm,
    width: 4,
    borderRadius: 2,
    zIndex: 1,
  },
  connectorCompleted: {
    backgroundColor: "#10B981",
  },
  connectorPending: {
    backgroundColor: "#E2E8F0",
  },
  nodeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Palette.pureWhite,
    borderRadius: Radius.lg,
    padding: Spacing.sm,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    borderBottomWidth: 4,
    borderBottomColor: "#CBD5E1",
    zIndex: 2,
    gap: Spacing.sm,
  },
  nodeCardCurrent: {
    borderColor: "#7B61FF",
    borderBottomColor: "#5B3BD4",
    backgroundColor: "#FAF9FF",
    shadowColor: "#7B61FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  nodeCardCompleted: {
    borderColor: "#10B981",
    borderBottomColor: "#059669",
    backgroundColor: "#F0FDF4",
  },
  nodeCardLocked: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
    borderBottomColor: "#CBD5E1",
    opacity: 0.75,
  },
  nodeTokenCircle: {
    width: 52,
    height: 52,
    borderRadius: Radius.pill,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  tokenCurrent: {
    backgroundColor: "#EDE9FE",
    borderColor: "#7B61FF",
  },
  tokenCompleted: {
    backgroundColor: "#D1FAE5",
    borderColor: "#10B981",
  },
  tokenLocked: {
    backgroundColor: "#F1F5F9",
    borderColor: "#CBD5E1",
  },
  nodeTokenEmoji: {
    fontSize: 24,
  },
  nodeDetails: {
    flex: 1,
  },
  nodeLevelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  nodeTitle: {
    lineHeight: 20,
  },
  nodeRightColumn: {
    alignItems: "flex-end",
    justifyContent: "center",
  },
  starsContainer: {
    alignItems: "flex-end",
    gap: 2,
  },
  starRow: {
    fontSize: 13,
  },
  playPill: {
    backgroundColor: "#7B61FF",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: "#6C4DF6",
  },
  claimPill: {
    backgroundColor: "#F59E0B",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.pill,
  },
  lockedPill: {
    width: 36,
    height: 36,
    borderRadius: Radius.pill,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  lockedIcon: {
    fontSize: 16,
  },

  // Practice Hint Banner
  practiceBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    padding: Spacing.sm,
    borderRadius: Radius.md,
    marginTop: Spacing.md,
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  practiceBannerIcon: {
    fontSize: 18,
  },
  practiceBannerText: {
    flex: 1,
    lineHeight: 18,
  },

  // Notice Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.md,
  },
  noticeCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: Palette.pureWhite,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E2E8F0",
    borderBottomWidth: 5,
    borderBottomColor: "#CBD5E1",
  },
  noticeIconCircle: {
    width: 64,
    height: 64,
    borderRadius: Radius.pill,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  noticeIconEmoji: {
    fontSize: 32,
  },
  noticeBody: {
    marginVertical: Spacing.md,
    lineHeight: 20,
  },
});
