import { getDatabase } from "../database";
import { TABLE_DELETED_TOMBSTONES } from "../database/schema";
import { DeletedTombstoneRow } from "../database/types";

export const TombstoneRepository = {
  /**
   * Record a tombstone for a deleted entity so that remote pulls do not resurrect it.
   */
  async addTombstone(
    entityType: string,
    entityId: string,
    parentId?: string | null
  ): Promise<void> {
    try {
      const db = await getDatabase();
      const id = `tb_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
      await db.runAsync(
        `INSERT OR REPLACE INTO ${TABLE_DELETED_TOMBSTONES} (id, entity_type, entity_id, parent_id, deleted_at)
         VALUES (?, ?, ?, ?, ?);`,
        [id, entityType, entityId, parentId || null, Date.now()]
      );
    } catch (error) {
      console.warn(`[TombstoneRepository] Error adding tombstone for ${entityType}/${entityId}:`, error);
    }
  },

  /**
   * Check if an entity has been deleted locally.
   */
  async isDeleted(entityType: string, entityId: string): Promise<boolean> {
    try {
      const db = await getDatabase();
      const row = await db.getFirstAsync<{ id: string }>(
        `SELECT id FROM ${TABLE_DELETED_TOMBSTONES} WHERE entity_type = ? AND entity_id = ? LIMIT 1;`,
        [entityType, entityId]
      );
      return Boolean(row);
    } catch (error) {
      console.warn(`[TombstoneRepository] Error checking tombstone for ${entityType}/${entityId}:`, error);
      return false;
    }
  },

  /**
   * Retrieve all recorded tombstones.
   */
  async getAllTombstones(): Promise<DeletedTombstoneRow[]> {
    try {
      const db = await getDatabase();
      return await db.getAllAsync<DeletedTombstoneRow>(
        `SELECT * FROM ${TABLE_DELETED_TOMBSTONES};`
      );
    } catch (error) {
      console.warn("[TombstoneRepository] Error getting tombstones:", error);
      return [];
    }
  },

  /**
   * Remove a tombstone after its deletion has been confirmed synced to the cloud.
   */
  async removeTombstone(id: string): Promise<void> {
    try {
      const db = await getDatabase();
      await db.runAsync(
        `DELETE FROM ${TABLE_DELETED_TOMBSTONES} WHERE id = ?;`,
        [id]
      );
    } catch (error) {
      console.warn("[TombstoneRepository] Error removing tombstone:", error);
    }
  },
};
