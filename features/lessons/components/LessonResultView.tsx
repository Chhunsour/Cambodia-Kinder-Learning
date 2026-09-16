import React, { useCallback } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { Text } from "@/components/ui/Text";
import { KokiButton } from "@/components/ui/KokiButton";
import { KokiCard } from "@/components/ui/KokiCard";
import { KokiMascot } from "@/components/koki/KokiMascot";
import { KokiAvatar } from "@/components/koki/KokiAvatar";
import { useWardrobe } from "@/features/wardrobe";
import { Palette } from "@/constants/theme";
import { Radius, Spacing } from "@/constants/spacing";
import { Depth } from "@/constants/depth";
import { useLocalization } from "@/hooks/useLocalization";
import { useKokiResponsive } from "@/hooks/useKokiResponsive";
import { useLessonSound } from "../hooks/useLessonSound";
import { LessonResult } from "../types";
import { ResultStarPodium } from "./ResultStarPodium";
import { CelebrationConfetti } from "./CelebrationConfetti";
import { RewardCoinBadge } from "@/features/wallet/components/RewardCoinBadge";
import { CoinRewardResult } from "@/features/wallet/types";
import { StreakRecordResult, PET_STAGE_DETAILS } from "@/features/streak";
import { StreakPet } from "@/components/koki/StreakPet";
import { SaveProgressPrompt } from "@/components/ui/SaveProgressPrompt";

export interface LessonResultViewProps {
  lessonId: string;
  result: LessonResult;
  childNickname?: string;
  profileId?: string | null;
  rewardResult?: CoinRewardResult | null;
  streakResult?: StreakRecordResult | null;
  onContinue: () => void;
  onPlayAgain: () => void;
  onSaveProgress?: () => void;
}

export const LessonResultView: React.FC<LessonResultViewProps> = ({
  lessonId,
  result,
  childNickname,
  profileId,
  rewardResult,
  streakResult,
  onContinue,
  onPlayAgain,
  onSaveProgress,
}) => {
  const { t, locale } = useLocalization();
  const responsive = useKokiResponsive();
  const { playCorrectSound } = useLessonSound();
  const { equippedAppearance } = useWardrobe();
  const isKm = locale === "km";

  const handleStarPop = useCallback(
    (starNumber: number) => {
      if (starNumber <= result.starsEarned) {
        playCorrectSound();
      }
    },
    [playCorrectSound, result.starsEarned]
  );

  // Dynamic headline based on stars earned
  const getHeadline = () => {
    switch (result.starsEarned) {
      case 3:
        return t("result.threeStarsTitle");
      case 2:
        return t("result.twoStarsTitle");
      case 1:
      default:
        return t("result.oneStarTitle");
    }
  };

  const praiseText = childNickname
    ? t("result.praiseMessage", { nickname: childNickname })
    : t("result.praiseMessageDefault");

  const activitiesCount =
    result.completedActivities > 0
      ? result.completedActivities
      : result.totalActivities;

  return (
    <View style={styles.outerContainer}>
      {/* 1. Celebratory Confetti Burst */}
      <CelebrationConfetti />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          responsive.isTablet && styles.tabletScrollContent,
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* 2. Cheering Koki Mascot with equipped cosmetics */}
        <View style={styles.mascotSection}>
          <KokiAvatar
            appearance={equippedAppearance}
            size={responsive.isTablet ? 130 : 110}
            mood="cheering"
          />
        </View>

        {/* 3. Sequential Star Reveal Podium */}
        <View style={styles.podiumSection}>
          <ResultStarPodium
            starsEarned={result.starsEarned}
            onStarPop={handleStarPop}
          />
        </View>

        {/* 4. Celebratory Coin Reward Badge (pops after stars) */}
        {rewardResult !== undefined && (
          <View style={styles.coinSection}>
            <RewardCoinBadge
              coinsEarned={rewardResult?.coinsEarned ?? 0}
              isStarImprovement={rewardResult?.starImprovement ?? false}
            />
          </View>
        )}

        {/* 5. Celebratory Streak & Pet Banner (only when streak updated today) */}
        {streakResult && streakResult.streakUpdated && (
          <View style={styles.streakSection}>
            <View style={styles.streakCelebrationPill}>
              <Text style={styles.streakFlameIcon}>🔥</Text>
              <Text variant="heading2" weight="900" color={Palette.primaryOrange}>
                {streakResult.currentStreak}
              </Text>
              <Text variant="bodySmall" weight="800" color={Palette.primaryText}>
                {t("streak.dayCount", { count: streakResult.currentStreak })}
              </Text>
            </View>

            {streakResult.petGrew && streakResult.newPetStage && (
              <View style={styles.petGrewBanner}>
                <StreakPet stage={streakResult.newPetStage} size={44} />
                <View style={styles.petGrewTextCol}>
                  <Text variant="bodySmall" weight="900" color={Palette.primaryOrange}>
                    {t("streak.petGrown")}
                  </Text>
                  <Text variant="caption" weight="700" color={Palette.secondaryText}>
                    {isKm
                      ? PET_STAGE_DETAILS[streakResult.newPetStage].titleKm
                      : PET_STAGE_DETAILS[streakResult.newPetStage].titleEn}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* 5. Encouraging Headline & Personalized Subtitle */}
        <View style={styles.messageSection}>
          <Text
            variant="display"
            weight="900"
            align="center"
            color={Palette.primaryOrange}
            style={styles.headlineText}
          >
            {getHeadline()}
          </Text>

          <Text
            variant="heading2"
            weight="700"
            align="center"
            color={Palette.primaryText}
            style={styles.praiseText}
          >
            {praiseText}
          </Text>
        </View>

        {/* 5. Child Summary Pill (Friendly & visual, no scorecards/coins) */}
        <View style={styles.summarySection}>
          <View style={styles.summaryPill}>
            <Text style={styles.summaryIcon}>🎯</Text>
            <Text
              variant="body"
              weight="800"
              color={Palette.primaryText}
              style={styles.summaryLabel}
            >
              {t("result.activitiesCompleted", { count: activitiesCount })}
            </Text>
          </View>
        </View>

        {/* 6. Optional Save Progress Prompt (after 3+ lessons) */}
        {profileId && onSaveProgress ? (
          <SaveProgressPrompt
            profileId={profileId}
            onSaveProgress={onSaveProgress}
            style={{ width: "100%", marginBottom: Spacing.sm }}
          />
        ) : null}

        {/* 7. Action CTAs */}
        <View style={styles.actionSection}>
          {/* Primary Action: Continue Adventure to Adventure Map */}
          <KokiButton
            variant="green"
            fullWidth={true}
            title={t("result.continueAdventure")}
            onPress={onContinue}
            accessibilityLabel={t("result.continueAdventure")}
          />

          {/* Secondary Action: Replay Lesson */}
          <KokiButton
            variant="secondary"
            fullWidth={true}
            title={t("result.playAgain")}
            onPress={onPlayAgain}
            accessibilityLabel={t("result.playAgain")}
          />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    width: "100%",
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxl,
    alignItems: "center",
    justifyContent: "space-between",
  },
  tabletScrollContent: {
    maxWidth: 540,
    alignSelf: "center",
    width: "100%",
  },
  mascotSection: {
    alignItems: "center",
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  podiumSection: {
    width: "100%",
    alignItems: "center",
    marginVertical: Spacing.xs,
  },
  coinSection: {
    width: "100%",
    alignItems: "center",
    marginVertical: Spacing.xs,
  },
  streakSection: {
    width: "100%",
    alignItems: "center",
    marginVertical: Spacing.xs,
    gap: Spacing.xs,
  },
  streakCelebrationPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Palette.pureWhite,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Palette.gold,
    gap: Spacing.xs,
    ...Depth.styles.subtleCard,
  },
  streakFlameIcon: {
    fontSize: 20,
  },
  petGrewBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Palette.goldLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Palette.gold,
    gap: Spacing.sm,
    maxWidth: 340,
    ...Depth.styles.subtleCard,
  },
  petGrewTextCol: {
    flex: 1,
  },
  messageSection: {
    width: "100%",
    alignItems: "center",
    marginVertical: Spacing.sm,
  },
  headlineText: {
    fontSize: 38,
    lineHeight: 46,
    letterSpacing: 0.5,
  },
  praiseText: {
    marginTop: Spacing.xs,
    lineHeight: 28,
    paddingHorizontal: Spacing.sm,
  },
  summarySection: {
    width: "100%",
    alignItems: "center",
    marginVertical: Spacing.md,
  },
  summaryPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Palette.pureWhite,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Palette.borderSubtle,
    ...Depth.styles.subtleCard,
  },
  summaryIcon: {
    fontSize: 20,
    marginRight: Spacing.xs,
  },
  summaryLabel: {
    fontSize: 16,
  },
  actionSection: {
    width: "100%",
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
});
