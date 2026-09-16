import { getDatabase } from "../database";
import { TABLE_STREAK_DAYS } from "../database/schema";
import { StreakDaysRow } from "../database/types";

/**
 * Typed repository for tracking distinct qualifying calendar days in SQLite.
 * Powers durable multi-device learning streak reconciliations without artificial interpolation.
 */
export const StreakDaysRepository = {
  /**
   * Record a qualifying calendar day for a child profile.
   * If already recorded, silently ignores to maintain idempotency.
   */
  async recordStreakDay(
    profileId: string,
    dayDate: string,
    createdAt: number = Date.now()
  ): Promise<boolean> {
    try {
      const db = await getDatabase();
      const result = await db.runAsync(
        `INSERT OR IGNORE INTO ${TABLE_STREAK_DAYS} (profile_id, day_date, created_at)
         VALUES (?, ?, ?);`,
        [profileId, dayDate, createdAt]
      );
      return result.changes > 0;
    } catch (error) {
      console.warn(`[StreakDaysRepository] Error recording streak day ${dayDate}:`, error);
      return false;
    }
  },

  /**
   * Fetch all recorded qualifying dates for a profile, sorted chronologically.
   */
  async getStreakDays(profileId: string): Promise<string[]> {
    try {
      const db = await getDatabase();
      const rows = await db.getAllAsync<StreakDaysRow>(
        `SELECT day_date FROM ${TABLE_STREAK_DAYS}
         WHERE profile_id = ?
         ORDER BY day_date ASC;`,
        [profileId]
      );
      return rows.map((r) => r.day_date);
    } catch (error) {
      console.warn("[StreakDaysRepository] Error getting streak days:", error);
      return [];
    }
  },

  /**
   * Batch insert qualifying dates (used during remote pull/merge).
   */
  async batchInsertStreakDays(profileId: string, dayDates: string[]): Promise<void> {
    if (dayDates.length === 0) return;
    try {
      const db = await getDatabase();
      const now = Date.now();
      await db.withTransactionAsync(async () => {
        for (const dayDate of dayDates) {
          await db.runAsync(
            `INSERT OR IGNORE INTO ${TABLE_STREAK_DAYS} (profile_id, day_date, created_at)
             VALUES (?, ?, ?);`,
            [profileId, dayDate, now]
          );
        }
      });
    } catch (error) {
      console.warn("[StreakDaysRepository] Error batch inserting streak days:", error);
    }
  },

  /**
   * Clear recorded streak days for a profile (e.g. on profile deletion or dev reset).
   */
  async clearStreakDays(profileId: string): Promise<void> {
    try {
      const db = await getDatabase();
      await db.runAsync(`DELETE FROM ${TABLE_STREAK_DAYS} WHERE profile_id = ?;`, [profileId]);
    } catch (error) {
      console.warn("[StreakDaysRepository] Error clearing streak days:", error);
    }
  },
};
