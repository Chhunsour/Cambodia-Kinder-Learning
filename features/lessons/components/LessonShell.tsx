import React, { useState, useCallback, useEffect } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { KokiScreen } from "@/components/ui/KokiScreen";
import { useLocalization } from "@/hooks/useLocalization";
import { useKokiResponsive } from "@/hooks/useKokiResponsive";
import { LessonDefinition, LessonResult, LessonMode } from "../types";
import { useLessonSession } from "../hooks/useLessonSession";
import { LessonHeader } from "./LessonHeader";
import { ExitConfirmationModal } from "./ExitConfirmationModal";
import { HeartRecoveryModal } from "@/features/hearts";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import { KokiFeedbackArea } from "./KokiFeedbackArea";
import { ActivityContainer } from "./ActivityContainer";
import { ActivityRenderer } from "./ActivityRenderer";
import { LessonBottomBar } from "./LessonBottomBar";
import { Palette } from "@/constants/theme";
import { Spacing } from "@/constants/spacing";
import { audioService } from "@/services/audio/audioService";

interface LessonShellProps {
  lesson: LessonDefinition;
  initialMode?: LessonMode;
  profileId?: string;
  onLessonComplete?: (lessonId: string, result?: LessonResult, mode?: LessonMode) => void;
}

/**
 * Reusable Lesson Session Shell.
 *
 * Orchestrates the full learning activity flow:
 * 1. LessonHeader with smooth progress and heart counter
 * 2. KokiFeedbackArea reacting with expressive moods
 * 3. ActivityContainer housing interactive learning content
 * 4. LessonBottomBar with animated Continue CTA
 * 5. ExitConfirmationModal protecting session state
 * 6. HeartRecoveryModal offering non-blocking Practice Mode on zero hearts
 */
export function LessonShell({
  lesson,
  initialMode = "progress",
  profileId,
  onLessonComplete,
}: LessonShellProps) {
  const router = useRouter();
  const { t } = useLocalization();
  const responsive = useKokiResponsive();
  const { profile } = useActiveProfile();
  const effectiveProfileId = profileId || profile?.id;

  const [showExitModal, setShowExitModal] = useState<boolean>(false);
  const [isDragActive, setIsDragActive] = useState<boolean>(false);

  const handleLessonCompleted = useCallback(
    (completedLessonId: string, result?: LessonResult) => {
      const activeMode = sessionRef.current?.mode || initialMode;
      if (onLessonComplete) {
        onLessonComplete(completedLessonId, result, activeMode);
      } else {
        router.replace({
          pathname: `/result/${completedLessonId}`,
          params: result
            ? {
                stars: String(result.starsEarned),
                activities: String(result.completedActivities),
                mistakes: String(result.mistakes),
                mode: activeMode,
              }
            : { mode: activeMode },
        });
      }
    },
    [onLessonComplete, router, initialMode]
  );

  const session = useLessonSession({
    lesson,
    profileId: effectiveProfileId,
    initialMode,
    onLessonComplete: handleLessonCompleted,
  });

  // Keep a ref to session so handleLessonCompleted can read the latest mode without re-binding
  const sessionRef = React.useRef(session);
  sessionRef.current = session;

  // Audio lifecycle: sync parent preferences, preload lesson audio, and clean up on unmount
  useEffect(() => {
    if (effectiveProfileId) {
      audioService.syncWithParentSettings(effectiveProfileId).catch(() => {});
    }

    const lessonAudioKeys: string[] = [];
    lesson.activities.forEach((act) => {
      if (act.audioKey) lessonAudioKeys.push(act.audioKey);
      if (act.instructionAudioKey) lessonAudioKeys.push(act.instructionAudioKey);
      if ("options" in act && Array.isArray(act.options)) {
        act.options.forEach((opt: any) => {
          if (opt.audioKey) lessonAudioKeys.push(opt.audioKey);
        });
      }
    });

    if (lessonAudioKeys.length > 0) {
      audioService.preloadAudio(lessonAudioKeys).catch(() => {});
    }

    return () => {
      audioService.unloadLessonAudio(lessonAudioKeys).catch(() => {});
    };
  }, [lesson, effectiveProfileId]);

  const handleClosePress = () => {
    setShowExitModal(true);
  };

  const handleKeepPlaying = () => {
    setShowExitModal(false);
  };

  const handleConfirmLeave = () => {
    setShowExitModal(false);
    audioService.stopNarration().catch(() => {});
    router.back();
  };

  // Determine feedback message for speech bubble based on lifecycle
  let feedbackMessage: string | undefined;
  if (session.isCorrect) {
    feedbackMessage = t("lesson.correctFeedback");
  } else if (session.isIncorrect) {
    feedbackMessage = t("lesson.tryAgainFeedback");
  }

  return (
    <KokiScreen scrollable={false} backgroundColor={Palette.warmCream}>
      <View style={styles.outerContainer}>
        <View
          style={[
            styles.stageConstraint,
            responsive.isTablet && styles.tabletConstraint,
          ]}
        >
          {/* 1. Lesson Header */}
          <LessonHeader
            currentActivityIndex={session.currentActivityIndex}
            totalActivities={session.totalActivities}
            progressRatio={session.progressRatio}
            hearts={session.hearts}
            onHeartsPress={() => session.setShowZeroHeartsModal(true)}
            onClosePress={handleClosePress}
            closeAccessibilityLabel={t("lesson.leaveLesson")}
          />

          {/* 2. Scrollable Activity Canvas */}
          <ScrollView
            contentContainerStyle={styles.scrollCanvas}
            showsVerticalScrollIndicator={false}
            bounces={false}
            scrollEnabled={!isDragActive}
          >
            {/* Koki Mascot Reaction Area */}
            <KokiFeedbackArea
              mood={session.kokiMood}
              message={feedbackMessage}
              size={responsive.isTablet ? 95 : 75}
              style={styles.feedbackSpacing}
            />

            {/* Activity Container */}
            <ActivityContainer>
              <ActivityRenderer
                activity={session.currentActivity}
                selectedOptionId={session.selectedOptionId}
                lifecycleState={session.lifecycleState}
                onSelectOption={session.selectOption}
                onCompleteActivity={session.completeActivity}
                onRecordAttempt={session.recordAttempt}
                onRetry={session.retry}
                onDragStateChange={setIsDragActive}
              />
            </ActivityContainer>
          </ScrollView>

          {/* 3. Bottom Action Bar (Continue CTA on success) */}
          <LessonBottomBar
            lifecycleState={session.lifecycleState}
            onContinue={session.continueNext}
          />
        </View>

        {/* 4. Child-friendly Exit Confirmation Modal */}
        <ExitConfirmationModal
          visible={showExitModal}
          onKeepPlaying={handleKeepPlaying}
          onConfirmLeave={handleConfirmLeave}
        />

        {/* 5. Heart Recovery & Practice Mode Modal */}
        <HeartRecoveryModal
          visible={session.showZeroHeartsModal}
          currentHearts={session.hearts}
          nextHeartInMs={session.nextHeartInMs}
          fullRegenInMs={session.fullRegenInMs}
          showPracticeButton={true}
          onPractice={session.switchToPracticeMode}
          onClose={() => {
            session.setShowZeroHeartsModal(false);
            router.back();
          }}
        />
      </View>
    </KokiScreen>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    width: "100%",
    backgroundColor: Palette.warmCream,
  },
  stageConstraint: {
    flex: 1,
    width: "100%",
    alignSelf: "center",
    justifyContent: "space-between",
  },
  tabletConstraint: {
    maxWidth: 640,
  },
  scrollCanvas: {
    flexGrow: 1,
    justifyContent: "center",
    paddingBottom: Spacing.md,
  },
  feedbackSpacing: {
    marginBottom: Spacing.sm,
  },
});
