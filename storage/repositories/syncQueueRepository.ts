import { getDatabase } from "../database";
import { TABLE_SYNC_QUEUE } from "../database/schema";
import {
  SyncQueueRow,
  SyncQueueItem,
  CreateSyncQueueDTO,
  SyncQueueStatus,
  SyncEntityType,
  SyncOperation,
} from "../database/types";

export function generateSyncQueueId(): string {
  const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  return `sq_${Date.now().toString(36)}_${s4()}${s4()}`;
}

/**
 * Exponential backoff delays in milliseconds:
 * Attempt 0: 0ms (immediate)
 * Attempt 1: 1 min (60,000 ms)
 * Attempt 2: 5 min (300,000 ms)
 * Attempt 3: 15 min (900,000 ms)
 * Attempt 4+: 60 min (3,600,000 ms)
 */
export function getRetryDelayMs(attemptCount: number): number {
  if (attemptCount <= 0) return 0;
  if (attemptCount === 1) return 60 * 1000;
  if (attemptCount === 2) return 5 * 60 * 1000;
  if (attemptCount === 3) return 15 * 60 * 1000;
  return 60 * 60 * 1000;
}

export function isEligibleForRetry(
  attemptCount: number,
  lastAttemptAt: number | null,
  now: number = Date.now()
): boolean {
  if (attemptCount <= 0 || !lastAttemptAt) return true;
  const delay = getRetryDelayMs(attemptCount);
  return now - lastAttemptAt >= delay;
}

function mapRowToQueueItem(row: SyncQueueRow): SyncQueueItem {
  let parsedPayload: any = {};
  try {
    parsedPayload = JSON.parse(row.payload_json);
  } catch (e) {
    console.warn(`[SyncQueueRepository] Failed to parse payload for item ${row.id}:`, e);
  }

  return {
    id: row.id,
    profileId: row.profile_id,
    entityType: row.entity_type as SyncEntityType,
    entityId: row.entity_id,
    operation: row.operation as SyncOperation,
    payload: parsedPayload,
    createdAt: row.created_at,
    attemptCount: row.attempt_count,
    lastAttemptAt: row.last_attempt_at,
    status: row.status as SyncQueueStatus,
  };
}

/**
 * Typed repository for SQLite persistent sync mutation queue.
 * Ensures local mutations survive app restarts and retry safely when back online.
 */
export const SyncQueueRepository = {
  /**
   * Enqueue a sync mutation.
   * If an uncompleted mutation already exists for the same profile, entityType, and entityId,
   * updates the payload and resets status to 'pending' to prevent redundant queuing.
   */
  async enqueue(dto: CreateSyncQueueDTO): Promise<string> {
    const db = await getDatabase();
    const id = dto.id || generateSyncQueueId();
    const now = dto.createdAt || Date.now();
    const payloadJson = JSON.stringify(dto.payload);

    // Check if there is already a pending or processing item for this entity
    const existing = await db.getFirstAsync<{ id: string }>(
      `SELECT id FROM ${TABLE_SYNC_QUEUE} 
       WHERE profile_id = ? AND entity_type = ? AND entity_id = ? AND status IN ('pending', 'processing', 'failed')
       LIMIT 1;`,
      [dto.profileId, dto.entityType, dto.entityId]
    );

    if (existing?.id) {
      // Update existing item with newest payload and reset status
      await db.runAsync(
        `UPDATE ${TABLE_SYNC_QUEUE}
         SET payload_json = ?, operation = ?, status = 'pending', attempt_count = 0, last_attempt_at = NULL
         WHERE id = ?;`,
        [payloadJson, dto.operation, existing.id]
      );
      return existing.id;
    }

    await db.runAsync(
      `INSERT INTO ${TABLE_SYNC_QUEUE} (
        id, profile_id, entity_type, entity_id, operation, payload_json, created_at, attempt_count, last_attempt_at, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, NULL, 'pending');`,
      [id, dto.profileId, dto.entityType, dto.entityId, dto.operation, payloadJson, now]
    );

    return id;
  },

  /**
   * Get all pending or retry-eligible items for a profile ordered by creation date.
   */
  async getEligibleQueueItems(
    profileId: string,
    now: number = Date.now(),
    limit = 50
  ): Promise<SyncQueueItem[]> {
    try {
      const db = await getDatabase();
      const rows = await db.getAllAsync<SyncQueueRow>(
        `SELECT * FROM ${TABLE_SYNC_QUEUE}
         WHERE profile_id = ? AND status IN ('pending', 'failed')
         ORDER BY created_at ASC
         LIMIT ?;`,
        [profileId, limit]
      );

      return rows
        .map(mapRowToQueueItem)
        .filter((item) => isEligibleForRetry(item.attemptCount, item.lastAttemptAt, now));
    } catch (error) {
      console.warn("[SyncQueueRepository] Error getting eligible queue items:", error);
      return [];
    }
  },

  /**
   * Get all queue items for a profile (for inspection or debugging).
   */
  async getAllItems(profileId: string, limit = 100): Promise<SyncQueueItem[]> {
    try {
      const db = await getDatabase();
      const rows = await db.getAllAsync<SyncQueueRow>(
        `SELECT * FROM ${TABLE_SYNC_QUEUE}
         WHERE profile_id = ?
         ORDER BY created_at ASC
         LIMIT ?;`,
        [profileId, limit]
      );
      return rows.map(mapRowToQueueItem);
    } catch (error) {
      console.warn("[SyncQueueRepository] Error getting all queue items:", error);
      return [];
    }
  },

  /**
   * Update item status after an execution attempt.
   */
  async updateItemStatus(
    id: string,
    status: SyncQueueStatus,
    attemptCount: number,
    lastAttemptAt: number = Date.now()
  ): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE ${TABLE_SYNC_QUEUE}
       SET status = ?, attempt_count = ?, last_attempt_at = ?
       WHERE id = ?;`,
      [status, attemptCount, lastAttemptAt, id]
    );
  },

  /**
   * Mark item as processing before sending to remote.
   */
  async markProcessing(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE ${TABLE_SYNC_QUEUE} SET status = 'processing' WHERE id = ?;`,
      [id]
    );
  },

  /**
   * Remove item from queue after successful sync.
   */
  async deleteItem(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM ${TABLE_SYNC_QUEUE} WHERE id = ?;`, [id]);
  },

  /**
   * Reset all failed items to pending for immediate manual retry.
   */
  async resetFailedItems(profileId: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE ${TABLE_SYNC_QUEUE}
       SET status = 'pending', attempt_count = 0, last_attempt_at = NULL
       WHERE profile_id = ? AND status = 'failed';`,
      [profileId]
    );
  },

  /**
   * Get count of pending and failed items for a profile.
   */
  async getQueueCounts(profileId: string): Promise<{ pending: number; failed: number; total: number }> {
    try {
      const db = await getDatabase();
      const rows = await db.getAllAsync<{ status: string; count: number }>(
        `SELECT status, COUNT(*) as count FROM ${TABLE_SYNC_QUEUE}
         WHERE profile_id = ?
         GROUP BY status;`,
        [profileId]
      );

      let pending = 0;
      let failed = 0;
      for (const row of rows) {
        if (row.status === "pending" || row.status === "processing") {
          pending += row.count;
        } else if (row.status === "failed") {
          failed += row.count;
        }
      }

      return { pending, failed, total: pending + failed };
    } catch (error) {
      console.warn("[SyncQueueRepository] Error getting queue counts:", error);
      return { pending: 0, failed: 0, total: 0 };
    }
  },

  /**
   * Clear all queue items for a profile (e.g. on profile deletion or full reset).
   */
  async clearQueue(profileId: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM ${TABLE_SYNC_QUEUE} WHERE profile_id = ?;`, [profileId]);
  },
};
