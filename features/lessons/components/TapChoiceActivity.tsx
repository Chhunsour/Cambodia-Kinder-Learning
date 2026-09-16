import React, { useCallback, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { Palette } from "@/constants/theme";
import { Radius, Spacing } from "@/constants/spacing";
import { useLocalization } from "@/hooks/useLocalization";
import { useKokiResponsive } from "@/hooks/useKokiResponsive";
import {
  ActivityLifecycleState,
  TapChoiceActivityData,
  TapChoiceOption,
} from "../types";
import { TapChoiceCard } from "./TapChoiceCard";
import { AudioReplayButton } from "./AudioReplayButton";
import { audioService } from "@/services/audio/audioService";

export interface TapChoiceActivityProps {
  activity: TapChoiceActivityData;
  selectedOptionId: string | null;
  lifecycleState: ActivityLifecycleState;
  onSelectOption: (optionId: string) => void;
  onRetry: () => void;
}

export const TapChoiceActivity: React.FC<TapChoiceActivityProps> = ({
  activity,
  selectedOptionId,
  lifecycleState,
  onSelectOption,
  onRetry,
}) => {
  const { locale, t } = useLocalization();
  const responsive = useKokiResponsive();
  const isKm = locale === "km";

  // Debounce/lock flag during fast feedback to prevent accidental double taps
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Determine presentation style: "text" | "image" | "image_label"
  const resolvedLayout: "text" | "image" | "image_label" = useMemo(() => {
    if (activity.layout && activity.layout !== "auto") {
      return activity.layout;
    }
    const hasVisual = activity.options.some(
      (opt) => Boolean(opt.icon || opt.colorHex || opt.imageKey)
    );
    const hasLabel = activity.options.some(
      (opt) =>
        Boolean(opt.label || opt.labelKm || opt.labelEn || opt.labelKey)
    );

    if (hasVisual && hasLabel) return "image_label";
    if (hasVisual && !hasLabel) return "image";
    return "text";
  }, [activity.layout, activity.options]);

  // Resolve localized instruction string
  const instructionText = useMemo(() => {
    if (isKm) {
      if (activity.instructionKm) return activity.instructionKm;
      if (activity.instruction) return activity.instruction;
      if (activity.instructionKey) return t(activity.instructionKey as any);
      if (activity.promptKey) return t(activity.promptKey as any);
    } else {
      if (activity.instructionEn) return activity.instructionEn;
      if (activity.instruction) return activity.instruction;
      if (activity.instructionKey) return t(activity.instructionKey as any);
      if (activity.promptKey) return t(activity.promptKey as any);
    }
    return "";
  }, [activity, isKm, t]);

  const promptVisual = activity.promptText || activity.characterVisual;

  const handleOptionPress = useCallback(
    (optionId: string) => {
      // Prevent taps if answer is already locked as correct, or during immediate processing
      if (lifecycleState === "correct" || lifecycleState === "completed" || isProcessing) {
        return;
      }

      setIsProcessing(true);

      // Play option-specific audio if defined (e.g. pronouncing tapped choice)
      const option = activity.options.find((opt) => opt.id === optionId);
      if (option?.audioKey) {
        audioService.playNarration(option.audioKey).catch(() => {});
      }

      if (lifecycleState === "incorrect") {
        onRetry();
      }

      onSelectOption(optionId);

      // Release processing lock after micro-animation initiates
      setTimeout(() => {
        setIsProcessing(false);
      }, 300);
    },
    [activity.options, lifecycleState, isProcessing, onRetry, onSelectOption]
  );

  const isLocked = lifecycleState === "correct" || lifecycleState === "completed";
  const optionCount = activity.options.length;

  // Decide grid arrangement: 2-column for 4 options or 2 options;
  // For 3 options: 1 centered top + 2 bottom (or 3-row for text)
  const isTwoColumn = optionCount === 4 || optionCount === 2 || (optionCount === 3 && resolvedLayout !== "text");

  return (
    <View
      style={[
        styles.container,
        responsive.isTablet && styles.tabletContainer,
      ]}
    >
      {/* 1. Instruction & Prompt Area */}
      <View style={styles.promptArea}>
        {instructionText ? (
          <Text
            variant="heading1"
            weight="800"
            align="center"
            color={Palette.primaryText}
            style={styles.instructionText}
          >
            {instructionText}
          </Text>
        ) : null}

        {/* Optional Prompt Visual (Character / Letters / Symbols) */}
        {promptVisual && (
          <View style={styles.visualBadge}>
            <Text
              variant="display"
              align="center"
              color={Palette.primaryOrange}
              style={styles.visualText}
            >
              {promptVisual}
            </Text>
          </View>
        )}

        {/* Optional Prompt Icon (e.g. 🍎🍎🍎) */}
        {activity.promptIcon && (
          <View style={styles.promptIconBadge}>
            <Text style={styles.promptIconText}>{activity.promptIcon}</Text>
          </View>
        )}

        {/* Required Audio Replay Button for Listening Activities */}
        {Boolean(activity.audioKey) && (
          <View style={styles.replayButtonContainer}>
            <AudioReplayButton
              audioKey={activity.audioKey!}
              isRequired={true}
              size={responsive.isTablet ? "large" : "normal"}
              autoplay={activity.autoplayAudio !== false}
            />
          </View>
        )}
      </View>

      {/* 2. Answer Options Grid */}
      <View
        style={[
          styles.gridContainer,
          isTwoColumn ? styles.twoColumnGrid : styles.singleColumnGrid,
        ]}
      >
        {activity.options.map((option, index) => {
          const isSelected = selectedOptionId === option.id;
          const isCorrect = isSelected && lifecycleState === "correct";
          const isIncorrect = isSelected && lifecycleState === "incorrect";

          // If 3 options in a 2-column grid, make the first option full-width centered
          const isTopOddInThree = optionCount === 3 && index === 0;

          return (
            <View
              key={option.id}
              style={[
                isTwoColumn ? styles.gridItemHalf : styles.gridItemFull,
                isTopOddInThree && styles.gridItemCentered,
              ]}
            >
              <TapChoiceCard
                option={option}
                layout={resolvedLayout}
                isSelected={isSelected}
                isCorrect={isCorrect}
                isIncorrect={isIncorrect}
                isLocked={isLocked}
                locale={locale}
                onPress={() => handleOptionPress(option.id)}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignItems: "center",
  },
  tabletContainer: {
    maxWidth: 580,
    alignSelf: "center",
  },
  promptArea: {
    alignItems: "center",
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  instructionText: {
    lineHeight: 34,
    marginBottom: Spacing.xs,
  },
  visualBadge: {
    backgroundColor: Palette.warmCream,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderColor: Palette.cardOutline,
    marginTop: Spacing.xs,
  },
  visualText: {
    fontSize: 44,
    lineHeight: 54,
  },
  promptIconBadge: {
    backgroundColor: Palette.warmCream,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Palette.cardOutline,
    marginTop: Spacing.xs,
  },
  promptIconText: {
    fontSize: 28,
    lineHeight: 36,
  },
  replayButtonContainer: {
    marginTop: Spacing.md,
    alignItems: "center",
  },
  gridContainer: {
    width: "100%",
  },
  twoColumnGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: Spacing.md,
  },
  singleColumnGrid: {
    flexDirection: "column",
    gap: Spacing.md,
  },
  gridItemHalf: {
    width: "48%",
  },
  gridItemFull: {
    width: "100%",
  },
  gridItemCentered: {
    width: "100%",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
});
