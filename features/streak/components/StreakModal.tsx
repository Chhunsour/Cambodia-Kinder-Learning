import React from "react";
import { Modal, View, StyleSheet, TouchableWithoutFeedback, Dimensions } from "react-native";
import { Text } from "@/components/ui/Text";
import { KokiButton } from "@/components/ui/KokiButton";
import { Palette } from "@/constants/theme";
import { Radius, Spacing } from "@/constants/spacing";
import { Depth } from "@/constants/depth";
import { LearningStreak, StreakPet } from "../types";
import { PET_STAGE_DETAILS, calculatePetProgress } from "../services/petStageConfig";
import { StreakPet as StreakPetVisual } from "@/components/koki/StreakPet";
import { useLocalization } from "@/hooks/useLocalization";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export interface StreakModalProps {
  visible: boolean;
  streak: LearningStreak | null;
  pet: StreakPet | null;
  onClose: () => void;
}

export const StreakModal: React.FC<StreakModalProps> = ({
  visible,
  streak,
  pet,
  onClose,
}) => {
  const { t, locale } = useLocalization();
  const isKm = locale === "km";

  if (!visible) return null;

  const currentStreak = streak?.currentStreak ?? 0;
  const bestStreak = streak?.longestStreak ?? currentStreak;
  const stage = pet?.highestStage ?? "egg";
  const stageDetails = PET_STAGE_DETAILS[stage];

  const stageTitle = isKm ? stageDetails.titleKm : stageDetails.titleEn;
  const stageDesc = isKm ? stageDetails.descriptionKm : stageDetails.descriptionEn;

  const { nextThreshold, progressPercent } = calculatePetProgress(currentStreak, stage);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={[styles.dialogCard, Depth.styles.floatingCard]}>
              {/* Top Flame Badge & Header */}
              <View style={styles.streakHeader}>
                <View style={styles.flameCircle}>
                  <Text style={styles.flameEmoji}>🔥</Text>
                </View>
                <View style={styles.headerTextCol}>
                  <Text
                    variant="heading2"
                    weight="900"
                    color={Palette.primaryText}
                  >
                    {t("streak.dayCount", { count: currentStreak })}
                  </Text>
                  <Text
                    variant="bodySmall"
                    weight="700"
                    color={Palette.secondaryText}
                  >
                    {t("streak.bestRecord", { count: bestStreak })}
                  </Text>
                </View>
              </View>

              {/* Pet Showcase Container */}
              <View style={styles.petContainer}>
                <View style={styles.petGlowBackdrop} />
                <StreakPetVisual stage={stage} size={110} />
              </View>

              {/* Companion Stage Badge & Details */}
              <View style={styles.stagePill}>
                <Text style={styles.stageEmoji}>{stageDetails.icon}</Text>
                <Text
                  variant="bodySmall"
                  weight="900"
                  color={Palette.primaryOrange}
                >
                  {stageTitle}
                </Text>
              </View>

              <Text
                variant="bodySmall"
                align="center"
                color={Palette.secondaryText}
                style={styles.descriptionText}
              >
                {stageDesc}
              </Text>

              {/* Progress Bar towards Next Stage */}
              <View style={styles.progressSection}>
                <View style={styles.progressBarTrack}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${Math.round(progressPercent * 100)}%` },
                    ]}
                  />
                </View>
                <View style={styles.progressLabels}>
                  <Text variant="caption" weight="800" color={Palette.secondaryText}>
                    {nextThreshold !== null
                      ? isKm
                        ? `រៀន ${currentStreak} / ${nextThreshold} ថ្ងៃ ដើម្បីវិវត្ត`
                        : `${currentStreak} / ${nextThreshold} days to evolve`
                      : isKm
                      ? "កម្រិតខ្ពស់បំផុតហើយ! 🌟"
                      : "Max level reached! 🌟"}
                  </Text>
                </View>
              </View>

              {/* Motivating footer hint */}
              <Text
                variant="caption"
                align="center"
                weight="700"
                color={Palette.secondaryText}
                style={styles.hintText}
              >
                {t("streak.keepLearningHint")}
              </Text>

              {/* Confirm Button */}
              <KokiButton
                variant="primary"
                title={t("streak.close")}
                onPress={onClose}
                fullWidth
                style={styles.confirmButton}
              />
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  dialogCard: {
    width: Math.min(SCREEN_WIDTH - 48, 380),
    backgroundColor: Palette.pureWhite,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: "center",
    borderWidth: 2,
    borderColor: Palette.cardOutline,
  },
  streakHeader: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  flameCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Palette.orangeLight,
    borderWidth: 1.5,
    borderColor: Palette.gold,
    justifyContent: "center",
    alignItems: "center",
  },
  flameEmoji: {
    fontSize: 26,
  },
  headerTextCol: {
    flex: 1,
  },
  petContainer: {
    width: 140,
    height: 120,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    marginVertical: Spacing.xs,
  },
  petGlowBackdrop: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: Palette.goldLight,
    opacity: 0.8,
  },
  stagePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xxs,
    backgroundColor: Palette.warmCream,
    borderWidth: 1.5,
    borderColor: Palette.borderStrong,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    marginTop: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  stageEmoji: {
    fontSize: 18,
  },
  descriptionText: {
    lineHeight: 18,
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.md,
  },
  progressSection: {
    alignSelf: "stretch",
    marginBottom: Spacing.sm,
  },
  progressBarTrack: {
    height: 12,
    backgroundColor: Palette.borderSubtle,
    borderRadius: Radius.pill,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Palette.borderStrong,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: Palette.primaryOrange,
    borderRadius: Radius.pill,
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 4,
  },
  hintText: {
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.xs,
  },
  confirmButton: {
    alignSelf: "stretch",
  },
});
