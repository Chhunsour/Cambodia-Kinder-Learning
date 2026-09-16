import { LessonProgressRepository } from "@/storage/repositories/lessonProgressRepository";
import { WorldDefinition, MapNodeData } from "@/features/adventure/types";
import {
  CanonicalCurriculum,
  NextLessonInfo,
  ProgressionResult,
  RecordLessonCompletionInput,
  WorldProgressSummary,
  TrackProgressSummary,
} from "../types";
import {
  ALL_CURRICULA,
  KOKI_VILLAGE_CURRICULUM,
  normalizeLessonId,
  getCurriculum,
} from "../data/curriculum";
import { SyncService } from "@/features/parent/services/syncService";
import { StarEventRepository } from "@/storage/repositories/starEventRepository";
import { LearningStarEvent } from "@/storage/database/types";

/**
 * High-Level Progression Service.
 *
 * Governs all progression business rules:
 * 1. Best-ever stars rule: Replaying never reduces earned stars.
 * 2. Completion counts & aggregate telemetry (attempts, mistakes).
 * 3. Sequential level unlocking: Any completion (>= 1 star) unlocks next level.
 * 4. Profile isolation: All queries are strictly scoped by profile_id.
 * 5. Derived state: Map nodes and world summaries are dynamically generated.
 */
export const ProgressionService = {
  /**
   * Record a lesson completion for a child profile.
   */
  async recordCompletedLesson(
    input: RecordLessonCompletionInput
  ): Promise<ProgressionResult> {
    const { profileId, stars } = input;
    const worldId = input.worldId || "world-1";
    const rawLessonId = input.lessonId;
    const lessonId = normalizeLessonId(rawLessonId);

    // 1. Fetch existing progress for this profile & lesson
    const existing = await LessonProgressRepository.getLessonProgress(
      profileId,
      lessonId
    );

    // 2. Best-Star Rule: Replay NEVER lowers saved stars
    const previousBestStars =
      existing && existing.status === "completed" ? existing.bestStars : 0;
    const newBestStars = Math.max(previousBestStars, stars) as 1 | 2 | 3;
    const isBestScoreImproved = stars > previousBestStars;
    const isNewCompletion = !existing || existing.status !== "completed";

    // 3. Track aggregate telemetry
    const completionCount = (existing?.completionCount || 0) + 1;
    const totalAttempts = (existing?.totalAttempts || 0) + (input.attempts ?? 1);
    const totalMistakes = (existing?.totalMistakes || 0) + (input.mistakes ?? 0);

    const now = Date.now();
    const firstCompletedAt = existing?.firstCompletedAt || now;
    const lastCompletedAt = now;

    // 4. Persist to SQLite
    const updatedProgress = await LessonProgressRepository.upsertLessonProgress({
      profileId,
      lessonId,
      worldId,
      status: "completed",
      bestStars: newBestStars,
      completionCount,
      totalAttempts,
      totalMistakes,
      firstCompletedAt,
      lastCompletedAt,
      updatedAt: now,
    });

    // Also link raw alias (like 'demo') so queries for either succeed
    if (rawLessonId !== lessonId) {
      await LessonProgressRepository.upsertLessonProgress({
        profileId,
        lessonId: rawLessonId,
        worldId,
        status: "completed",
        bestStars: newBestStars,
        completionCount,
        totalAttempts,
        totalMistakes,
        firstCompletedAt,
        lastCompletedAt,
        updatedAt: now,
      });
    }

    // 4b. Queue background sync mutation if profile is cloud-bound
    SyncService.enqueueSyncMutation({
      profileId,
      entityType: "lesson_progress",
      entityId: updatedProgress.id,
      operation: "upsert",
      payload: updatedProgress,
    }).catch((err) => {
      console.warn("[ProgressionService] Error queueing sync:", err);
    });

    // 4c. Record Learning Star Improvement Event for Weekly Friends Leaderboard
    const starDelta = newBestStars - previousBestStars;
    if (starDelta > 0) {
      const sourceCompletionId = `star_evt_${profileId}_${lessonId}_${previousBestStars}_to_${newBestStars}`;
      const starEvent: LearningStarEvent = {
        id: `evt_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
        profileId,
        lessonId,
        trackId: worldId,
        starsDelta: starDelta,
        sourceCompletionId,
        earnedAt: now,
        createdAt: now,
      };

      // Persist durable event to SQLite
      StarEventRepository.recordStarEvent(starEvent).catch((err) => {
        console.warn("[ProgressionService] Error saving star event:", err);
      });

      // Enqueue sync mutation if profile is cloud-bound
      SyncService.enqueueSyncMutation({
        profileId,
        entityType: "learning_star_event",
        entityId: starEvent.id,
        operation: "upsert",
        payload: starEvent,
      }).catch((err) => {
        console.warn("[ProgressionService] Error queueing star event sync:", err);
      });
    }

    // 5. Determine the unlocked next lesson ID in curriculum
    const curriculum = getCurriculum(worldId);
    const lessonNodes = curriculum.nodes.filter((n) => n.type === "lesson");
    const currentIndex = lessonNodes.findIndex(
      (n) => n.lessonId === lessonId || n.lessonId === rawLessonId
    );

    let unlockedNextLessonId: string | null = null;
    if (currentIndex >= 0 && currentIndex + 1 < lessonNodes.length) {
      unlockedNextLessonId = lessonNodes[currentIndex + 1].lessonId || null;
    }

    return {
      progress: updatedProgress,
      isNewCompletion,
      isBestScoreImproved,
      previousBestStars,
      newBestStars,
      unlockedNextLessonId,
    };
  },

  /**
   * Get a world progress summary (stars, completed count, current lesson).
   */
  async getWorldProgressSummary(
    profileId: string,
    worldId = "world-1"
  ): Promise<WorldProgressSummary> {
    const curriculum = getCurriculum(worldId);
    const records = await LessonProgressRepository.getWorldProgressRecords(
      profileId,
      worldId
    );

    const completedRecords = records.filter((r) => r.status === "completed");
    const completedMap = new Map<string, number>();

    for (const r of completedRecords) {
      completedMap.set(r.lessonId, r.bestStars);
    }

    const lessonNodes = curriculum.nodes.filter(
      (n) => n.type === "lesson" || (n.type === "challenge" && !!n.lessonId)
    );
    const totalLessons = lessonNodes.length;

    let completedLessons = 0;
    let starsEarned = 0;
    let currentLessonId: string | null = null;
    let currentLevelNumber = 1;
    let foundCurrent = false;

    for (const node of lessonNodes) {
      const canonicalId = node.lessonId || "";
      const isCompleted = completedMap.has(canonicalId);

      if (isCompleted) {
        completedLessons += 1;
        starsEarned += completedMap.get(canonicalId) || 0;
      } else if (!foundCurrent) {
        // First incomplete lesson is the child's active focal level
        currentLessonId = canonicalId;
        currentLevelNumber = node.levelNumber || 1;
        foundCurrent = true;
      }
    }

    // If all lessons completed, current is the final level
    if (!foundCurrent && lessonNodes.length > 0) {
      const lastNode = lessonNodes[lessonNodes.length - 1];
      currentLessonId = lastNode.lessonId || null;
      currentLevelNumber = lastNode.levelNumber || totalLessons;
    }

    const maxStars = totalLessons * 3;

    return {
      worldId,
      completedLessons,
      totalLessons,
      starsEarned,
      maxStars,
      currentLessonId,
      currentLevelNumber,
    };
  },

  /**
   * Reusable Track progress summary (e.g. for English side quest or other content tracks).
   */
  async getTrackProgressSummary(
    profileId: string,
    trackId = "english_basics"
  ): Promise<TrackProgressSummary> {
    const summary = await this.getWorldProgressSummary(profileId, trackId);
    return {
      trackId,
      completedLessons: summary.completedLessons,
      totalLessons: summary.totalLessons,
      starsEarned: summary.starsEarned,
      maxStars: summary.maxStars,
      currentLessonId: summary.currentLessonId,
      currentLevelNumber: summary.currentLevelNumber,
    };
  },

  /**
   * Derive a complete WorldDefinition with real dynamic node statuses and stars.
   */
  async deriveWorldDefinition(
    profileId: string,
    worldId = "world-1"
  ): Promise<WorldDefinition> {
    const curriculum = getCurriculum(worldId);
    const summary = await this.getWorldProgressSummary(profileId, worldId);

    const records = await LessonProgressRepository.getWorldProgressRecords(
      profileId,
      worldId
    );
    const completedMap = new Map<string, number>();
    for (const r of records) {
      if (r.status === "completed") {
        completedMap.set(r.lessonId, r.bestStars);
      }
    }

    const completedLevelNumbers = new Set<number>();
    for (const node of curriculum.nodes) {
      if (
        (node.type === "lesson" || node.type === "challenge") &&
        node.lessonId &&
        completedMap.has(node.lessonId)
      ) {
        if (node.levelNumber) {
          completedLevelNumbers.add(node.levelNumber);
        }
      }
    }

    let foundCurrent = false;

    const dynamicNodes: MapNodeData[] = curriculum.nodes.map((node) => {
      let status: "completed" | "current" | "unlocked" | "locked" = "locked";
      let stars = 0;

      if (node.type === "lesson" || (node.type === "challenge" && node.lessonId)) {
        const canonicalId = node.lessonId || "";
        const isCompleted = completedMap.has(canonicalId);

        if (isCompleted) {
          status = "completed";
          stars = completedMap.get(canonicalId) || 0;
        } else if (!foundCurrent) {
          // Rule: Lesson 1 is always unlocked. Later lessons unlock if previous level is completed.
          const isEligible =
            node.levelNumber === 1 ||
            (node.levelNumber !== undefined &&
              completedLevelNumbers.has(node.levelNumber - 1));

          if (isEligible) {
            status = "current";
            foundCurrent = true;
          } else {
            status = "locked";
          }
        } else {
          status = "locked";
        }
      } else {
        // Special Nodes: evaluate unlock requirements
        const req = node.unlockRequirement;
        if (req) {
          if (req.type === "always_unlocked") {
            status = "unlocked";
          } else if (req.type === "complete_level" && req.levelNumber) {
            status = completedLevelNumbers.has(req.levelNumber)
              ? "unlocked"
              : "locked";
          } else if (req.type === "complete_lessons" && req.lessonIds) {
            const allMet = req.lessonIds.every((id) => completedMap.has(id));
            status = allMet ? "unlocked" : "locked";
          }
        }
      }

      return {
        id: node.id,
        type: node.type,
        status,
        levelNumber: node.levelNumber,
        stars,
        titleKm: node.titleKm,
        titleEn: node.titleEn,
        lessonId: node.lessonId,
        descriptionKm: node.descriptionKm,
        descriptionEn: node.descriptionEn,
        sideQuestTopic: node.sideQuestTopic,
        branchSide: node.branchSide,
      };
    });

    return {
      id: curriculum.worldId,
      worldNumber: curriculum.worldNumber,
      nameKm: curriculum.nameKm,
      nameEn: curriculum.nameEn,
      theme: curriculum.theme,
      totalLessons: summary.totalLessons,
      completedLessons: summary.completedLessons,
      totalStarsEarned: summary.starsEarned,
      totalStarsPossible: summary.maxStars,
      nodes: dynamicNodes,
    };
  },

  /**
   * Resolve the next lesson for the child (for Home screen "Continue Learning").
   */
  async getNextLesson(
    profileId: string,
    worldId = "world-1"
  ): Promise<NextLessonInfo> {
    const curriculum = getCurriculum(worldId);
    const summary = await this.getWorldProgressSummary(profileId, worldId);

    const lessonNodes = curriculum.nodes.filter(
      (n) => n.type === "lesson" || (n.type === "challenge" && !!n.lessonId)
    );
    const targetNode =
      lessonNodes.find((n) => n.levelNumber === summary.currentLevelNumber) ||
      lessonNodes[0];

    return {
      lessonId: targetNode.lessonId || "demo",
      levelNumber: targetNode.levelNumber || 1,
      nodeId: targetNode.id,
      titleKm: targetNode.titleKm,
      titleEn: targetNode.titleEn,
    };
  },

  /**
   * Get total stars earned by child across all worlds.
   */
  async getTotalStars(profileId: string): Promise<number> {
    const records = await LessonProgressRepository.getAllProgressRecords(profileId);
    return records
      .filter((r) => r.status === "completed")
      .reduce((sum, r) => sum + r.bestStars, 0);
  },

  // ============================================================
  // Development Utilities (Guarded for debug / test environments)
  // ============================================================

  /**
   * Reset all progress records for a profile.
   */
  async resetProgressForProfile(profileId: string): Promise<void> {
    if (!__DEV__) return;
    await LessonProgressRepository.deleteProgressForProfile(profileId);
  },

  /**
   * Developer helper: Unlock all lessons by marking them completed.
   */
  async unlockAllLessonsForDev(
    profileId: string,
    worldId = "world-1"
  ): Promise<void> {
    if (!__DEV__) return;
    const curriculum = getCurriculum(worldId);
    const lessonNodes = curriculum.nodes.filter((n) => n.type === "lesson");

    for (const node of lessonNodes) {
      if (node.lessonId) {
        await LessonProgressRepository.upsertLessonProgress({
          profileId,
          lessonId: node.lessonId,
          worldId,
          status: "completed",
          bestStars: 3,
          completionCount: 1,
          totalAttempts: 1,
          totalMistakes: 0,
        });
      }
    }
  },

  /**
   * Developer helper: Seed a specific number of completed lessons.
   */
  async seedProgressForDev(
    profileId: string,
    worldId = "world-1",
    completedCount = 3
  ): Promise<void> {
    if (!__DEV__) return;
    await this.resetProgressForProfile(profileId);
    const curriculum = getCurriculum(worldId);
    const lessonNodes = curriculum.nodes.filter((n) => n.type === "lesson");

    for (let i = 0; i < Math.min(completedCount, lessonNodes.length); i++) {
      const node = lessonNodes[i];
      if (node.lessonId) {
        await LessonProgressRepository.upsertLessonProgress({
          profileId,
          lessonId: node.lessonId,
          worldId,
          status: "completed",
          bestStars: (i % 2 === 0 ? 3 : 2) as 1 | 2 | 3,
          completionCount: 1,
          totalAttempts: 1,
          totalMistakes: i % 2 === 0 ? 0 : 1,
        });
      }
    }
  },
};
