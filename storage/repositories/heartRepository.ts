import { getDatabase } from "../database";
import {
  TABLE_HEART_STATE,
  TABLE_HEART_EVENTS,
} from "../database/schema";
import {
  HeartStateRow,
  HeartEventRow,
} from "../database/types";

export interface HeartState {
  profileId: string;
  currentHearts: number;
  maxHearts: number;
  lastRegenerationAt: number;
  createdAt: number;
  updatedAt: number;
}

export type HeartEventSourceType =
  | "mistake"
  | "natural_regeneration"
  | "rewarded_ad"
  | "reward"
  | "dev";

export interface HeartEventInput {
  delta: number;
  sourceType: HeartEventSourceType;
  sourceId?: string;
}

export const DEFAULT_MAX_HEARTS = 5;

function mapRowToHeartState(row: HeartStateRow | null, profileId: string): HeartState | null {
  if (!row) return null;
  return {
    profileId: row.profile_id,
    currentHearts: row.current_hearts,
    maxHearts: row.max_hearts,
    lastRegenerationAt: row.last_regeneration_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * SQLite Repository for child-friendly Heart State and Audit Events.
 *
 * All operations are strictly profile-scoped, local-first, and atomic.
 */
export const HeartRepository = {
  /**
   * Fetch current raw heart state row for a child profile.
   */
  async getHeartState(profileId: string): Promise<HeartState | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<HeartStateRow>(
      `SELECT * FROM ${TABLE_HEART_STATE} WHERE profile_id = ?;`,
      [profileId]
    );
    return mapRowToHeartState(row, profileId);
  },

  /**
   * Initialize default heart state (5/5) for a new child profile if not already present.
   */
  async initializeHeartState(
    profileId: string,
    initialHearts: number = DEFAULT_MAX_HEARTS,
    maxHearts: number = DEFAULT_MAX_HEARTS,
    now: number = Date.now()
  ): Promise<HeartState> {
    const db = await getDatabase();

    await db.runAsync(
      `INSERT OR IGNORE INTO ${TABLE_HEART_STATE} 
       (profile_id, current_hearts, max_hearts, last_regeneration_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?);`,
      [profileId, initialHearts, maxHearts, now, now, now]
    );

    const existing = await this.getHeartState(profileId);
    if (existing) return existing;

    return {
      profileId,
      currentHearts: initialHearts,
      maxHearts,
      lastRegenerationAt: now,
      createdAt: now,
      updatedAt: now,
    };
  },

  /**
   * Atomically save heart state and update last_regeneration_at.
   */
  async saveHeartState(
    profileId: string,
    currentHearts: number,
    lastRegenerationAt: number,
    now: number = Date.now()
  ): Promise<HeartState> {
    const db = await getDatabase();
    const clampedHearts = Math.max(0, Math.min(DEFAULT_MAX_HEARTS, currentHearts));

    await db.runAsync(
      `INSERT INTO ${TABLE_HEART_STATE} (profile_id, current_hearts, max_hearts, last_regeneration_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(profile_id) DO UPDATE SET
         current_hearts = excluded.current_hearts,
         last_regeneration_at = excluded.last_regeneration_at,
         updated_at = excluded.updated_at;`,
      [profileId, clampedHearts, DEFAULT_MAX_HEARTS, lastRegenerationAt, now, now]
    );

    return {
      profileId,
      currentHearts: clampedHearts,
      maxHearts: DEFAULT_MAX_HEARTS,
      lastRegenerationAt,
      createdAt: now,
      updatedAt: now,
    };
  },

  /**
   * Atomically consume hearts (e.g. from an eligible mistake).
   * Clamped to 0 minimum. Records audit event.
   */
  async consumeHeart(
    profileId: string,
    amount: number = 1,
    event?: HeartEventInput,
    now: number = Date.now()
  ): Promise<{ success: boolean; state: HeartState }> {
    const db = await getDatabase();

    let updatedState: HeartState | null = null;
    let success = false;

    await db.withTransactionAsync(async () => {
      // 1. Fetch current state
      let current = await this.getHeartState(profileId);
      if (!current) {
        current = await this.initializeHeartState(profileId, DEFAULT_MAX_HEARTS, DEFAULT_MAX_HEARTS, now);
      }

      if (current.currentHearts <= 0) {
        // Cannot consume below 0
        updatedState = current;
        success = false;
        return;
      }

      const newHearts = Math.max(0, current.currentHearts - amount);
      const actualDeducted = current.currentHearts - newHearts;

      // If hearts were at max, the regeneration anchor begins right now
      const newRegenAnchor =
        current.currentHearts >= current.maxHearts ? now : current.lastRegenerationAt;

      await db.runAsync(
        `UPDATE ${TABLE_HEART_STATE} 
         SET current_hearts = ?, last_regeneration_at = ?, updated_at = ?
         WHERE profile_id = ?;`,
        [newHearts, newRegenAnchor, now, profileId]
      );

      // Record audit event
      if (actualDeducted > 0) {
        const eventId = `he_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        await db.runAsync(
          `INSERT INTO ${TABLE_HEART_EVENTS} (id, profile_id, delta, source_type, source_id, created_at)
           VALUES (?, ?, ?, ?, ?, ?);`,
          [
            eventId,
            profileId,
            -actualDeducted,
            event?.sourceType || "mistake",
            event?.sourceId || null,
            now,
          ]
        );
      }

      updatedState = {
        ...current,
        currentHearts: newHearts,
        lastRegenerationAt: newRegenAnchor,
        updatedAt: now,
      };
      success = true;
    });

    return {
      success,
      state: updatedState!,
    };
  },

  /**
   * Atomically restore hearts (e.g. from regeneration, reward, or future rewarded ad).
   * Clamped to maxHearts.
   */
  async restoreHearts(
    profileId: string,
    amount: number,
    event?: HeartEventInput,
    now: number = Date.now()
  ): Promise<HeartState> {
    const db = await getDatabase();
    let updatedState: HeartState | null = null;

    await db.withTransactionAsync(async () => {
      let current = await this.getHeartState(profileId);
      if (!current) {
        current = await this.initializeHeartState(profileId, DEFAULT_MAX_HEARTS, DEFAULT_MAX_HEARTS, now);
      }

      const newHearts = Math.min(current.maxHearts, current.currentHearts + amount);
      const actualRestored = newHearts - current.currentHearts;

      // If full hearts reached, reset regeneration anchor to now
      const newRegenAnchor = newHearts >= current.maxHearts ? now : current.lastRegenerationAt;

      await db.runAsync(
        `UPDATE ${TABLE_HEART_STATE}
         SET current_hearts = ?, last_regeneration_at = ?, updated_at = ?
         WHERE profile_id = ?;`,
        [newHearts, newRegenAnchor, now, profileId]
      );

      if (actualRestored > 0 && event) {
        const eventId = `he_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        await db.runAsync(
          `INSERT INTO ${TABLE_HEART_EVENTS} (id, profile_id, delta, source_type, source_id, created_at)
           VALUES (?, ?, ?, ?, ?, ?);`,
          [eventId, profileId, actualRestored, event.sourceType, event.sourceId || null, now]
        );
      }

      updatedState = {
        ...current,
        currentHearts: newHearts,
        lastRegenerationAt: newRegenAnchor,
        updatedAt: now,
      };
    });

    return updatedState!;
  },

  /**
   * Record a standalone heart event for telemetry or debugging.
   */
  async recordHeartEvent(
    profileId: string,
    delta: number,
    sourceType: HeartEventSourceType,
    sourceId?: string,
    now: number = Date.now()
  ): Promise<void> {
    const db = await getDatabase();
    const eventId = `he_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    await db.runAsync(
      `INSERT INTO ${TABLE_HEART_EVENTS} (id, profile_id, delta, source_type, source_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?);`,
      [eventId, profileId, delta, sourceType, sourceId || null, now]
    );
  },

  /**
   * Developer utility to force-set hearts directly in SQLite.
   */
  async setHeartsForDev(
    profileId: string,
    amount: number,
    now: number = Date.now()
  ): Promise<HeartState> {
    const clamped = Math.max(0, Math.min(DEFAULT_MAX_HEARTS, amount));
    const anchor = clamped >= DEFAULT_MAX_HEARTS ? now : now;
    return this.saveHeartState(profileId, clamped, anchor, now);
  },
};
