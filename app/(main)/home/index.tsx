import React, { useState, useEffect } from "react";
import { View, StyleSheet, AccessibilityInfo, Platform } from "react-native";
import { useRouter } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  FadeInDown,
} from "react-native-reanimated";
import { KokiScreen } from "@/components/ui/KokiScreen";
import { Text } from "@/components/ui/Text";
import { KokiButton } from "@/components/ui/KokiButton";
import { KokiCard } from "@/components/ui/KokiCard";
import { GameIconButton } from "@/components/ui/GameIconButton";
import { StreakBadge } from "@/components/ui/StreakBadge";
import { StarBadge } from "@/components/ui/StarBadge";
import { CoinBadge } from "@/components/ui/CoinBadge";
import { HeartBadge } from "@/components/ui/HeartBadge";
import { SpeechBubble } from "@/components/ui/SpeechBubble";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { KokiMascot } from "@/components/koki/KokiMascot";
import { KokiAvatar } from "@/components/koki/KokiAvatar";
import { useLocalization } from "@/hooks/useLocalization";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import { useKokiResponsive } from "@/hooks/useKokiResponsive";
import { HOME_PREVIEW_STATE } from "@/features/home";
import { useWorldProgression } from "@/features/progression";
import { useWallet } from "@/features/wallet";
import { useWardrobe } from "@/features/wardrobe";
import { useStreak, StreakModal, PET_STAGE_DETAILS } from "@/features/streak";
import { useHearts, HeartRecoveryModal } from "@/features/hearts";
import { StreakPet } from "@/components/koki";
import { Palette } from "@/constants/theme";
import { Spacing, Radius, TouchTarget } from "@/constants/spacing";
import { Depth } from "@/constants/depth";

/**
 * Production Home Screen (Hub) for Koki
 *
 * Designed specifically for children ages 3–9:
 * 1. Immediate recognition of Koki mascot greeting the child by name
 * 2. Clear visual hierarchy: Continue Learning CTA is the unmistakable primary action
 * 3. Compact status header: Streak, Stars, Coins + subtle Parent entry
 * 4. Current learning topic preview (Khmer letters)
 * 5. Reward teaser creating anticipation
 * 6. Optional, distinct English side-quest card
 */
export default function HomeScreen() {
  const router = useRouter();
  const { locale, t } = useLocalization();
  const { profile } = useActiveProfile();
  const responsive = useKokiResponsive();
  const isKm = locale === "km";

  // Dynamic SQLite progression for active child profile
  const { summary, nextLesson, totalStars } = useWorldProgression("world-1");
  const {
    summary: englishSummary,
    nextLesson: englishNextLesson,
  } = useWorldProgression("english_basics");

  // Dynamic SQLite coin wallet balance for active child profile
  const { coinBalance } = useWallet();

  // Dynamic SQLite equipped cosmetic appearance for active child profile
  const { equippedAppearance } = useWardrobe();

  // Dynamic SQLite streak and companion pet progress for active child profile
  const { streak, pet, currentStreak } = useStreak();
  const [streakModalVisible, setStreakModalVisible] = useState(false);

  // Dynamic SQLite hearts & recovery state for active child profile
  const { currentHearts, nextHeartInMs, fullRegenInMs } = useHearts();
  const [heartModalVisible, setHeartModalVisible] = useState(false);

  const continueRoute = nextLesson
    ? `/lesson/${nextLesson.lessonId || "demo"}`
    : "/lesson/demo";

  const continueSubtitle = nextLesson
    ? isKm
      ? `កម្រិត ${nextLesson.levelNumber} • ${nextLesson.titleKm}`
      : `Level ${nextLesson.levelNumber} • ${nextLesson.titleEn}`
    : t(HOME_PREVIEW_STATE.continueLevelKey as any);

  const handleStartLesson = (preferPractice: boolean = false) => {
    if (currentHearts <= 0 && !preferPractice) {
      setHeartModalVisible(true);
      return;
    }
    const targetMode = preferPractice || currentHearts <= 0 ? "practice" : "progress";
    router.push(`${continueRoute}?mode=${targetMode}` as any);
  };

  // Accessibility: respect reduced-motion preference
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const listener = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion
    );
    return () => {
      listener?.remove();
    };
  }, []);

  // Continue Learning CTA breathing animation (subtle idle pulse)
  const ctaScale = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) {
      ctaScale.value = 1;
      return;
    }

    ctaScale.value = withRepeat(
      withSequence(
        withTiming(1.025, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [reduceMotion, ctaScale]);

  const ctaAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ctaScale.value }],
  }));

  // Resolve active child's nickname with culturally tailored fallback
  const childNickname =
    profile?.nickname && profile.nickname.trim().length > 0
      ? profile.nickname.trim()
      : isKm
      ? "អ្នករុករកតូច"
      : "Little Explorer";

  const greetingMessage = t("home.greeting", { name: childNickname });

  return (
    <KokiScreen
      scrollable={true}
      backgroundColor={Palette.warmCream}
      contentContainerStyle={{
        ...styles.scrollContent,
        paddingBottom: responsive.isTablet ? 140 : 120,
      }}
    >
      <View
        style={[
          styles.container,
          responsive.isTablet && { maxWidth: 540, alignSelf: "center", width: "100%" },
        ]}
      >
        {/* ============================================================ */}
        {/* 1. TOP STATUS ROW: Streak, Stars, Coins, Parent Gear         */}
        {/* ============================================================ */}
        <View style={styles.topStatusRow}>
          <View style={styles.badgesGroup}>
            <HeartBadge
              count={currentHearts}
              compact={true}
              onPress={() => setHeartModalVisible(true)}
            />
            <StreakBadge
              days={currentStreak}
              compact={true}
              onPress={() => setStreakModalVisible(true)}
            />
            <StarBadge count={totalStars} compact={true} />
            <CoinBadge amount={coinBalance} compact={true} />
          </View>

          {/* Subtle Parent entry button: low visual emphasis */}
          <GameIconButton
            type="settings"
            color="cream"
            size="compact"
            onPress={() => router.push("/parent")}
            accessibilityLabel={t("home.parentButtonA11y")}
          />
        </View>

        {/* ============================================================ */}
        {/* 2. KOKI HERO AREA: Mascot Greeting with Speech Bubble       */}
        {/* ============================================================ */}
        <View style={styles.heroSection}>
          {/* Subtle background floating decorative accents */}
          <View pointerEvents="none" style={styles.decorativeElements}>
            <View style={styles.cloudDecor}>
              <Text style={styles.cloudEmoji}>☁️</Text>
            </View>
            <View style={styles.sparkleDecor}>
              <Text style={styles.sparkleEmoji}>✨</Text>
            </View>
          </View>

          {/* Speech Bubble Greeting */}
          <Animated.View
            entering={FadeInDown.duration(400).springify()}
            style={styles.speechBubbleWrapper}
          >
            <SpeechBubble
              message={greetingMessage}
              speakerName="Koki"
              tailDirection="bottom"
              style={styles.speechBubble}
            />
          </Animated.View>

          {/* Mascot Centerpiece with equipped cosmetics */}
          <View style={styles.mascotContainer}>
            <KokiAvatar
              appearance={equippedAppearance}
              size={responsive.isTablet ? 150 : 125}
              mood="idle"
            />
          </View>
        </View>

        {/* ============================================================ */}
        {/* 3. CONTINUE LEARNING CTA: Primary Unmissable Game Button     */}
        {/* ============================================================ */}
        <Animated.View style={[styles.ctaWrapper, ctaAnimatedStyle]}>
          <KokiButton
            variant="primary"
            title={t("home.continueLearning")}
            subtitle={continueSubtitle}
            fullWidth={true}
            icon={
              <Text style={styles.playIcon} accessibilityElementsHidden={true}>
                ▶
              </Text>
            }
            onPress={() => handleStartLesson(false)}
            accessibilityLabel={`${t("home.continueLearning")}, ${continueSubtitle}`}
          />
        </Animated.View>

        {/* ============================================================ */}
        {/* 4. CURRENT LEARNING CARD: Next Lesson Preview               */}
        {/* ============================================================ */}
        <KokiCard
          variant="normal"
          padding="md"
          style={styles.lessonCard}
          onPress={() => handleStartLesson(false)}
          accessibilityRole="button"
          accessibilityLabel={`${t("home.nextLesson")}: ${
            nextLesson
              ? isKm
                ? nextLesson.titleKm
                : nextLesson.titleEn
              : t("home.learnLetter")
          }`}
        >
          {/* Card Header Tag & Stars */}
          <View style={styles.lessonCardHeader}>
            <View style={styles.nextLessonPill}>
              <Text
                variant="caption"
                weight="800"
                color={Palette.deepOrange}
                style={styles.pillText}
              >
                {t("home.nextLesson")}
              </Text>
            </View>

            <View style={styles.lessonStarsRow}>
              <Text style={styles.starIconSmall}>⭐</Text>
              <Text variant="caption" weight="800" color={Palette.primaryText}>
                {summary ? `${summary.completedLessons} / ${summary.totalLessons}` : "0 / 10"}
              </Text>
            </View>
          </View>

          {/* Card Body: Letter Token + Title */}
          <View style={styles.lessonCardBody}>
            {/* Chunky Khmer Letter Badge */}
            <View style={styles.letterTokenBadge}>
              <Text variant="heading1" weight="800" color={Palette.primaryOrange}>
                {nextLesson?.levelNumber === 1 ? "ក" : String(nextLesson?.levelNumber || "1")}
              </Text>
            </View>

            {/* Lesson Title & Topic Details */}
            <View style={styles.lessonInfoColumn}>
              <Text
                variant="caption"
                weight="600"
                color={Palette.secondaryText}
                style={styles.subjectCategory}
              >
                {nextLesson
                  ? isKm
                    ? `កម្រិត ${nextLesson.levelNumber}`
                    : `Level ${nextLesson.levelNumber}`
                  : t("home.khmerLetters")}
              </Text>
              <Text
                variant="titleSmall"
                weight="800"
                color={Palette.primaryText}
                style={styles.lessonTitle}
              >
                {nextLesson
                  ? isKm
                    ? nextLesson.titleKm
                    : nextLesson.titleEn
                  : t("home.learnLetter")}
              </Text>
            </View>

            {/* Navigation Arrow */}
            <View style={styles.lessonArrowCircle}>
              <Text style={styles.lessonArrowText}>➔</Text>
            </View>
          </View>
        </KokiCard>

        {/* ============================================================ */}
        {/* 5. STREAK COMPANION: Friendly Pet Card                      */}
        {/* ============================================================ */}
        <KokiCard
          variant="normal"
          padding="sm"
          style={styles.petCard}
          onPress={() => setStreakModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel={`${t("streak.title")}: ${currentStreak} days`}
        >
          <View style={styles.petCardContent}>
            <View style={styles.petIconBadge}>
              <StreakPet stage={pet?.highestStage ?? "egg"} size={44} />
            </View>

            <View style={styles.petTextColumn}>
              <View style={styles.petCardHeader}>
                <Text
                  variant="caption"
                  weight="800"
                  color={Palette.primaryOrange}
                >
                  {t("streak.petCompanion")}
                </Text>
                <View style={styles.petStreakPill}>
                  <Text style={styles.flameEmojiSmall}>🔥</Text>
                  <Text
                    variant="caption"
                    weight="900"
                    color={Palette.primaryOrange}
                  >
                    {currentStreak}
                  </Text>
                </View>
              </View>

              <Text
                variant="titleSmall"
                weight="800"
                color={Palette.primaryText}
              >
                {isKm
                  ? PET_STAGE_DETAILS[pet?.highestStage ?? "egg"].titleKm
                  : PET_STAGE_DETAILS[pet?.highestStage ?? "egg"].titleEn}
              </Text>
              <Text
                variant="caption"
                weight="600"
                color={Palette.secondaryText}
              >
                {t("streak.keepLearningHint")}
              </Text>
            </View>
          </View>
        </KokiCard>

        {/* ============================================================ */}
        {/* 6. REWARD PREVIEW: Anticipation Pill                         */}
        {/* ============================================================ */}
        <KokiCard variant="normal" padding="sm" style={styles.rewardCard}>
          <View style={styles.rewardCardContent}>
            <View style={styles.rewardIconBadge}>
              <Text style={styles.rewardEmoji}>🎁</Text>
            </View>

            <View style={styles.rewardTextColumn}>
              <Text
                variant="bodySmall"
                weight="700"
                color={Palette.primaryText}
                style={styles.rewardText}
              >
                {t("home.rewardNotice", {
                  count: HOME_PREVIEW_STATE.lessonsUntilTreasure,
                })}
              </Text>
              <View style={styles.rewardProgressBar}>
                <ProgressBar progress={0.5} height={8} />
              </View>
            </View>
          </View>
        </KokiCard>

        {/* ============================================================ */}
        {/* 7. OPTIONAL ENGLISH SIDE QUEST: Clear Secondary Exploration  */}
        {/* ============================================================ */}
        <KokiCard
          variant="outlined"
          padding="md"
          style={styles.sideQuestCard}
          onPress={() => router.push("/side-quest/english")}
          accessibilityRole="button"
          accessibilityLabel={`${t("sideQuest.englishTitle")}: ${t("sideQuest.englishSubtitle")}`}
        >
          {/* Side Quest Header Tag & Progress Stars */}
          <View style={styles.sideQuestHeader}>
            <View style={styles.sideQuestPill}>
              <Text variant="caption" weight="800" color="#7B61FF">
                {t("sideQuest.badge")}
              </Text>
            </View>
            <View style={styles.sideQuestProgressRow}>
              <Text style={styles.sideQuestStarIcon}>⭐</Text>
              <Text variant="caption" weight="800" color="#4A6FA5">
                {englishSummary
                  ? `${englishSummary.completedLessons} / ${englishSummary.totalLessons}`
                  : "0 / 6"}
              </Text>
            </View>
          </View>

          {/* Side Quest Row */}
          <View style={styles.sideQuestBody}>
            <View style={styles.sideQuestIconBadge}>
              <Text style={styles.sideQuestEmoji}>🔤</Text>
            </View>

            <View style={styles.sideQuestTextColumn}>
              <Text variant="titleSmall" weight="800" color={Palette.primaryText}>
                {englishNextLesson
                  ? isKm
                    ? englishNextLesson.titleKm
                    : englishNextLesson.titleEn
                  : t("sideQuest.englishTitle")}
              </Text>
              <Text
                variant="caption"
                weight="700"
                color="#4A6FA5"
                style={styles.sideQuestAction}
              >
                {englishSummary && englishSummary.completedLessons > 0
                  ? isKm
                    ? "បន្តដំណើរផ្សងព្រេង ➔"
                    : "Continue Adventure ➔"
                  : t("home.englishQuestAction")}
              </Text>
            </View>
          </View>
        </KokiCard>
      </View>

      {/* Daily Streak & Companion Growth Modal */}
      <StreakModal
        visible={streakModalVisible}
        streak={streak}
        pet={pet}
        onClose={() => setStreakModalVisible(false)}
      />

      {/* Heart Recovery & Practice Options Modal */}
      <HeartRecoveryModal
        visible={heartModalVisible}
        currentHearts={currentHearts}
        nextHeartInMs={nextHeartInMs}
        fullRegenInMs={fullRegenInMs}
        showPracticeButton={true}
        onPractice={() => {
          setHeartModalVisible(false);
          handleStartLesson(true);
        }}
        onClose={() => setHeartModalVisible(false)}
      />
    </KokiScreen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: Spacing.xs,
  },
  container: {
    paddingHorizontal: Spacing.sm,
  },

  // 1. Top Status Row
  topStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.xxs,
    marginBottom: Spacing.xs,
  },
  badgesGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },

  // 2. Koki Hero Area
  heroSection: {
    alignItems: "center",
    position: "relative",
    marginVertical: Spacing.xxs,
  },
  decorativeElements: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "space-between",
  },
  cloudDecor: {
    position: "absolute",
    top: 10,
    left: 12,
    opacity: 0.45,
  },
  cloudEmoji: {
    fontSize: 26,
  },
  sparkleDecor: {
    position: "absolute",
    top: 18,
    right: 18,
    opacity: 0.55,
  },
  sparkleEmoji: {
    fontSize: 20,
  },
  speechBubbleWrapper: {
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
    zIndex: 2,
  },
  speechBubble: {
    maxWidth: "96%",
  },
  mascotContainer: {
    alignItems: "center",
    marginTop: -8,
    zIndex: 1,
  },

  // 3. Continue Learning CTA
  ctaWrapper: {
    marginVertical: Spacing.sm,
    width: "100%",
  },
  playIcon: {
    fontSize: 20,
    color: Palette.pureWhite,
    marginRight: Spacing.xs,
  },

  // 4. Current Learning Card
  lessonCard: {
    marginBottom: Spacing.sm,
    backgroundColor: Palette.pureWhite,
  },
  lessonCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.xs,
  },
  nextLessonPill: {
    backgroundColor: Palette.orangeLight,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: "#FFD2B2",
  },
  pillText: {
    letterSpacing: 0.2,
  },
  lessonStarsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  starIconSmall: {
    fontSize: 14,
  },
  lessonCardBody: {
    flexDirection: "row",
    alignItems: "center",
  },
  letterTokenBadge: {
    width: 52,
    height: 52,
    borderRadius: Radius.lg,
    backgroundColor: Palette.warmCream,
    borderWidth: 1.5,
    borderColor: Palette.cardOutline,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },
  lessonInfoColumn: {
    flex: 1,
  },
  subjectCategory: {
    marginBottom: 2,
  },
  lessonTitle: {
    lineHeight: 22,
  },
  lessonArrowCircle: {
    width: 32,
    height: 32,
    borderRadius: Radius.pill,
    backgroundColor: Palette.warmCream,
    borderWidth: 1,
    borderColor: Palette.cardOutline,
    alignItems: "center",
    justifyContent: "center",
  },
  lessonArrowText: {
    fontSize: 14,
    color: Palette.primaryOrange,
    fontWeight: "800",
  },

  // 5. Reward Preview
  rewardCard: {
    marginBottom: Spacing.sm,
    backgroundColor: Palette.pureWhite,
    borderWidth: 1.5,
    borderColor: "#FFE2A8",
  },
  rewardCardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  rewardIconBadge: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    backgroundColor: "#FFF4D4",
    alignItems: "center",
    justifyContent: "center",
  },
  rewardEmoji: {
    fontSize: 20,
  },
  rewardTextColumn: {
    flex: 1,
  },
  rewardText: {
    marginBottom: 4,
  },
  rewardProgressBar: {
    width: "100%",
  },

  // 6. Optional English Side Quest
  sideQuestCard: {
    marginBottom: Spacing.md,
    backgroundColor: "#F4F6FF",
    borderColor: "#D9E0FF",
  },
  sideQuestHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.xs,
  },
  sideQuestPill: {
    alignSelf: "flex-start",
    backgroundColor: "#E8EEFF",
    paddingHorizontal: Spacing.xs,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: "#D0D9FF",
  },
  sideQuestProgressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  sideQuestStarIcon: {
    fontSize: 13,
  },
  sideQuestBody: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  sideQuestIconBadge: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    backgroundColor: Palette.pureWhite,
    borderWidth: 1.5,
    borderColor: "#D0D9FF",
    alignItems: "center",
    justifyContent: "center",
  },
  sideQuestEmoji: {
    fontSize: 22,
  },
  sideQuestTextColumn: {
    flex: 1,
  },
  sideQuestAction: {
    marginTop: 2,
  },

  // 5. Streak Companion Card
  petCard: {
    marginBottom: Spacing.sm,
    backgroundColor: Palette.pureWhite,
    borderWidth: 1.5,
    borderColor: "#FFE2A8",
  },
  petCardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  petIconBadge: {
    width: 52,
    height: 52,
    borderRadius: Radius.pill,
    backgroundColor: Palette.goldLight,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  petTextColumn: {
    flex: 1,
  },
  petCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  petStreakPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Palette.orangeLight,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.pill,
    gap: 2,
  },
  flameEmojiSmall: {
    fontSize: 12,
  },
});
