import { getDatabase } from "../database";
import { TABLE_APP_SETTINGS } from "../database/schema";
import { AppSettingRow } from "../database/types";

/**
 * Repository for key-value application settings stored in SQLite.
 * Provides a clean seam between low-level SQLite and domain services.
 */
export const AppSettingsRepository = {
  /**
   * Retrieve a setting by its unique key.
   */
  async get(key: string): Promise<string | null> {
    try {
      const db = await getDatabase();
      const row = await db.getFirstAsync<AppSettingRow>(
        `SELECT value FROM ${TABLE_APP_SETTINGS} WHERE key = ?;`,
        [key]
      );
      return row ? row.value : null;
    } catch (error) {
      console.warn(`[AppSettingsRepository] Failed to get key "${key}":`, error);
      return null;
    }
  },

  /**
   * Set or update a setting value.
   */
  async set(key: string, value: string): Promise<void> {
    try {
      const db = await getDatabase();
      const now = Date.now();
      await db.runAsync(
        `INSERT INTO ${TABLE_APP_SETTINGS} (key, value, updated_at) 
         VALUES (?, ?, ?) 
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;`,
        [key, value, now]
      );
    } catch (error) {
      console.warn(`[AppSettingsRepository] Failed to set key "${key}":`, error);
      throw error;
    }
  },

  /**
   * Remove a setting by key.
   */
  async remove(key: string): Promise<void> {
    try {
      const db = await getDatabase();
      await db.runAsync(`DELETE FROM ${TABLE_APP_SETTINGS} WHERE key = ?;`, [key]);
    } catch (error) {
      console.warn(`[AppSettingsRepository] Failed to remove key "${key}":`, error);
      throw error;
    }
  },

  /**
   * Retrieve all settings as a key-value record.
   */
  async getAll(): Promise<Record<string, string>> {
    try {
      const db = await getDatabase();
      const rows = await db.getAllAsync<AppSettingRow>(
        `SELECT key, value FROM ${TABLE_APP_SETTINGS};`
      );
      const result: Record<string, string> = {};
      for (const row of rows) {
        result[row.key] = row.value;
      }
      return result;
    } catch (error) {
      console.warn("[AppSettingsRepository] Failed to get all settings:", error);
      return {};
    }
  },
};
