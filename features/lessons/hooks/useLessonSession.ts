import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  LessonDefinition,
  LessonActivity,
  ActivityLifecycleState,
  KokiFeedbackMood,
  ActivityResult,
  AttemptReport,
  MatchingAttemptReport,
  TapChoiceActivityData,
  LessonResult,
  LessonMode,
} from "../types";
import { useLessonSound } from "./useLessonSound";
import {
  calculateLessonStars,
  lessonResultStore,
} from "../services/lessonResultService";
import { HeartService } from "@/features/hearts";

interface UseLessonSessionOptions {
  lesson: LessonDefinition;
  profileId?: string;
  initialMode?: LessonMode;
  onLessonComplete: (lessonId: string, result?: LessonResult) => void;
  onAttempt?: (report: AttemptReport) => void;
}

/**
 * Clean State Machine Hook for Lesson Session Lifecycle.
 *
 * Governs activity presentation, answer evaluation, lock states,
 * retry loops, progress calculation, and Hearts / Practice Mode integration.
 */
export function useLessonSession({
  lesson,
  profileId,
  initialMode = "progress",
  onLessonComplete,
  onAttempt,
}: UseLessonSessionOptions) {
  const [currentActivityIndex, setCurrentActivityIndex] = useState<number>(0);
  const [lifecycleState, setLifecycleState] =
    useState<ActivityLifecycleState>("presenting");
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [attemptsCount, setAttemptsCount] = useState<number>(0);
  const [results, setResults] = useState<ActivityResult[]>([]);

  // Hearts & Session Mode state
  const [mode, setMode] = useState<LessonMode>(initialMode);
  const [hearts, setHearts] = useState<number>(5);
  const [nextHeartInMs, setNextHeartInMs] = useState<number | null>(null);
  const [fullRegenInMs, setFullRegenInMs] = useState<number | null>(null);
  const [showZeroHeartsModal, setShowZeroHeartsModal] = useState<boolean>(false);

  // Whole-lesson attempt & mistake counters for star calculation
  const sessionAttemptsRef = useRef<number>(0);
  const sessionMistakesRef = useRef<number>(0);

  const { playCorrectSound, playIncorrectSound } = useLessonSound();

  const totalActivities = lesson.activities.length;
  const currentActivity: LessonActivity =
    lesson.activities[currentActivityIndex] || lesson.activities[0];

  // Initialize hearts from SQLite
  useEffect(() => {
    if (profileId) {
      HeartService.getCurrentHeartState(profileId)
        .then((state) => {
          setHearts(state.currentHearts);
          setNextHeartInMs(state.nextHeartInMs);
          setFullRegenInMs(state.fullRegenInMs);
          // If starting with 0 hearts in progress mode, automatically alert or switch to practice
          if (state.currentHearts <= 0 && initialMode === "progress") {
            setShowZeroHeartsModal(true);
          }
        })
        .catch((err) => {
          console.warn("[useLessonSession] Failed to fetch hearts on mount:", err);
        });
    }
  }, [profileId, initialMode]);

  // Derived Koki mascot mood matching the current lifecycle state
  const kokiMood: KokiFeedbackMood = useMemo(() => {
    switch (lifecycleState) {
      case "correct":
        return "correct";
      case "incorrect":
        return "tryAgain";
      case "completed":
        return "celebration";
      case "presenting":
      default:
        return "neutral";
    }
  }, [lifecycleState]);

  // Smooth progress ratio based on completed activities
  const progressRatio = useMemo(() => {
    if (totalActivities === 0) return 0;
    const solvedCount =
      lifecycleState === "correct" || lifecycleState === "completed"
        ? currentActivityIndex + 1
        : currentActivityIndex;
    return Math.min(solvedCount / totalActivities, 1);
  }, [currentActivityIndex, totalActivities, lifecycleState]);

  /**
   * Helper: deduct 1 heart on an eligible mistake during Progress Mode.
   * If hearts reach 0, allows feedback to complete, then triggers recovery sheet.
   */
  const processMistakeHeartDeduction = useCallback(
    async (activityId: string) => {
      if (mode !== "progress" || !profileId) return;

      try {
        const result = await HeartService.handleEligibleMistake({
          profileId,
          activityId,
          mode: "progress",
        });

        setHearts(result.currentHearts);
        setNextHeartInMs(result.nextHeartInMs);

        if (result.reachedZero) {
          // Allow current answer feedback to render smoothly, then show recovery options
          setTimeout(() => {
            setShowZeroHeartsModal(true);
          }, 750);
        }
      } catch (err) {
        console.warn("[useLessonSession] Heart deduction failed:", err);
      }
    },
    [mode, profileId]
  );

  /**
   * Handle child answer selection.
   */
  const selectOption = useCallback(
    (optionId: string) => {
      // Ignore taps if answer is already locked as correct or completed
      if (lifecycleState === "correct" || lifecycleState === "completed") {
        return;
      }

      if (
        currentActivity.type !== "tap_choice" &&
        currentActivity.type !== "choice"
      ) {
        return;
      }

      const option = currentActivity.options.find((opt) => opt.id === optionId);
      if (!option) return;

      setSelectedOptionId(optionId);
      const newAttemptNumber = attemptsCount + 1;
      setAttemptsCount(newAttemptNumber);
      sessionAttemptsRef.current += 1;

      const isOptionCorrect =
        "correctOptionId" in currentActivity && currentActivity.correctOptionId
          ? option.id === currentActivity.correctOptionId
          : Boolean(option.isCorrect);

      if (onAttempt) {
        onAttempt({
          activityId: currentActivity.id,
          selectedOptionId: optionId,
          correct: isOptionCorrect,
          attemptNumber: newAttemptNumber,
          heartEligible: true,
        });
      }

      if (isOptionCorrect) {
        setLifecycleState("correct");
        playCorrectSound();
      } else {
        sessionMistakesRef.current += 1;
        setLifecycleState("incorrect");
        playIncorrectSound();
        // Choice selection mistakes are eligible for heart deduction
        processMistakeHeartDeduction(currentActivity.id);
      }
    },
    [
      currentActivity,
      lifecycleState,
      attemptsCount,
      onAttempt,
      playCorrectSound,
      playIncorrectSound,
      processMistakeHeartDeduction,
    ]
  );

  /**
   * Retry after an incorrect choice: unlocks selection and resets to presenting.
   */
  const retry = useCallback(() => {
    if (lifecycleState === "incorrect") {
      setSelectedOptionId(null);
      setLifecycleState("presenting");
    }
  }, [lifecycleState]);

  /**
   * Advance to the next activity or complete the session.
   */
  const continueNext = useCallback(() => {
    if (lifecycleState !== "correct") return;

    // Record activity result
    const currentResult: ActivityResult = {
      activityId: currentActivity.id,
      attempts: attemptsCount + 1,
      isCorrect: true,
    };
    setResults((prev) => [...prev, currentResult]);

    const nextIndex = currentActivityIndex + 1;
    if (nextIndex < totalActivities) {
      setCurrentActivityIndex(nextIndex);
      setSelectedOptionId(null);
      setAttemptsCount(0);
      setLifecycleState("presenting");
    } else {
      setLifecycleState("completed");
      const totalAttempts = sessionAttemptsRef.current;
      const mistakes = sessionMistakesRef.current;
      const starsEarned = calculateLessonStars({
        totalActivities,
        totalAttempts,
        mistakes,
      });

      const lessonResult: LessonResult = {
        lessonId: lesson.id,
        totalActivities,
        completedActivities: totalActivities,
        totalAttempts,
        mistakes,
        starsEarned,
        completedAt: Date.now(),
      };

      lessonResultStore.save(lessonResult);
      onLessonComplete(lesson.id, lessonResult);
    }
  }, [
    lifecycleState,
    currentActivity,
    attemptsCount,
    currentActivityIndex,
    totalActivities,
    lesson.id,
    onLessonComplete,
  ]);

  /**
   * Complete multi-step activity (like Image Matching) when all requirements/pairs are solved.
   */
  const completeActivity = useCallback(
    (customResult?: Partial<ActivityResult> & { mistakes?: number; attempts?: number }) => {
      if (customResult?.attempts) {
        sessionAttemptsRef.current += customResult.attempts;
      }
      if (customResult?.mistakes) {
        sessionMistakesRef.current += customResult.mistakes;
      }
      setLifecycleState("correct");
      playCorrectSound();
    },
    [playCorrectSound]
  );

  /**
   * Record attempt during multi-step activity.
   */
  const recordAttempt = useCallback(
    (isMatch: boolean, report?: AttemptReport | MatchingAttemptReport) => {
      sessionAttemptsRef.current += 1;
      if (!isMatch) {
        sessionMistakesRef.current += 1;
        // Check heart eligibility on multi-step activities
        if (report?.heartEligible !== false) {
          processMistakeHeartDeduction(currentActivity.id);
        }
      }
      setAttemptsCount((prev) => prev + 1);
      if (isMatch) {
        playCorrectSound();
      } else {
        playIncorrectSound();
      }
    },
    [currentActivity.id, playCorrectSound, playIncorrectSound, processMistakeHeartDeduction]
  );

  /**
   * Transition smoothly to Practice Mode on zero hearts.
   */
  const switchToPracticeMode = useCallback(() => {
    setMode("practice");
    setShowZeroHeartsModal(false);
  }, []);

  return {
    currentActivityIndex,
    totalActivities,
    currentActivity,
    lifecycleState,
    selectedOptionId,
    attemptsCount,
    kokiMood,
    progressRatio,
    results,
    isCorrect: lifecycleState === "correct",
    isIncorrect: lifecycleState === "incorrect",
    mode,
    hearts,
    nextHeartInMs,
    fullRegenInMs,
    showZeroHeartsModal,
    setShowZeroHeartsModal,
    switchToPracticeMode,
    selectOption,
    completeActivity,
    recordAttempt,
    retry,
    continueNext,
  };
}
