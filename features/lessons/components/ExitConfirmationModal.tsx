import React from "react";
import { View, StyleSheet, Modal, Pressable } from "react-native";
import { KokiCard } from "@/components/ui/KokiCard";
import { Text } from "@/components/ui/Text";
import { KokiButton } from "@/components/ui/KokiButton";
import { KokiMascot } from "@/components/koki/KokiMascot";
import { useLocalization } from "@/hooks/useLocalization";
import { Palette } from "@/constants/theme";
import { Spacing, Radius } from "@/constants/spacing";

interface ExitConfirmationModalProps {
  visible: boolean;
  onKeepPlaying: () => void;
  onConfirmLeave: () => void;
}

/**
 * Child-Friendly Exit Confirmation Modal.
 *
 * Prevents accidental loss of lesson progress while keeping the experience
 * gentle, supportive, and completely child-friendly.
 */
export function ExitConfirmationModal({
  visible,
  onKeepPlaying,
  onConfirmLeave,
}: ExitConfirmationModalProps) {
  const { t } = useLocalization();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onKeepPlaying}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdropDismiss} onPress={onKeepPlaying} />

        <KokiCard variant="elevated" padding="lg" style={styles.modalCard}>
          {/* Mascot wondering face */}
          <View style={styles.mascotWrapper}>
            <KokiMascot size={90} mood="thinking" />
          </View>

          {/* Title & Subtitle */}
          <Text
            variant="heading1"
            align="center"
            color={Palette.primaryText}
            style={styles.title}
          >
            {t("lesson.leaveTitle")}
          </Text>

          <Text
            variant="body"
            align="center"
            color={Palette.secondaryText}
            style={styles.subtitle}
          >
            {t("lesson.leaveSubtitle")}
          </Text>

          {/* Action Buttons */}
          <View style={styles.buttonStack}>
            {/* Primary Action: Keep Playing (Child should stay) */}
            <KokiButton
              variant="green"
              fullWidth={true}
              title={t("lesson.keepPlaying")}
              onPress={onKeepPlaying}
            />

            {/* Secondary Action: Leave */}
            <KokiButton
              variant="ghost"
              fullWidth={true}
              title={t("lesson.leaveLesson")}
              onPress={onConfirmLeave}
            />
          </View>
        </KokiCard>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.md,
  },
  backdropDismiss: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalCard: {
    width: "100%",
    maxWidth: 380,
    alignItems: "center",
    borderRadius: Radius.xl,
    backgroundColor: Palette.pureWhite,
  },
  mascotWrapper: {
    marginBottom: Spacing.xs,
  },
  title: {
    marginBottom: Spacing.xxs,
  },
  subtitle: {
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.xs,
  },
  buttonStack: {
    width: "100%",
    gap: Spacing.xs,
  },
});
