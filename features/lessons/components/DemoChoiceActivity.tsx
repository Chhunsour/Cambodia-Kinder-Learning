import React, { useEffect } from "react";
import { View, StyleSheet, Pressable, Platform } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
} from "react-native-reanimated";
import { Text } from "@/components/ui/Text";
import { useLocalization } from "@/hooks/useLocalization";
import { TapChoiceActivityData, ChoiceOption, ActivityLifecycleState } from "../types";
import { Palette } from "@/constants/theme";
import { Spacing, Radius, TouchTarget } from "@/constants/spacing";
import { Depth } from "@/constants/depth";
import { AnimationPresets } from "@/hooks/useAnimation";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface DemoChoiceActivityProps {
  activity: TapChoiceActivityData;
  selectedOptionId: string | null;
  lifecycleState: ActivityLifecycleState;
  onSelectOption: (optionId: string) => void;
  onRetry: () => void;
}

interface ChoiceItemProps {
  option: ChoiceOption;
  isSelected: boolean;
  lifecycleState: ActivityLifecycleState;
  onPress: () => void;
}

function ChoiceItem({
  option,
  isSelected,
  lifecycleState,
  onPress,
}: ChoiceItemProps) {
  const { t } = useLocalization();
  const shakeX = useSharedValue(0);
  const scale = useSharedValue(1);

  const isCorrectState = isSelected && lifecycleState === "correct";
  const isIncorrectState = isSelected && lifecycleState === "incorrect";

  // Gentle shake animation on incorrect selection
  useEffect(() => {
    if (isIncorrectState) {
      shakeX.value = withSequence(
        withTiming(-8, { duration: 60 }),
        withTiming(8, { duration: 60 }),
        withTiming(-6, { duration: 60 }),
        withTiming(6, { duration: 60 }),
        withTiming(0, { duration: 60 })
      );
    }
  }, [isIncorrectState, shakeX]);

  // Pop animation on correct selection
  useEffect(() => {
    if (isCorrectState) {
      scale.value = withSequence(
        withTiming(1.06, { duration: 150 }),
        withSpring(1, AnimationPresets.bouncySpring)
      );
    }
  }, [isCorrectState, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }, { scale: scale.value }],
  }));

  const label = option.labelKey ? t(option.labelKey as any) : option.labelText || "";

  // Dynamic border & background colors based on answer state
  let backgroundColor: string = Palette.pureWhite;
  let borderColor: string = Palette.cardOutline;
  let extrusionColor: string = Palette.borderStrong;

  if (isCorrectState) {
    backgroundColor = "#EDF9EC";
    borderColor = Palette.green;
    extrusionColor = Palette.darkGreen;
  } else if (isIncorrectState) {
    // Gentle warm coral (never harsh red)
    backgroundColor = "#FFF3EB";
    borderColor = "#FFA372";
    extrusionColor = "#D95600";
  }

  return (
    <AnimatedPressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}${isCorrectState ? ", Correct" : ""}`}
      style={[styles.choiceWrapper, animatedStyle]}
    >
      {/* 3D Bottom Extrusion Rim */}
      <View style={[styles.choiceExtrusion, { backgroundColor: extrusionColor }]} />

      {/* Choice Face Surface */}
      <View
        style={[
          styles.choiceFace,
          { backgroundColor, borderColor },
          isCorrectState && styles.choiceFaceCorrect,
          isIncorrectState && styles.choiceFaceIncorrect,
        ]}
      >
        {option.icon && (
          <Text style={styles.choiceIcon} accessibilityElementsHidden={true}>
            {option.icon}
          </Text>
        )}

        {label ? (
          <Text
            variant="heading1"
            weight="800"
            color={isCorrectState ? Palette.darkGreen : Palette.primaryText}
            style={styles.choiceLabel}
          >
            {label}
          </Text>
        ) : null}

        {/* Positive confirmation checkmark badge on correct answer */}
        {isCorrectState && (
          <View style={styles.checkmarkBadge}>
            <Text style={styles.checkmarkText}>✓</Text>
          </View>
        )}
      </View>
    </AnimatedPressable>
  );
}

/**
 * Temporary Demo Activity Component.
 *
 * Implements choice interaction to verify the session lifecycle:
 * - Question prompt presentation
 * - Optional character visual (e.g. Khmer letter "ក" or emojis)
 * - Tappable answer options
 * - Answer locking and gentle feedback
 */
export function DemoChoiceActivity({
  activity,
  selectedOptionId,
  lifecycleState,
  onSelectOption,
  onRetry,
}: DemoChoiceActivityProps) {
  const { t } = useLocalization();

  const prompt = t(activity.promptKey as any, activity.promptParams);

  const handlePressOption = (optionId: string) => {
    if (lifecycleState === "incorrect") {
      onRetry();
    }
    onSelectOption(optionId);
  };

  return (
    <View style={styles.container}>
      {/* Question Prompt */}
      <View style={styles.promptArea}>
        <Text
          variant="heading1"
          weight="800"
          align="center"
          color={Palette.primaryText}
          style={styles.promptTitle}
        >
          {prompt}
        </Text>

        {/* Optional character / count visual */}
        {activity.characterVisual && (
          <View style={styles.visualBadge}>
            <Text
              variant="display"
              align="center"
              color={Palette.primaryOrange}
              style={styles.visualText}
            >
              {activity.characterVisual}
            </Text>
          </View>
        )}
      </View>

      {/* Answer Options Grid */}
      <View style={styles.optionsContainer}>
        {activity.options.map((option) => (
          <ChoiceItem
            key={option.id}
            option={option}
            isSelected={selectedOptionId === option.id}
            lifecycleState={lifecycleState}
            onPress={() => handlePressOption(option.id)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignItems: "center",
  },
  promptArea: {
    alignItems: "center",
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.xs,
  },
  promptTitle: {
    lineHeight: 32,
    marginBottom: Spacing.xs,
  },
  visualBadge: {
    backgroundColor: Palette.warmCream,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderColor: Palette.cardOutline,
    marginTop: Spacing.xs,
  },
  visualText: {
    fontSize: 42,
    lineHeight: 52,
  },
  optionsContainer: {
    width: "100%",
    gap: Spacing.sm,
  },
  choiceWrapper: {
    position: "relative",
    width: "100%",
    minHeight: TouchTarget.kid,
  },
  choiceExtrusion: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    top: 5,
    borderRadius: Radius.lg,
  },
  choiceFace: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 2,
    position: "relative",
    gap: Spacing.sm,
  },
  choiceFaceCorrect: {
    borderWidth: 2.5,
  },
  choiceFaceIncorrect: {
    borderWidth: 2,
  },
  choiceIcon: {
    fontSize: 30,
  },
  choiceLabel: {
    letterSpacing: 0.3,
  },
  checkmarkBadge: {
    position: "absolute",
    right: Spacing.md,
    width: 28,
    height: 28,
    borderRadius: Radius.pill,
    backgroundColor: Palette.green,
    alignItems: "center",
    justifyContent: "center",
  },
  checkmarkText: {
    color: Palette.pureWhite,
    fontSize: 16,
    fontWeight: "900",
  },
});
