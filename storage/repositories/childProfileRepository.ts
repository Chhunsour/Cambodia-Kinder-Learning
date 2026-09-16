import { getDatabase } from "../database";
import {
  TABLE_CHILD_PROFILES,
  APP_SETTING_KEYS,
} from "../database/schema";
import {
  ChildProfileRow,
  CreateChildProfileDTO,
  UpdateChildProfileDTO,
} from "../database/types";
import { AppSettingsRepository } from "./appSettingsRepository";
import { CloudBindingRepository } from "./cloudBindingRepository";
import { TombstoneRepository } from "./tombstoneRepository";
import { SyncQueueRepository } from "./syncQueueRepository";
import { getSupabaseClient } from "@/lib/supabase/supabaseClient";
import { ChildProfile, LearningBand, deriveLearningBand } from "@/types/user";
import { Locale } from "@/types/common";

/**
 * Generate a collision-resistant UUID for offline child profiles
 */
export function generateChildProfileId(): string {
  const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  return `cp_${Date.now().toString(36)}_${s4()}${s4()}`;
}

/**
 * Map raw SQLite database row to domain ChildProfile object
 */
function mapRowToChildProfile(row: ChildProfileRow, isActive = false): ChildProfile {
  return {
    id: row.id,
    nickname: row.nickname,
    age: row.age,
    learningBand: row.learning_band as LearningBand,
    avatarId: row.avatar_id,
    uiLanguage: row.ui_language as Locale,
    onboardingCompleted: Boolean(row.onboarding_completed),
    isActive,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Typed repository for Child Profiles stored in SQLite.
 * Handles single and multi-profile operations, active profile resolution,
 * and resilient recovery on corrupted or missing active pointers.
 */
export const ChildProfileRepository = {
  /**
   * Create a new child profile in SQLite.
   */
  async createChildProfile(data: CreateChildProfileDTO): Promise<ChildProfile> {
    const db = await getDatabase();
    const id = data.id || generateChildProfileId();
    const now = Date.now();
    const createdAt = data.createdAt ?? now;
    const updatedAt = data.updatedAt ?? now;
    const learningBand = data.learningBand ?? deriveLearningBand(data.age);
    const uiLanguage = data.uiLanguage ?? "km";
    const onboardingCompleted = data.onboardingCompleted ?? true ? 1 : 0;

    await db.runAsync(
      `INSERT INTO ${TABLE_CHILD_PROFILES} (
        id, nickname, age, learning_band, avatar_id, ui_language, onboarding_completed, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        id,
        data.nickname,
        data.age,
        learningBand,
        data.avatarId,
        uiLanguage,
        onboardingCompleted,
        createdAt,
        updatedAt,
      ]
    );

    return {
      id,
      nickname: data.nickname,
      age: data.age,
      learningBand,
      avatarId: data.avatarId,
      uiLanguage,
      onboardingCompleted: Boolean(onboardingCompleted),
      isActive: false,
      createdAt,
      updatedAt,
    };
  },

  /**
   * Get the currently active child profile.
   * Resilient: If active_child_profile_id is missing or points to a non-existent row,
   * it falls back to the most recently updated profile and repairs the setting.
   */
  async getActiveChildProfile(): Promise<ChildProfile | null> {
    try {
      const db = await getDatabase();
      const activeId = await AppSettingsRepository.get(
        APP_SETTING_KEYS.ACTIVE_CHILD_PROFILE_ID
      );

      if (activeId) {
        const row = await db.getFirstAsync<ChildProfileRow>(
          `SELECT * FROM ${TABLE_CHILD_PROFILES} WHERE id = ?;`,
          [activeId]
        );
        if (row) {
          return mapRowToChildProfile(row, true);
        }
      }

      // Fallback: If active profile setting is missing or dangling, recover latest profile
      const fallbackRow = await db.getFirstAsync<ChildProfileRow>(
        `SELECT * FROM ${TABLE_CHILD_PROFILES} ORDER BY updated_at DESC LIMIT 1;`
      );

      if (fallbackRow) {
        // Auto-repair active_child_profile_id
        await AppSettingsRepository.set(
          APP_SETTING_KEYS.ACTIVE_CHILD_PROFILE_ID,
          fallbackRow.id
        );
        return mapRowToChildProfile(fallbackRow, true);
      }

      return null;
    } catch (error) {
      console.warn("[ChildProfileRepository] Failed to get active child profile:", error);
      return null;
    }
  },

  /**
   * Get a child profile by its unique ID.
   */
  async getChildProfileById(id: string): Promise<ChildProfile | null> {
    try {
      const db = await getDatabase();
      const activeId = await AppSettingsRepository.get(
        APP_SETTING_KEYS.ACTIVE_CHILD_PROFILE_ID
      );
      const row = await db.getFirstAsync<ChildProfileRow>(
        `SELECT * FROM ${TABLE_CHILD_PROFILES} WHERE id = ?;`,
        [id]
      );

      if (!row) return null;
      return mapRowToChildProfile(row, row.id === activeId);
    } catch (error) {
      console.warn(`[ChildProfileRepository] Failed to get profile "${id}":`, error);
      return null;
    }
  },

  /**
   * Update fields of an existing child profile.
   */
  async updateChildProfile(
    id: string,
    updates: UpdateChildProfileDTO
  ): Promise<ChildProfile | null> {
    const existing = await this.getChildProfileById(id);
    if (!existing) {
      console.warn(`[ChildProfileRepository] Profile "${id}" not found for update`);
      return null;
    }

    const db = await getDatabase();
    const setClauses: string[] = [];
    const params: (string | number)[] = [];

    if (updates.nickname !== undefined) {
      setClauses.push("nickname = ?");
      params.push(updates.nickname);
    }

    if (updates.age !== undefined) {
      setClauses.push("age = ?");
      params.push(updates.age);

      // Auto-recalculate learning band if not explicitly provided
      const newBand = updates.learningBand ?? deriveLearningBand(updates.age);
      setClauses.push("learning_band = ?");
      params.push(newBand);
    } else if (updates.learningBand !== undefined) {
      setClauses.push("learning_band = ?");
      params.push(updates.learningBand);
    }

    if (updates.avatarId !== undefined) {
      setClauses.push("avatar_id = ?");
      params.push(updates.avatarId);
    }

    if (updates.uiLanguage !== undefined) {
      setClauses.push("ui_language = ?");
      params.push(updates.uiLanguage);
    }

    if (updates.onboardingCompleted !== undefined) {
      setClauses.push("onboarding_completed = ?");
      params.push(updates.onboardingCompleted ? 1 : 0);
    }

    const now = Date.now();
    setClauses.push("updated_at = ?");
    params.push(now);

    params.push(id);

    await db.runAsync(
      `UPDATE ${TABLE_CHILD_PROFILES} SET ${setClauses.join(", ")} WHERE id = ?;`,
      params
    );

    const updated = await this.getChildProfileById(id);

    // If bound to cloud, enqueue mutation
    if (updated) {
      CloudBindingRepository.isProfileBound(id).then((isBound) => {
        if (isBound) {
          SyncQueueRepository.enqueue({
            profileId: id,
            entityType: "child_profile",
            entityId: id,
            operation: "upsert",
            payload: updated,
          }).catch(() => {});
        }
      }).catch(() => {});
    }

    return updated;
  },

  /**
   * List all registered child profiles in the local database.
   */
  async listChildProfiles(): Promise<ChildProfile[]> {
    try {
      const db = await getDatabase();
      const activeId = await AppSettingsRepository.get(
        APP_SETTING_KEYS.ACTIVE_CHILD_PROFILE_ID
      );
      const rows = await db.getAllAsync<ChildProfileRow>(
        `SELECT * FROM ${TABLE_CHILD_PROFILES} ORDER BY created_at ASC;`
      );

      return rows.map((row) => mapRowToChildProfile(row, row.id === activeId));
    } catch (error) {
      console.warn("[ChildProfileRepository] Failed to list child profiles:", error);
      return [];
    }
  },

  /**
   * Delete a child profile by ID.
   * If the deleted profile was active, safely reassigns active status to another profile.
   * Cleans up cloud bindings, records tombstones, and deletes remote cloud profile if bound.
   */
  async deleteChildProfile(id: string): Promise<boolean> {
    try {
      const db = await getDatabase();
      const activeId = await AppSettingsRepository.get(
        APP_SETTING_KEYS.ACTIVE_CHILD_PROFILE_ID
      );

      // 1. Check cloud binding before local delete
      const binding = await CloudBindingRepository.getBindingByProfileId(id);
      if (binding) {
        await TombstoneRepository.addTombstone("child_profile", id, binding.cloud_parent_id);
        const client = getSupabaseClient();
        if (client) {
          Promise.resolve(client.from("children").delete().eq("id", id)).catch(() => {});
        }
        await SyncQueueRepository.clearQueue(id);
        await CloudBindingRepository.deleteBinding(id);
      }

      await db.runAsync(
        `DELETE FROM ${TABLE_CHILD_PROFILES} WHERE id = ?;`,
        [id]
      );

      // If deleted profile was the active one, reassign or reset
      if (activeId === id) {
        const remaining = await db.getFirstAsync<ChildProfileRow>(
          `SELECT id FROM ${TABLE_CHILD_PROFILES} ORDER BY updated_at DESC LIMIT 1;`
        );

        if (remaining) {
          await AppSettingsRepository.set(
            APP_SETTING_KEYS.ACTIVE_CHILD_PROFILE_ID,
            remaining.id
          );
        } else {
          await AppSettingsRepository.remove(
            APP_SETTING_KEYS.ACTIVE_CHILD_PROFILE_ID
          );
          await AppSettingsRepository.set(
            APP_SETTING_KEYS.ONBOARDING_COMPLETED,
            "false"
          );
        }
      }

      return true;
    } catch (error) {
      console.warn(`[ChildProfileRepository] Failed to delete profile "${id}":`, error);
      return false;
    }
  },

  /**
   * Set the active child profile pointer.
   */
  async setActiveChildProfile(id: string): Promise<void> {
    const profile = await this.getChildProfileById(id);
    if (!profile) {
      throw new Error(`[ChildProfileRepository] Cannot set active profile: profile "${id}" does not exist`);
    }

    await AppSettingsRepository.set(
      APP_SETTING_KEYS.ACTIVE_CHILD_PROFILE_ID,
      id
    );
  },
};
