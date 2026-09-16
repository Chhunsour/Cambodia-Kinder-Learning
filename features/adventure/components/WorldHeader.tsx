import React from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { StarBadge } from "@/components/ui/StarBadge";
import { HeartBadge } from "@/components/ui/HeartBadge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Palette } from "@/constants/theme";
import { Spacing } from "@/constants/spacing";
import { WorldDefinition } from "../types";

interface WorldHeaderProps {
  world: WorldDefinition;
  isKm: boolean;
  hearts?: number;
  onHeartsPress?: () => void;
}

export const WorldHeader: React.FC<WorldHeaderProps> = ({
  world,
  isKm,
  hearts,
  onHeartsPress,
}) => {
  const worldName = isKm ? world.nameKm : world.nameEn;
  const worldSubtitle = isKm
    ? `ពិភពទី ${world.worldNumber}`
    : `World ${world.worldNumber}`;
  const progressRatio = world.totalLessons > 0 ? world.completedLessons / world.totalLessons : 0;

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.titleColumn}>
          <Text variant="heading2" weight="800" color={Palette.primaryOrange}>
            🏡 {worldName}
          </Text>
          <Text variant="caption" weight="600" color={Palette.secondaryText}>
            {worldSubtitle}
          </Text>
        </View>

        <View style={styles.statsRow}>
          {hearts !== undefined && (
            <HeartBadge count={hearts} compact={true} onPress={onHeartsPress} />
          )}
          <StarBadge count={world.totalStarsEarned} compact={true} />
        </View>
      </View>

      {/* Progress Bar & Counter */}
      <View style={styles.progressContainer}>
        <View style={styles.progressLabelRow}>
          <Text variant="caption" weight="700" color={Palette.secondaryText}>
            {isKm ? "ដំណើរការមេរៀន" : "Lesson Progress"}
          </Text>
          <Text variant="caption" weight="800" color={Palette.green}>
            {world.completedLessons} / {world.totalLessons}
          </Text>
        </View>
        <ProgressBar
          progress={progressRatio}
          height={10}
          style={styles.progressBar}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Palette.pureWhite,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Palette.cardOutline,
    borderBottomWidth: 4,
    borderBottomColor: Palette.borderStrong,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 20,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  titleColumn: {
    flex: 1,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  progressContainer: {
    marginTop: Spacing.xs,
  },
  progressLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  progressBar: {
    borderRadius: 4,
  },
});
