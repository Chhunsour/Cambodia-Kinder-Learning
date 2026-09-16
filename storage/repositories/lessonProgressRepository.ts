import { getDatabase } from "../database";
import { TABLE_LESSON_PROGRESS } from "../database/schema";
import { LessonProgressRow, UpsertLessonProgressDTO } from "../database/types";

export interface LessonProgress {
  id: string;
  profileId: string;
  lessonId: string;
  worldId: string;
  status: "locked" | "unlocked" | "completed";
  bestStars: 1 | 2 | 3;
  completionCount: number;
  totalAttempts: number;
  totalMistakes: number;
  firstCompletedAt: number;
  lastCompletedAt: number;
  createdAt: number;
  updatedAt: number;
}

/**
 * Generate collision-resistant ID for offline progress records.
 */
export function generateLessonProgressId(): string {
  const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  return `lp_${Date.now().toString(36)}_${s4()}${s4()}`;
}

/**
 * Map raw SQLite database row to domain LessonProgress object.
 */
function mapRowToLessonProgress(row: LessonProgressRow): LessonProgress {
  const safeStars = (row.best_stars >= 3 ? 3 : row.best_stars === 2 ? 2 : 1) as 1 | 2 | 3;
  const safeStatus = (row.status === "completed" ? "completed" : row.status === "unlocked" ? "unlocked" : "locked") as
    | "locked"
    | "unlocked"
    | "completed";

  return {
    id: row.id,
    profileId: row.profile_id,
    lessonId: row.lesson_id,
    worldId: row.world_id,
    status: safeStatus,
    bestStars: safeStars,
    completionCount: row.completion_count,
    totalAttempts: row.total_attempts,
    totalMistakes: row.total_mistakes,
    firstCompletedAt: row.first_completed_at,
    lastCompletedAt: row.last_completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Typed repository for Lesson Progress records stored in SQLite.
 * Ensures strict profile isolation, atomic upserts, and zero SQL leak into UI.
 */
export const LessonProgressRepository = {
  /**
   * Retrieve a child's progress for a specific lesson.
   */
  async getLessonProgress(
    profileId: string,
    lessonId: string
  ): Promise<LessonProgress | null> {
    try {
      const db = await getDatabase();
      const row = await db.getFirstAsync<LessonProgressRow>(
        `SELECT * FROM ${TABLE_LESSON_PROGRESS} WHERE profile_id = ? AND lesson_id = ?;`,
        [profileId, lessonId]
      );

      if (!row) return null;
      return mapRowToLessonProgress(row);
    } catch (error) {
      console.warn(`[LessonProgressRepository] Error fetching progress for ${profileId}/${lessonId}:`, error);
      return null;
    }
  },

  /**
   * Retrieve all lesson progress records for a child in a given world.
   */
  async getWorldProgressRecords(
    profileId: string,
    worldId: string
  ): Promise<LessonProgress[]> {
    try {
      const db = await getDatabase();
      const rows = await db.getAllAsync<LessonProgressRow>(
        `SELECT * FROM ${TABLE_LESSON_PROGRESS} WHERE profile_id = ? AND world_id = ? ORDER BY created_at ASC;`,
        [profileId, worldId]
      );

      return rows.map(mapRowToLessonProgress);
    } catch (error) {
      console.warn(`[LessonProgressRepository] Error fetching world records for ${profileId}/${worldId}:`, error);
      return [];
    }
  },

  /**
   * Retrieve all progress records across all worlds for a child.
   */
  async getAllProgressRecords(profileId: string): Promise<LessonProgress[]> {
    try {
      const db = await getDatabase();
      const rows = await db.getAllAsync<LessonProgressRow>(
        `SELECT * FROM ${TABLE_LESSON_PROGRESS} WHERE profile_id = ? ORDER BY created_at ASC;`,
        [profileId]
      );

      return rows.map(mapRowToLessonProgress);
    } catch (error) {
      console.warn(`[LessonProgressRepository] Error fetching all records for ${profileId}:`, error);
      return [];
    }
  },

  /**
   * Retrieve array of completed lesson IDs for a child (optionally filtered by world).
   */
  async getCompletedLessonIds(
    profileId: string,
    worldId?: string
  ): Promise<string[]> {
    try {
      const db = await getDatabase();
      let query = `SELECT lesson_id FROM ${TABLE_LESSON_PROGRESS} WHERE profile_id = ? AND status = 'completed'`;
      const params: string[] = [profileId];

      if (worldId) {
        query += ` AND world_id = ?`;
        params.push(worldId);
      }

      const rows = await db.getAllAsync<{ lesson_id: string }>(query, params);
      return rows.map((r) => r.lesson_id);
    } catch (error) {
      console.warn(`[LessonProgressRepository] Error fetching completed IDs for ${profileId}:`, error);
      return [];
    }
  },

  /**
   * Get the best stars earned for a specific lesson (defaults to 0 if unplayed).
   */
  async getBestStars(profileId: string, lessonId: string): Promise<number> {
    const record = await this.getLessonProgress(profileId, lessonId);
    return record?.status === "completed" ? record.bestStars : 0;
  },

  /**
   * Atomic Upsert for a lesson progress record.
   * If record exists for (profile_id, lesson_id), updates it while preserving constraints.
   */
  async upsertLessonProgress(
    dto: UpsertLessonProgressDTO
  ): Promise<LessonProgress> {
    const db = await getDatabase();
    const id = dto.id || generateLessonProgressId();
    const now = Date.now();

    const createdAt = dto.createdAt ?? now;
    const updatedAt = dto.updatedAt ?? now;
    const firstCompletedAt = dto.firstCompletedAt ?? now;
    const lastCompletedAt = dto.lastCompletedAt ?? now;
    const status = dto.status ?? "completed";
    const completionCount = dto.completionCount ?? 1;
    const totalAttempts = dto.totalAttempts ?? 1;
    const totalMistakes = dto.totalMistakes ?? 0;

    await db.runAsync(
      `INSERT INTO ${TABLE_LESSON_PROGRESS} (
        id, profile_id, lesson_id, world_id, status, best_stars,
        completion_count, total_attempts, total_mistakes,
        first_completed_at, last_completed_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(profile_id, lesson_id) DO UPDATE SET
        world_id = excluded.world_id,
        status = excluded.status,
        best_stars = MAX(${TABLE_LESSON_PROGRESS}.best_stars, excluded.best_stars),
        completion_count = excluded.completion_count,
        total_attempts = excluded.total_attempts,
        total_mistakes = excluded.total_mistakes,
        last_completed_at = excluded.last_completed_at,
        updated_at = excluded.updated_at;`,
      [
        id,
        dto.profileId,
        dto.lessonId,
        dto.worldId,
        status,
        dto.bestStars,
        completionCount,
        totalAttempts,
        totalMistakes,
        firstCompletedAt,
        lastCompletedAt,
        createdAt,
        updatedAt,
      ]
    );

    const updated = await this.getLessonProgress(dto.profileId, dto.lessonId);
    if (!updated) {
      throw new Error(`[LessonProgressRepository] Failed to retrieve record after upsert for ${dto.lessonId}`);
    }
    return updated;
  },

  /**
   * Delete all lesson progress for a specific child profile (e.g. on profile deletion).
   */
  async deleteProgressForProfile(profileId: string): Promise<void> {
    try {
      const db = await getDatabase();
      await db.runAsync(
        `DELETE FROM ${TABLE_LESSON_PROGRESS} WHERE profile_id = ?;`,
        [profileId]
      );
    } catch (error) {
      console.warn(`[LessonProgressRepository] Error deleting progress for ${profileId}:`, error);
    }
  },

  /**
   * Dev helper: Reset all progress records for a profile.
   */
  async resetLessonProgressForDev(profileId: string): Promise<void> {
    await this.deleteProgressForProfile(profileId);
  },
};
