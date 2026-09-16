import { getDatabase } from "../database";
import { TABLE_LEARNING_STAR_EVENTS } from "../database/schema";
import { LearningStarEventRow, LearningStarEvent } from "../database/types";

function mapRowToEntity(row: LearningStarEventRow): LearningStarEvent {
  return {
    id: row.id,
    profileId: row.profile_id,
    lessonId: row.lesson_id,
    trackId: row.track_id,
    starsDelta: row.stars_delta,
    sourceCompletionId: row.source_completion_id,
    earnedAt: row.earned_at,
    createdAt: row.created_at,
  };
}

/**
 * Typed repository for tracking distinct learning star improvement events in SQLite.
 * Ensures duplicate protection through source_completion_id constraint.
 */
export const StarEventRepository = {
  /**
   * Record a star improvement event.
   * If source_completion_id already exists, ignores to prevent duplicate star awards.
   */
  async recordStarEvent(event: LearningStarEvent): Promise<boolean> {
    try {
      const db = await getDatabase();
      const result = await db.runAsync(
        `INSERT OR IGNORE INTO ${TABLE_LEARNING_STAR_EVENTS} (
          id, profile_id, lesson_id, track_id, stars_delta, source_completion_id, earned_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          event.id,
          event.profileId,
          event.lessonId,
          event.trackId,
          event.starsDelta,
          event.sourceCompletionId,
          event.earnedAt,
          event.createdAt,
        ]
      );
      return result.changes > 0;
    } catch (error) {
      console.warn(`[StarEventRepository] Error recording star event ${event.id}:`, error);
      return false;
    }
  },

  /**
   * Sum stars_delta for a profile earned within a specific time window (e.g. current week).
   */
  async getWeeklyStarsForProfile(
    profileId: string,
    startMs: number,
    endMs: number
  ): Promise<number> {
    try {
      const db = await getDatabase();
      const result = await db.getFirstAsync<{ total_stars: number | null }>(
        `SELECT SUM(stars_delta) AS total_stars
         FROM ${TABLE_LEARNING_STAR_EVENTS}
         WHERE profile_id = ?
           AND earned_at >= ?
           AND earned_at < ?;`,
        [profileId, startMs, endMs]
      );
      return result?.total_stars ?? 0;
    } catch (error) {
      console.warn(`[StarEventRepository] Error getting weekly stars for ${profileId}:`, error);
      return 0;
    }
  },

  /**
   * Retrieve all recorded star events for a profile.
   */
  async getAllEventsForProfile(profileId: string): Promise<LearningStarEvent[]> {
    try {
      const db = await getDatabase();
      const rows = await db.getAllAsync<LearningStarEventRow>(
        `SELECT * FROM ${TABLE_LEARNING_STAR_EVENTS}
         WHERE profile_id = ?
         ORDER BY earned_at ASC;`,
        [profileId]
      );
      return rows.map(mapRowToEntity);
    } catch (error) {
      console.warn(`[StarEventRepository] Error getting star events for ${profileId}:`, error);
      return [];
    }
  },

  /**
   * Delete all star events for a profile (used upon profile deletion).
   */
  async deleteEventsForProfile(profileId: string): Promise<void> {
    try {
      const db = await getDatabase();
      await db.runAsync(
        `DELETE FROM ${TABLE_LEARNING_STAR_EVENTS} WHERE profile_id = ?;`,
        [profileId]
      );
    } catch (error) {
      console.warn(`[StarEventRepository] Error deleting star events for ${profileId}:`, error);
    }
  },
};
