import React, { useCallback } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  LessonShell,
  LessonDefinition,
  LessonResult,
  LessonMode,
  getLessonDefinition,
} from "@/features/lessons";

/**
 * Dynamic Lesson Activity Route: /lesson/[lessonId]
 *
 * Runs outside the (main) tab group so the bottom tab bar is automatically hidden.
 * Coordinates the reusable LessonShell with current lesson definitions, track context, and Hearts/Practice mode.
 */
export default function LessonScreen() {
  const router = useRouter();
  const { lessonId, mode, trackId, origin } = useLocalSearchParams<{
    lessonId: string;
    mode?: LessonMode;
    trackId?: string;
    origin?: string;
  }>();

  const cleanLessonId = Array.isArray(lessonId) ? lessonId[0] : lessonId || "demo";
  const initialMode: LessonMode = mode === "practice" ? "practice" : "progress";

  // Resolve canonical lesson definition from centralized registry
  const lesson: LessonDefinition = getLessonDefinition(cleanLessonId);

  const resolvedTrackId =
    trackId || lesson.trackId || (cleanLessonId.startsWith("en_") ? "english_basics" : "world-1");
  const resolvedOrigin =
    origin || (cleanLessonId.startsWith("en_") ? "english_side_quest" : "main_adventure");

  const handleLessonComplete = useCallback(
    (completedId: string, result?: LessonResult, completedMode?: LessonMode) => {
      router.replace({
        pathname: `/result/${completedId}`,
        params: result
          ? {
              stars: String(result.starsEarned),
              activities: String(result.completedActivities),
              mistakes: String(result.mistakes),
              mode: completedMode || initialMode,
              trackId: resolvedTrackId,
              origin: resolvedOrigin,
            }
          : {
              mode: completedMode || initialMode,
              trackId: resolvedTrackId,
              origin: resolvedOrigin,
            },
      });
    },
    [router, initialMode, resolvedTrackId, resolvedOrigin]
  );

  return (
    <LessonShell
      lesson={lesson}
      initialMode={initialMode}
      onLessonComplete={handleLessonComplete}
    />
  );
}
