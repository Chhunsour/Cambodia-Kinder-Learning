import { getDatabase } from "../database";
import { TABLE_LEADERBOARD_CACHE } from "../database/schema";
import { LeaderboardCacheRow } from "../database/types";
import { LeaderboardSnapshot } from "@/lib/supabase/types";

/**
 * Typed repository for caching weekly friends leaderboard snapshots in SQLite.
 * Provides instant display and seamless offline resilience.
 */
export const LeaderboardCacheRepository = {
  /**
   * Retrieve cached leaderboard snapshot for a child profile and week.
   */
  async getCachedLeaderboard(
    profileId: string,
    weekKey: string
  ): Promise<LeaderboardSnapshot | null> {
    try {
      const db = await getDatabase();
      const row = await db.getFirstAsync<LeaderboardCacheRow>(
        `SELECT payload_json FROM ${TABLE_LEADERBOARD_CACHE}
         WHERE profile_id = ? AND week_key = ?;`,
        [profileId, weekKey]
      );
      if (row?.payload_json) {
        return JSON.parse(row.payload_json) as LeaderboardSnapshot;
      }
      return null;
    } catch (error) {
      console.warn(`[LeaderboardCacheRepository] Error reading cache for ${profileId}/${weekKey}:`, error);
      return null;
    }
  },

  /**
   * Save or update cached leaderboard snapshot.
   */
  async setCachedLeaderboard(
    profileId: string,
    weekKey: string,
    snapshot: LeaderboardSnapshot
  ): Promise<void> {
    try {
      const db = await getDatabase();
      const payloadJson = JSON.stringify(snapshot);
      const now = Date.now();
      await db.runAsync(
        `INSERT INTO ${TABLE_LEADERBOARD_CACHE} (profile_id, week_key, payload_json, cached_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT (profile_id, week_key) DO UPDATE SET
           payload_json = excluded.payload_json,
           cached_at = excluded.cached_at;`,
        [profileId, weekKey, payloadJson, now]
      );
    } catch (error) {
      console.warn(`[LeaderboardCacheRepository] Error setting cache for ${profileId}/${weekKey}:`, error);
    }
  },

  /**
   * Clear cache for a profile.
   */
  async clearCacheForProfile(profileId: string): Promise<void> {
    try {
      const db = await getDatabase();
      await db.runAsync(
        `DELETE FROM ${TABLE_LEADERBOARD_CACHE} WHERE profile_id = ?;`,
        [profileId]
      );
    } catch (error) {
      console.warn(`[LeaderboardCacheRepository] Error clearing cache for ${profileId}:`, error);
    }
  },
};
