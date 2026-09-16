import { getDatabase } from "../database";
import { TABLE_CONTENT_PACKS } from "../database/schema";
import { ContentPackRow, ContentPackRecord } from "../database/types";

function mapRowToRecord(row: ContentPackRow): ContentPackRecord {
  return {
    id: row.id,
    version: row.version,
    contentVersion: row.content_version,
    status: row.status as ContentPackRecord["status"],
    installedPath: row.installed_path,
    downloadedBytes: row.downloaded_bytes,
    totalBytes: row.total_bytes,
    checksum: row.checksum,
    manifestJson: row.manifest_json,
    installedAt: row.installed_at,
    updatedAt: row.updated_at,
    lastError: row.last_error,
  };
}

/**
 * Typed repository for managing content pack metadata in SQLite.
 */
export const ContentPackRepository = {
  /**
   * Get a single content pack by ID.
   */
  async getPack(id: string): Promise<ContentPackRecord | null> {
    try {
      const db = await getDatabase();
      const row = await db.getFirstAsync<ContentPackRow>(
        `SELECT * FROM ${TABLE_CONTENT_PACKS} WHERE id = ?;`,
        [id]
      );
      return row ? mapRowToRecord(row) : null;
    } catch (error) {
      console.warn(`[ContentPackRepository] Error getting pack ${id}:`, error);
      return null;
    }
  },

  /**
   * Get all registered content packs.
   */
  async getAllPacks(): Promise<ContentPackRecord[]> {
    try {
      const db = await getDatabase();
      const rows = await db.getAllAsync<ContentPackRow>(
        `SELECT * FROM ${TABLE_CONTENT_PACKS} ORDER BY id ASC;`
      );
      return rows.map(mapRowToRecord);
    } catch (error) {
      console.warn("[ContentPackRepository] Error getting all packs:", error);
      return [];
    }
  },

  /**
   * Get all currently installed content packs.
   */
  async getInstalledPacks(): Promise<ContentPackRecord[]> {
    try {
      const db = await getDatabase();
      const rows = await db.getAllAsync<ContentPackRow>(
        `SELECT * FROM ${TABLE_CONTENT_PACKS} WHERE status = 'installed' ORDER BY installed_at ASC;`
      );
      return rows.map(mapRowToRecord);
    } catch (error) {
      console.warn("[ContentPackRepository] Error getting installed packs:", error);
      return [];
    }
  },

  /**
   * Insert or update a content pack record.
   */
  async upsertPack(record: ContentPackRecord): Promise<void> {
    try {
      const db = await getDatabase();
      await db.runAsync(
        `INSERT INTO ${TABLE_CONTENT_PACKS} (
          id, version, content_version, status, installed_path,
          downloaded_bytes, total_bytes, checksum, manifest_json,
          installed_at, updated_at, last_error
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          version = excluded.version,
          content_version = excluded.content_version,
          status = excluded.status,
          installed_path = excluded.installed_path,
          downloaded_bytes = excluded.downloaded_bytes,
          total_bytes = excluded.total_bytes,
          checksum = excluded.checksum,
          manifest_json = excluded.manifest_json,
          installed_at = excluded.installed_at,
          updated_at = excluded.updated_at,
          last_error = excluded.last_error;`,
        [
          record.id,
          record.version,
          record.contentVersion,
          record.status,
          record.installedPath,
          record.downloadedBytes,
          record.totalBytes,
          record.checksum,
          record.manifestJson,
          record.installedAt,
          record.updatedAt,
          record.lastError,
        ]
      );
    } catch (error) {
      console.warn(`[ContentPackRepository] Error upserting pack ${record.id}:`, error);
      throw error;
    }
  },

  /**
   * Update download progress or status for a pack.
   */
  async updateStatus(
    id: string,
    status: ContentPackRecord["status"],
    downloadedBytes?: number,
    totalBytes?: number,
    lastError?: string | null
  ): Promise<void> {
    try {
      const db = await getDatabase();
      const now = Date.now();
      await db.runAsync(
        `UPDATE ${TABLE_CONTENT_PACKS} SET
          status = ?,
          downloaded_bytes = COALESCE(?, downloaded_bytes),
          total_bytes = COALESCE(?, total_bytes),
          last_error = ?,
          updated_at = ?
        WHERE id = ?;`,
        [status, downloadedBytes ?? null, totalBytes ?? null, lastError ?? null, now, id]
      );
    } catch (error) {
      console.warn(`[ContentPackRepository] Error updating status for pack ${id}:`, error);
    }
  },

  /**
   * Mark a pack as fully and atomically installed.
   */
  async markInstalled(
    id: string,
    installedPath: string,
    checksum: string,
    totalBytes: number,
    version: number,
    contentVersion: number
  ): Promise<void> {
    try {
      const db = await getDatabase();
      const now = Date.now();
      await db.runAsync(
        `UPDATE ${TABLE_CONTENT_PACKS} SET
          status = 'installed',
          installed_path = ?,
          downloaded_bytes = ?,
          total_bytes = ?,
          checksum = ?,
          version = ?,
          content_version = ?,
          installed_at = ?,
          updated_at = ?,
          last_error = NULL
        WHERE id = ?;`,
        [installedPath, totalBytes, totalBytes, checksum, version, contentVersion, now, now, id]
      );
    } catch (error) {
      console.warn(`[ContentPackRepository] Error marking pack installed ${id}:`, error);
      throw error;
    }
  },

  /**
   * Mark pack as deleted (files removed from filesystem, status reset).
   * Note: Child lesson progress is stored separately in lesson_progress and is NEVER touched!
   */
  async markDeleted(id: string): Promise<void> {
    try {
      const db = await getDatabase();
      const now = Date.now();
      await db.runAsync(
        `UPDATE ${TABLE_CONTENT_PACKS} SET
          status = 'not_downloaded',
          installed_path = NULL,
          downloaded_bytes = 0,
          installed_at = NULL,
          updated_at = ?,
          last_error = NULL
        WHERE id = ?;`,
        [now, id]
      );
    } catch (error) {
      console.warn(`[ContentPackRepository] Error marking pack deleted ${id}:`, error);
    }
  },

  /**
   * Hard remove pack row from database if ever needed.
   */
  async deletePackRecord(id: string): Promise<void> {
    try {
      const db = await getDatabase();
      await db.runAsync(`DELETE FROM ${TABLE_CONTENT_PACKS} WHERE id = ?;`, [id]);
    } catch (error) {
      console.warn(`[ContentPackRepository] Error deleting pack record ${id}:`, error);
    }
  },
};
