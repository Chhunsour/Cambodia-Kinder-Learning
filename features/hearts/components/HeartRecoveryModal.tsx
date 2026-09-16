import React from "react";
import { Modal, View, StyleSheet, TouchableWithoutFeedback, Dimensions } from "react-native";
import { Text } from "@/components/ui/Text";
import { KokiButton } from "@/components/ui/KokiButton";
import { Palette } from "@/constants/theme";
import { Radius, Spacing } from "@/constants/spacing";
import { Depth } from "@/constants/depth";
import { formatRemainingTime, MAX_HEARTS } from "../services/heartConfig";
import { useLocalization } from "@/hooks/useLocalization";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export interface HeartRecoveryModalProps {
  visible: boolean;
  currentHearts: number;
  maxHearts?: number;
  nextHeartInMs?: number | null;
  fullRegenInMs?: number | null;
  showPracticeButton?: boolean;
  onPractice?: () => void;
  onClose: () => void;
}

export const HeartRecoveryModal: React.FC<HeartRecoveryModalProps> = ({
  visible,
  currentHearts,
  maxHearts = MAX_HEARTS,
  nextHeartInMs = null,
  fullRegenInMs = null,
  showPracticeButton = true,
  onPractice,
  onClose,
}) => {
  const { t, locale } = useLocalization();
  const isKm = locale === "km";

  if (!visible) return null;

  const isZero = currentHearts <= 0;
  const isFull = currentHearts >= maxHearts;

  const title = isZero ? t("hearts.breakTitle") : t("hearts.title");
  const subtitle = isZero
    ? t("hearts.breakSubtitle")
    : isFull
    ? t("hearts.fullHearts")
    : t("hearts.recoveryHint");

  const formattedNext = nextHeartInMs ? formatRemainingTime(nextHeartInMs, isKm) : null;
  const formattedFull = fullRegenInMs ? formatRemainingTime(fullRegenInMs, isKm) : null;

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
              {/* Top Heart Badge Banner */}
              <View style={styles.heartCircle}>
                <Text style={styles.heartEmoji}>{isZero ? "🤍" : "❤️"}</Text>
              </View>

              {/* Title & Emotional Subtitle */}
              <Text
                variant="heading2"
                weight="900"
                align="center"
                color={Palette.primaryText}
                style={styles.titleText}
              >
                {title}
              </Text>

              <Text
                variant="bodySmall"
                align="center"
                color={Palette.secondaryText}
                style={styles.subtitleText}
              >
                {subtitle}
              </Text>

              {/* Hearts Count Pill */}
              <View style={styles.heartsRow}>
                {Array.from({ length: maxHearts }).map((_, index) => (
                  <Text key={index} style={styles.heartIconSingle}>
                    {index < currentHearts ? "❤️" : "🤍"}
                  </Text>
                ))}
              </View>

              <Text
                variant="caption"
                weight="800"
                color={Palette.secondaryText}
                style={styles.countText}
              >
                {t("hearts.countA11y", { current: currentHearts, max: maxHearts })}
              </Text>

              {/* Regeneration Info Box (when not full) */}
              {!isFull && (
                <View style={styles.timerCard}>
                  {formattedNext && (
                    <View style={styles.timerRow}>
                      <Text style={styles.timerIcon}>⏳</Text>
                      <Text variant="caption" weight="800" color={Palette.primaryText}>
                        {t("hearts.nextHeartIn", { time: formattedNext })}
                      </Text>
                    </View>
                  )}

                  {formattedFull && (
                    <View style={styles.timerRow}>
                      <Text style={styles.timerIcon}>✨</Text>
                      <Text variant="caption" weight="700" color={Palette.secondaryText}>
                        {t("hearts.fullHeartsIn", { time: formattedFull })}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Actions */}
              <View style={styles.actionsContainer}>
                {showPracticeButton && onPractice && (
                  <KokiButton
                    variant="green"
                    title={t("hearts.practice")}
                    subtitle={t("hearts.practiceMode")}
                    fullWidth
                    onPress={onPractice}
                    style={styles.primaryActionButton}
                  />
                )}

                <KokiButton
                  variant="secondary"
                  title={t("hearts.backToAdventure")}
                  fullWidth
                  onPress={onClose}
                />
              </View>
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
  heartCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Palette.friendlyRedLight,
    borderWidth: 2,
    borderColor: "#FFA8A8",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  heartEmoji: {
    fontSize: 32,
  },
  titleText: {
    marginBottom: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  subtitleText: {
    lineHeight: 20,
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.md,
  },
  heartsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginVertical: Spacing.xs,
  },
  heartIconSingle: {
    fontSize: 22,
  },
  countText: {
    marginBottom: Spacing.md,
  },
  timerCard: {
    alignSelf: "stretch",
    backgroundColor: Palette.warmCream,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Palette.borderSubtle,
    padding: Spacing.sm,
    gap: 4,
    marginBottom: Spacing.lg,
  },
  timerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  timerIcon: {
    fontSize: 14,
  },
  actionsContainer: {
    alignSelf: "stretch",
    gap: Spacing.xs,
  },
  primaryActionButton: {
    marginBottom: 2,
  },
});
