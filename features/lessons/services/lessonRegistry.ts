import { LessonDefinition } from "../types";
import { DEMO_LESSON } from "../data/demoLesson";
import { ALL_ENGLISH_LESSONS } from "../data/englishLessons";
import { contentPackService } from "@/features/contentPacks/services/contentPackService";

/**
 * Centralized Lesson Registry.
 *
 * Resolves lesson definitions by their unique ID:
 * - English Side Quest lessons: "en_001", "en_002", etc.
 * - Installed Downloaded Pack lessons: e.g. "tiny_001", "tiny_002", etc.
 * - Main Adventure / demo lessons: "demo", "kv_001", etc.
 */
export function getLessonDefinition(lessonId: string): LessonDefinition {
  const cleanId = (lessonId || "demo").trim();

  // 1. Resolve from English curriculum
  if (ALL_ENGLISH_LESSONS[cleanId]) {
    return ALL_ENGLISH_LESSONS[cleanId];
  }

  // 2. Resolve from installed downloaded content packs
  const downloadedLesson = contentPackService.getLessonDefinition(cleanId);
  if (downloadedLesson) {
    return downloadedLesson;
  }

  // 3. Default to DEMO_LESSON (or bundled main world lessons)
  return {
    ...DEMO_LESSON,
    id: cleanId,
  };
}
