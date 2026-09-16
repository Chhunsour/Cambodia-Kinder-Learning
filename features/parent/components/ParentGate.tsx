import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Animated,
  useWindowDimensions,
} from "react-native";
import { Text } from "@/components/ui/Text";
import { KokiButton } from "@/components/ui/KokiButton";
import { KokiCard } from "@/components/ui/KokiCard";
import { GameIconButton } from "@/components/ui/GameIconButton";
import { useLocalization } from "@/hooks/useLocalization";
import { useKokiResponsive } from "@/hooks/useKokiResponsive";
import {
  generateMathGateChallenge,
  MathChallenge,
} from "../services/mathGateGenerator";
import { ParentGateSession } from "../services/parentGateSession";
import { Palette } from "@/constants/theme";
import { Spacing, Radius } from "@/constants/spacing";

interface ParentGateProps {
  onUnlock: () => void;
  onCancel: () => void;
}

const HOLD_DURATION_MS = 2500;

export const ParentGate: React.FC<ParentGateProps> = ({
  onUnlock,
  onCancel,
}) => {
  const { locale, t } = useLocalization();
  const responsive = useKokiResponsive();
  const isKm = locale === "km";

  // Gate phase: 1 = Hold button, 2 = Math check
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1: Hold button state
  const [isHolding, setIsHolding] = useState(false);
  const holdProgress = useRef(new Animated.Value(0)).current;
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Step 2: Math challenge state
  const [challenge, setChallenge] = useState<MathChallenge>(() =>
    generateMathGateChallenge()
  );
  const [enteredAnswer, setEnteredAnswer] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const failedAttemptsRef = useRef<number>(0);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
      }
    };
  }, []);

  // Handle Press In on Hold Button
  const handleHoldPressIn = () => {
    setIsHolding(true);
    Animated.timing(holdProgress, {
      toValue: 1,
      duration: HOLD_DURATION_MS,
      useNativeDriver: false,
    }).start();

    holdTimerRef.current = setTimeout(() => {
      setIsHolding(false);
      setStep(2);
    }, HOLD_DURATION_MS);
  };

  // Handle Press Out on Hold Button (released early)
  const handleHoldPressOut = () => {
    if (step === 1) {
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }
      setIsHolding(false);
      Animated.timing(holdProgress, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
  };

  // Accessibility alternative: skip hold directly to math challenge
  const handleSkipHold = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
    }
    setIsHolding(false);
    setStep(2);
  };

  // Step 2 Numpad press handlers
  const handleDigitPress = (digit: string) => {
    setErrorMessage(null);
    if (enteredAnswer.length < 3) {
      setEnteredAnswer((prev) => prev + digit);
    }
  };

  const handleDeletePress = () => {
    setErrorMessage(null);
    setEnteredAnswer((prev) => prev.slice(0, -1));
  };

  const handleSubmitAnswer = () => {
    if (!enteredAnswer) return;

    const parsed = parseInt(enteredAnswer, 10);
    if (parsed === challenge.expectedAnswer) {
      // Gate passed successfully!
      ParentGateSession.unlock();
      onUnlock();
    } else {
      // Incorrect answer: increment failures, show neutral feedback
      failedAttemptsRef.current += 1;
      setErrorMessage(t("parent.gateTryAgain"));
      setEnteredAnswer("");

      // Rotate question after 3 failed attempts
      if (failedAttemptsRef.current >= 3) {
        failedAttemptsRef.current = 0;
        setChallenge(generateMathGateChallenge());
      }
    }
  };

  const questionText = isKm ? challenge.questionKm : challenge.questionEn;

  return (
    <View
      style={[
        styles.container,
        responsive.isTablet && { maxWidth: 500, alignSelf: "center", width: "100%" },
      ]}
    >
      {/* Header with Back Button */}
      <View style={styles.headerRow}>
        <GameIconButton
          type="back"
          color="cream"
          size="compact"
          onPress={onCancel}
          accessibilityLabel={t("parent.gateBackToChild")}
        />
        <View style={styles.headerTitles}>
          <Text variant="title" weight="800" align="center" color="#1E293B">
            🔒 {t("parent.gateTitle")}
          </Text>
          <Text variant="caption" weight="600" align="center" color="#64748B">
            {t("parent.gateSubtitle")}
          </Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      {/* Step Indicators */}
      <View style={styles.stepsRow}>
        <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]}>
          <Text variant="caption" weight="800" color={step >= 1 ? "#FFFFFF" : "#94A3B8"}>
            1
          </Text>
        </View>
        <View style={[styles.stepLine, step === 2 && styles.stepLineActive]} />
        <View style={[styles.stepDot, step === 2 && styles.stepDotActive]}>
          <Text variant="caption" weight="800" color={step === 2 ? "#FFFFFF" : "#94A3B8"}>
            2
          </Text>
        </View>
      </View>

      {/* ============================================================ */}
      {/* STEP 1: PRESS AND HOLD (2.5 SECONDS)                          */}
      {/* ============================================================ */}
      {step === 1 && (
        <KokiCard variant="normal" padding="lg" style={styles.card}>
          <Text variant="titleSmall" weight="800" align="center" color="#1E293B">
            {t("parent.gateHoldPrompt")}
          </Text>
          <Text
            variant="bodySmall"
            weight="600"
            align="center"
            color="#64748B"
            style={styles.cardInstruction}
          >
            {isKm
              ? "សង្កត់ប៊ូតុងខាងក្រោមឱ្យពេញរបារ ដើម្បីបញ្ជាក់ថាអ្នកជាមនុស្សធំ"
              : "Press and hold the button below to prove you are an adult"}
          </Text>

          {/* Interactive Hold Button with Animated Progress */}
          <View style={styles.holdButtonWrapper}>
            <Pressable
              onPressIn={handleHoldPressIn}
              onPressOut={handleHoldPressOut}
              style={styles.holdButton}
              accessibilityRole="button"
              accessibilityLabel={t("parent.gateA11yHold")}
            >
              {/* Animated Progress Fill Background */}
              <Animated.View
                style={[
                  styles.holdProgressFill,
                  {
                    width: holdProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0%", "100%"],
                    }),
                  },
                ]}
              />

              <View style={styles.holdButtonContent}>
                <Text style={styles.holdEmoji}>{isHolding ? "⏳" : "👆"}</Text>
                <Text
                  variant="body"
                  weight="800"
                  color={isHolding ? "#FFFFFF" : "#1E293B"}
                >
                  {isHolding ? t("parent.gateHolding") : t("parent.gateHoldPrompt")}
                </Text>
              </View>
            </Pressable>
          </View>

          {/* Accessible Alternative: Skip Hold */}
          <Pressable
            onPress={handleSkipHold}
            style={styles.skipButton}
            accessibilityRole="button"
            accessibilityLabel={t("parent.gateSkipHoldA11y")}
          >
            <Text variant="caption" weight="700" color="#64748B">
              {t("parent.gateSkipHoldA11y")} ➔
            </Text>
          </Pressable>
        </KokiCard>
      )}

      {/* ============================================================ */}
      {/* STEP 2: ADULT ARITHMETIC CHECK                               */}
      {/* ============================================================ */}
      {step === 2 && (
        <KokiCard variant="normal" padding="md" style={styles.card}>
          <Text variant="caption" weight="800" align="center" color="#64748B">
            {isKm ? "ជំហានទី ២ ៖ សំណួរគណិតវិទ្យា" : "STEP 2: MATH CHECK"}
          </Text>

          {/* Math Question Display */}
          <View style={styles.questionBox}>
            <Text variant="heading1" weight="800" align="center" color="#1E293B">
              {t("parent.gateMathPrompt", { question: questionText })}
            </Text>
          </View>

          {/* Answer Display */}
          <View style={[styles.answerBox, errorMessage ? styles.answerBoxError : null]}>
            <Text
              variant="heading2"
              weight="800"
              color={enteredAnswer ? "#1E293B" : "#CBD5E1"}
            >
              {enteredAnswer || "?"}
            </Text>
          </View>

          {/* Error Message */}
          {errorMessage && (
            <Text variant="caption" weight="700" color="#EF4444" align="center" style={styles.errorText}>
              {errorMessage}
            </Text>
          )}

          {/* Clean Numpad Grid */}
          <View style={styles.numpad}>
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
              <Pressable
                key={num}
                onPress={() => handleDigitPress(num)}
                style={({ pressed }) => [
                  styles.numpadKey,
                  pressed && styles.numpadKeyPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={num}
              >
                <Text variant="heading2" weight="800" color="#1E293B">
                  {num}
                </Text>
              </Pressable>
            ))}

            {/* Backspace */}
            <Pressable
              onPress={handleDeletePress}
              style={({ pressed }) => [
                styles.numpadKey,
                styles.numpadActionKey,
                pressed && styles.numpadKeyPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Delete last digit"
            >
              <Text variant="titleSmall" weight="800" color="#64748B">
                ⌫
              </Text>
            </Pressable>

            {/* Zero */}
            <Pressable
              onPress={() => handleDigitPress("0")}
              style={({ pressed }) => [
                styles.numpadKey,
                pressed && styles.numpadKeyPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="0"
            >
              <Text variant="heading2" weight="800" color="#1E293B">
                0
              </Text>
            </Pressable>

            {/* Submit Checkmark */}
            <Pressable
              onPress={handleSubmitAnswer}
              style={({ pressed }) => [
                styles.numpadKey,
                styles.numpadSubmitKey,
                pressed && styles.numpadKeyPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Submit Answer"
            >
              <Text variant="title" weight="800" color="#FFFFFF">
                ✓
              </Text>
            </Pressable>
          </View>
        </KokiCard>
      )}

      {/* Return to Child Button */}
      <View style={styles.backSection}>
        <KokiButton
          variant="secondary"
          title={t("parent.gateBackToChild")}
          onPress={onCancel}
          fullWidth={true}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  headerTitles: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: Spacing.xs,
  },
  stepsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
    gap: Spacing.xs,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotActive: {
    backgroundColor: "#4A6FA5",
  },
  stepLine: {
    width: 48,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E2E8F0",
  },
  stepLineActive: {
    backgroundColor: "#4A6FA5",
  },
  card: {
    backgroundColor: Palette.pureWhite,
    borderRadius: Radius.xl,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    marginBottom: Spacing.lg,
  },
  cardInstruction: {
    marginTop: 4,
    marginBottom: Spacing.xl,
    maxWidth: 280,
    lineHeight: 20,
  },
  holdButtonWrapper: {
    width: "100%",
    maxWidth: 320,
    height: 64,
    borderRadius: Radius.pill,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#CBD5E1",
    borderBottomWidth: 4,
    borderBottomColor: "#94A3B8",
    marginBottom: Spacing.md,
  },
  holdButton: {
    width: "100%",
    height: "100%",
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  holdProgressFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "#4A6FA5",
    borderRadius: Radius.pill,
  },
  holdButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    zIndex: 2,
  },
  holdEmoji: {
    fontSize: 22,
  },
  skipButton: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  questionBox: {
    marginVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  answerBox: {
    width: 120,
    height: 52,
    borderRadius: Radius.md,
    backgroundColor: "#F1F5F9",
    borderWidth: 2,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  answerBoxError: {
    borderColor: "#EF4444",
    backgroundColor: "#FEF2F2",
  },
  errorText: {
    marginBottom: Spacing.xs,
  },
  numpad: {
    width: "100%",
    maxWidth: 280,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
    marginTop: Spacing.xs,
  },
  numpadKey: {
    width: "30%",
    height: 52,
    borderRadius: Radius.lg,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderBottomWidth: 3,
    borderBottomColor: "#CBD5E1",
  },
  numpadKeyPressed: {
    transform: [{ scale: 0.96 }],
    backgroundColor: "#F1F5F9",
  },
  numpadActionKey: {
    backgroundColor: "#F1F5F9",
  },
  numpadSubmitKey: {
    backgroundColor: "#10B981",
    borderColor: "#059669",
    borderBottomColor: "#047857",
  },
  backSection: {
    marginTop: "auto",
    paddingBottom: Spacing.md,
  },
});
