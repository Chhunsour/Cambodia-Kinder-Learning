import React, { useCallback, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { Palette } from "@/constants/theme";
import { Radius, Spacing } from "@/constants/spacing";
import { useLocalization } from "@/hooks/useLocalization";
import { useKokiResponsive } from "@/hooks/useKokiResponsive";
import {
  ActivityLifecycleState,
  CountingActivityData,
  TapChoiceOption,
} from "../types";
import { CountingBoard } from "./CountingBoard";
import { TapChoiceCard } from "./TapChoiceCard";
import { useLessonSound } from "../hooks/useLessonSound";

export interface CountingActivityProps {
  activity: CountingActivityData;
  lifecycleState: ActivityLifecycleState;
  onComplete: () => void;
  onRecordAttempt?: (isCorrect: boolean, report?: any) => void;
  onSelectOption?: (optionId: string) => void;
}

export const CountingActivity: React.FC<CountingActivityProps> = ({
  activity,
  lifecycleState,
  onComplete,
  onRecordAttempt,
  onSelectOption,
}) => {
  const { locale, t } = useLocalization();
  const responsive = useKokiResponsive();
  const isKm = locale === "km";
  const { playCorrectSound, playIncorrectSound } = useLessonSound();

  // Local selection and lifecycle states
  const [selectedNum, setSelectedNum] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean>(false);
  const [incorrectNum, setIncorrectNum] = useState<number | null>(null);
  const [showHint, setShowHint] = useState<boolean>(false);
  const [isLocked, setIsLocked] = useState<boolean>(false);

  // Performance metrics
  const attemptsRef = useRef<number>(0);
  const mistakesRef = useRef<number>(0);

  // Convert numeric options array [2, 3, 4] into TapChoiceOption objects
  const optionItems: TapChoiceOption[] = useMemo(() => {
    return activity.options.map((num) => ({
      id: `opt-count-${num}`,
      label: String(num),
      accessibilityLabel: isKm ? `ចម្លើយ ${num}` : `Answer ${num}`,
    }));
  }, [activity.options, isKm]);

  // Handle child tapping a numeric answer
  const handleSelectOption = useCallback(
    (num: number) => {
      if (isLocked || isCorrect) return;

      attemptsRef.current += 1;
      setSelectedNum(num);

      if (num === activity.count) {
        // Correct selection!
        setIsCorrect(true);
        setIsLocked(true);
        setIncorrectNum(null);
        playCorrectSound();

        if (onRecordAttempt) {
          onRecordAttempt(true, {
            activityId: activity.id,
            expectedCount: activity.count,
            selectedAnswer: num,
            isCorrect: true,
            attemptNumber: attemptsRef.current,
            mistakesCount: mistakesRef.current,
          });
        }

        if (onSelectOption) {
          onSelectOption(`opt-count-${num}`);
        }

        // Trigger session completion to activate Continue button
        setTimeout(() => {
          onComplete();
        }, 350);
      } else {
        // Incorrect selection
        mistakesRef.current += 1;
        setIncorrectNum(num);
        playIncorrectSound();

        if (onRecordAttempt) {
          onRecordAttempt(false, {
            activityId: activity.id,
            expectedCount: activity.count,
            selectedAnswer: num,
            isCorrect: false,
            attemptNumber: attemptsRef.current,
            mistakesCount: mistakesRef.current,
          });
        }

        // Enable visual count hint after 2 mistakes
        const hintThreshold = activity.enableHintAfterAttempts ?? 2;
        if (mistakesRef.current >= hintThreshold) {
          setShowHint(true);
        }

        // Reset temporary incorrect shake state to allow immediate retry
        setTimeout(() => {
          setIncorrectNum(null);
          setSelectedNum(null);
        }, 550);
      }
    },
    [
      activity.count,
      activity.enableHintAfterAttempts,
      activity.id,
      isCorrect,
      isLocked,
      onComplete,
      onRecordAttempt,
      onSelectOption,
      playCorrectSound,
      playIncorrectSound,
    ]
  );

  // Resolve localized instruction string
  const instructionText = useMemo(() => {
    if (isKm) {
      if (activity.instructionKm) return activity.instructionKm;
      if (activity.instruction) return activity.instruction;
      if (activity.instructionKey) return t(activity.instructionKey as any);
    } else {
      if (activity.instructionEn) return activity.instructionEn;
      if (activity.instruction) return activity.instruction;
      if (activity.instructionKey) return t(activity.instructionKey as any);
    }
    return isKm
      ? `តើមាន ${activity.objectLabelKm || "របស់"} ប៉ុន្មាន?`
      : `How many ${activity.objectLabelEn || "objects"} are there?`;
  }, [activity, isKm, t]);

  const objectLabel = isKm ? activity.objectLabelKm : activity.objectLabelEn;

  return (
    <View
      style={[
        styles.container,
        responsive.isTablet && styles.tabletContainer,
      ]}
    >
      {/* 1. Instruction Title */}
      <View style={styles.promptArea}>
        <Text
          variant="heading1"
          weight="800"
          align="center"
          color={Palette.primaryText}
          style={styles.instructionText}
        >
          {instructionText}
        </Text>
      </View>

      {/* 2. Counting Stage Board */}
      <CountingBoard
        activityId={activity.id}
        count={activity.count}
        objectIcon={activity.objectIcon}
        objectLabel={objectLabel}
        layout={activity.layout === "grid" ? "grouped" : activity.layout}
        showHint={showHint}
        isCorrect={isCorrect}
      />

      {/* 3. Reusable Numeric Answer Cards */}
      <View style={styles.optionsSection}>
        <View style={styles.optionsGrid}>
          {activity.options.map((num) => {
            const option = optionItems.find(
              (opt) => opt.id === `opt-count-${num}`
            )!;
            const isOptionSelected = selectedNum === num;
            const isOptionCorrect = isCorrect && num === activity.count;
            const isOptionIncorrect = incorrectNum === num;

            return (
              <View
                key={`count-option-${num}`}
                style={[
                  styles.optionCardWrapper,
                  activity.options.length <= 3 && styles.optionCardWrapperRow,
                ]}
              >
                <TapChoiceCard
                  option={option}
                  layout="text"
                  isSelected={isOptionSelected}
                  isCorrect={isOptionCorrect}
                  isIncorrect={isOptionIncorrect}
                  isLocked={isLocked}
                  onPress={() => handleSelectOption(num)}
                  locale={locale}
                />
              </View>
            );
          })}
        </View>
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
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  instructionText: {
    lineHeight: 34,
  },
  optionsSection: {
    width: "100%",
    marginTop: Spacing.md,
    alignItems: "center",
  },
  optionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: Spacing.sm,
    width: "100%",
    maxWidth: 480,
  },
  optionCardWrapper: {
    flex: 1,
    minWidth: 72,
    maxWidth: 140,
  },
  optionCardWrapperRow: {
    flex: 1,
    minWidth: 84,
  },
});
