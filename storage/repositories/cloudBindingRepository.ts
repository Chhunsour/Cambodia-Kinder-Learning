import { getDatabase } from "../database";
import { TABLE_CLOUD_BINDINGS } from "../database/schema";
import { LocalCloudBinding } from "@/lib/supabase/types";

interface CloudBindingRow {
  profile_id: string;
  cloud_child_id: string;
  cloud_parent_id: string;
  bound_at: number;
  last_sync_at: number;
  last_successful_sync_at?: number | null;
  last_pull_at?: number | null;
  last_push_at?: number | null;
  sync_status: string;
  sync_error?: string | null;
}

function mapRowToBinding(row: CloudBindingRow): LocalCloudBinding {
  return {
    profile_id: row.profile_id,
    cloud_child_id: row.cloud_child_id,
    cloud_parent_id: row.cloud_parent_id,
    bound_at: row.bound_at,
    last_sync_at: row.last_sync_at,
    last_successful_sync_at: row.last_successful_sync_at ?? null,
    last_pull_at: row.last_pull_at ?? null,
    last_push_at: row.last_push_at ?? null,
    sync_status: (row.sync_status as LocalCloudBinding["sync_status"]) || "synced",
    sync_error: row.sync_error ?? null,
  };
}

/**
 * Typed repository for Cloud Binding metadata stored in local SQLite.
 * Manages whether a local child profile is linked to a Supabase parent account.
 */
export const CloudBindingRepository = {
  /**
   * Retrieve the cloud binding record for a given local profile ID.
   */
  async getBindingByProfileId(profileId: string): Promise<LocalCloudBinding | null> {
    try {
      const db = await getDatabase();
      const row = await db.getFirstAsync<CloudBindingRow>(
        `SELECT * FROM ${TABLE_CLOUD_BINDINGS} WHERE profile_id = ?;`,
        [profileId]
      );
      if (!row) return null;
      return mapRowToBinding(row);
    } catch (error) {
      console.warn("[CloudBindingRepository] Failed to get binding:", error);
      return null;
    }
  },

  /**
   * Check if a local child profile is currently bound to the cloud.
   */
  async isProfileBound(profileId: string): Promise<boolean> {
    const binding = await this.getBindingByProfileId(profileId);
    return binding !== null;
  },

  /**
   * Save or update a cloud binding record.
   */
  async saveBinding(binding: LocalCloudBinding): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO ${TABLE_CLOUD_BINDINGS} (
        profile_id, cloud_child_id, cloud_parent_id, bound_at, last_sync_at,
        last_successful_sync_at, last_pull_at, last_push_at, sync_status, sync_error
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(profile_id) DO UPDATE SET
        cloud_child_id = excluded.cloud_child_id,
        cloud_parent_id = excluded.cloud_parent_id,
        bound_at = excluded.bound_at,
        last_sync_at = excluded.last_sync_at,
        last_successful_sync_at = excluded.last_successful_sync_at,
        last_pull_at = excluded.last_pull_at,
        last_push_at = excluded.last_push_at,
        sync_status = excluded.sync_status,
        sync_error = excluded.sync_error;`,
      [
        binding.profile_id,
        binding.cloud_child_id,
        binding.cloud_parent_id,
        binding.bound_at,
        binding.last_sync_at,
        binding.last_successful_sync_at ?? binding.last_sync_at,
        binding.last_pull_at ?? null,
        binding.last_push_at ?? null,
        binding.sync_status || "synced",
        binding.sync_error ?? null,
      ]
    );
  },

  /**
   * Update the last sync timestamp and status for a bound profile.
   */
  async updateLastSyncAt(profileId: string, timestamp: number): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE ${TABLE_CLOUD_BINDINGS} 
       SET last_sync_at = ?, last_successful_sync_at = ?, sync_status = 'synced', sync_error = NULL
       WHERE profile_id = ?;`,
      [timestamp, timestamp, profileId]
    );
  },

  /**
   * Update partial sync metadata for a bound profile.
   */
  async updateSyncMetadata(
    profileId: string,
    meta: {
      sync_status?: LocalCloudBinding["sync_status"];
      last_sync_at?: number;
      last_successful_sync_at?: number;
      last_pull_at?: number;
      last_push_at?: number;
      sync_error?: string | null;
    }
  ): Promise<void> {
    const db = await getDatabase();
    const sets: string[] = [];
    const values: any[] = [];

    if (meta.sync_status !== undefined) {
      sets.push("sync_status = ?");
      values.push(meta.sync_status);
    }
    if (meta.last_sync_at !== undefined) {
      sets.push("last_sync_at = ?");
      values.push(meta.last_sync_at);
    }
    if (meta.last_successful_sync_at !== undefined) {
      sets.push("last_successful_sync_at = ?");
      values.push(meta.last_successful_sync_at);
    }
    if (meta.last_pull_at !== undefined) {
      sets.push("last_pull_at = ?");
      values.push(meta.last_pull_at);
    }
    if (meta.last_push_at !== undefined) {
      sets.push("last_push_at = ?");
      values.push(meta.last_push_at);
    }
    if (meta.sync_error !== undefined) {
      sets.push("sync_error = ?");
      values.push(meta.sync_error);
    }

    if (sets.length === 0) return;

    values.push(profileId);
    await db.runAsync(
      `UPDATE ${TABLE_CLOUD_BINDINGS} SET ${sets.join(", ")} WHERE profile_id = ?;`,
      values
    );
  },

  /**
   * Delete cloud binding for a profile (e.g. on profile reset or unlink).
   */
  async deleteBinding(profileId: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `DELETE FROM ${TABLE_CLOUD_BINDINGS} WHERE profile_id = ?;`,
      [profileId]
    );
  },
};
