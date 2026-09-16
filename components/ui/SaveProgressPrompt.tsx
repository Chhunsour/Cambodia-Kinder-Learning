import React, { useEffect, useState } from "react";
import { View, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { Text } from "./Text";
import { KokiCard } from "./KokiCard";
import { KokiButton } from "./KokiButton";
import { useLocalization } from "@/hooks/useLocalization";
import { CloudSyncService } from "@/features/parent/services/cloudSyncService";
import { Palette } from "@/constants/theme";
import { Spacing, Radius } from "@/constants/spacing";

interface SaveProgressPromptProps {
  profileId: string | null;
  onSaveProgress: () => void;
  onDismiss?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Gentle, non-blocking prompt encouraging parents to back up their child's progress.
 * Only triggers after >= 3 completed lessons and respects dismissal cooldowns.
 * Directs to the Parent Gate before reaching account creation.
 */
export const SaveProgressPrompt: React.FC<SaveProgressPromptProps> = ({
  profileId,
  onSaveProgress,
  onDismiss,
  style,
}) => {
  const { t } = useLocalization();
  const [isEligible, setIsEligible] = useState<boolean>(false);

  useEffect(() => {
    if (!profileId) return;
    let isMounted = true;

    CloudSyncService.checkSaveProgressPromptEligibility(profileId).then((eligible) => {
      if (isMounted) {
        setIsEligible(eligible);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [profileId]);

  const handleDismiss = async () => {
    if (profileId) {
      await CloudSyncService.dismissSaveProgressPrompt(profileId);
    }
    setIsEligible(false);
    onDismiss?.();
  };

  if (!isEligible) {
    return null;
  }

  return (
    <KokiCard
      variant="elevated"
      padding="md"
      style={StyleSheet.flatten([styles.container, style])}
    >
      <View style={styles.contentRow}>
        <View style={styles.iconCircle}>
          <Text style={styles.shieldIcon}>🛡️</Text>
        </View>
        <View style={styles.textCol}>
          <Text variant="titleSmall" weight="800" color="#1E293B">
            {t("parent.saveProgressPromptTitle")}
          </Text>
          <Text variant="caption" weight="600" color="#64748B" style={{ marginTop: 2 }}>
            {t("parent.saveProgressPromptDesc")}
          </Text>
        </View>
      </View>

      <View style={styles.actionsRow}>
        <View style={{ flex: 1 }}>
          <KokiButton
            variant="primary"
            title={t("parent.saveProgressPromptCTA")}
            onPress={onSaveProgress}
          />
        </View>
        <View style={{ flex: 0.6 }}>
          <KokiButton
            variant="ghost"
            title={t("parent.saveProgressPromptDismiss")}
            onPress={handleDismiss}
          />
        </View>
      </View>
    </KokiCard>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Palette.pureWhite,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    marginVertical: Spacing.sm,
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: Radius.circle,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  shieldIcon: {
    fontSize: 20,
  },
  textCol: {
    flex: 1,
  },
  actionsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.md,
    alignItems: "center",
  },
});
