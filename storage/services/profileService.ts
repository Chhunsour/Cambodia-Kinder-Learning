import { getDatabase } from "../database";
import {
  TABLE_CHILD_PROFILES,
  TABLE_APP_SETTINGS,
  APP_SETTING_KEYS,
} from "../database/schema";
import { DatabaseInspectionResult } from "../database/types";
import {
  ChildProfileRepository,
  generateChildProfileId,
} from "../repositories/childProfileRepository";
import { AppSettingsRepository } from "../repositories/appSettingsRepository";
import {
  ChildProfile,
  CreateChildProfileInput,
  deriveLearningBand,
} from "@/types/user";
import { Locale } from "@/types/common";

export interface OnboardingDraft {
  step: number;
  locale?: Locale;
  age?: number;
  nickname?: string;
  avatarId?: string;
}

/**
 * Domain Service for Child Profile management and onboarding lifecycle.
 * Coordinates between repositories, handles edge cases, and provides
 * safe offline fallbacks for child learning gameplay.
 */
export const ProfileService = {
  /**
   * Check whether onboarding has been completed and a valid active profile exists.
   */
  async hasCompletedOnboarding(): Promise<boolean> {
    try {
      const isCompleted = await AppSettingsRepository.get(
        APP_SETTING_KEYS.ONBOARDING_COMPLETED
      );
      if (isCompleted !== "true") {
        return false;
      }

      // Verify that an active child profile actually exists
      const activeProfile = await ChildProfileRepository.getActiveChildProfile();
      return activeProfile !== null;
    } catch (error) {
      console.warn("[ProfileService] Error checking onboarding status:", error);
      return false;
    }
  },

  /**
   * Determine initial destination route on cold start.
   * Prevents screen flashes or routing races.
   */
  async resolveInitialRoute(): Promise<"/(main)/home" | "/(onboarding)"> {
    try {
      const completed = await this.hasCompletedOnboarding();
      return completed ? "/(main)/home" : "/(onboarding)";
    } catch (error) {
      console.warn("[ProfileService] Error resolving initial route, defaulting to onboarding:", error);
      return "/(onboarding)";
    }
  },

  /**
   * Get the current active child profile.
   */
  async getActiveProfile(): Promise<ChildProfile | null> {
    return ChildProfileRepository.getActiveChildProfile();
  },

  /**
   * Complete the first-launch onboarding flow:
   * - Sanitizes nickname (with Khmer fallback)
   * - Derives learning band
   * - Persists child profile in SQLite
   * - Sets as active profile
   * - Sets onboarding_completed to true
   * - Clears temporary onboarding draft
   */
  async completeFirstLaunchOnboarding(
    input: CreateChildProfileInput
  ): Promise<ChildProfile> {
    const fallbackNickname =
      input.uiLanguage === "km" ? "អ្នករុករកតូច" : "Little Explorer";

    // Clean and validate nickname, supporting full Khmer Unicode script
    const cleanNickname =
      input.nickname && input.nickname.trim().length > 0
        ? input.nickname.trim()
        : fallbackNickname;

    const learningBand = deriveLearningBand(input.age);
    const id = input.id || generateChildProfileId();

    // Create the profile record
    const profile = await ChildProfileRepository.createChildProfile({
      id,
      nickname: cleanNickname,
      age: input.age,
      learningBand,
      avatarId: input.avatarId,
      uiLanguage: input.uiLanguage,
      onboardingCompleted: true,
    });

    // Designate as active child profile
    await ChildProfileRepository.setActiveChildProfile(profile.id);

    // Persist global onboarding completion flag
    await AppSettingsRepository.set(
      APP_SETTING_KEYS.ONBOARDING_COMPLETED,
      "true"
    );

    // Clean up temporary draft
    await this.clearOnboardingDraft();

    return { ...profile, isActive: true };
  },

  /**
   * Update the active child's nickname with validation.
   */
  async updateNickname(
    profileId: string,
    newNickname: string
  ): Promise<ChildProfile | null> {
    const trimmed = newNickname.trim();
    if (trimmed.length === 0) {
      throw new Error("[ProfileService] Nickname cannot be empty");
    }

    return ChildProfileRepository.updateChildProfile(profileId, {
      nickname: trimmed,
    });
  },

  /**
   * Update the child's avatar selection.
   */
  async updateAvatar(
    profileId: string,
    newAvatarId: string
  ): Promise<ChildProfile | null> {
    return ChildProfileRepository.updateChildProfile(profileId, {
      avatarId: newAvatarId,
    });
  },

  /**
   * Update the child's preferred UI language.
   */
  async updateLanguage(
    profileId: string,
    newLanguage: Locale
  ): Promise<ChildProfile | null> {
    return ChildProfileRepository.updateChildProfile(profileId, {
      uiLanguage: newLanguage,
    });
  },

  /**
   * Update the child's age. Automatically recalculates learning band
   * (3-5 -> explorer, 6-7 -> adventurer, 8-9 -> champion) without destroying progress.
   */
  async updateAge(
    profileId: string,
    newAge: number
  ): Promise<ChildProfile | null> {
    const clampedAge = Math.min(9, Math.max(3, newAge));
    const newBand = deriveLearningBand(clampedAge);
    return ChildProfileRepository.updateChildProfile(profileId, {
      age: clampedAge,
      learningBand: newBand,
    });
  },

  /**
   * Delete a child profile and check whether an active profile remains.
   */
  async deleteProfile(profileId: string): Promise<{
    success: boolean;
    remainingProfile: ChildProfile | null;
  }> {
    const success = await ChildProfileRepository.deleteChildProfile(profileId);
    if (!success) {
      return { success: false, remainingProfile: null };
    }
    const remaining = await ChildProfileRepository.getActiveChildProfile();
    return { success: true, remainingProfile: remaining };
  },

  /**
   * Save draft onboarding progress to survive unexpected app restarts or interruptions.
   */
  async saveOnboardingDraft(draft: OnboardingDraft): Promise<void> {
    try {
      await AppSettingsRepository.set(
        APP_SETTING_KEYS.ONBOARDING_DRAFT,
        JSON.stringify(draft)
      );
    } catch (e) {
      console.warn("[ProfileService] Failed to save onboarding draft:", e);
    }
  },

  /**
   * Retrieve saved onboarding draft if user resumes flow.
   */
  async getOnboardingDraft(): Promise<OnboardingDraft | null> {
    try {
      const raw = await AppSettingsRepository.get(
        APP_SETTING_KEYS.ONBOARDING_DRAFT
      );
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.warn("[ProfileService] Failed to parse onboarding draft:", e);
      return null;
    }
  },

  /**
   * Clear onboarding draft upon successful completion or reset.
   */
  async clearOnboardingDraft(): Promise<void> {
    try {
      await AppSettingsRepository.remove(APP_SETTING_KEYS.ONBOARDING_DRAFT);
    } catch (e) {
      // Safe to ignore
    }
  },

  // -------------------------------------------------------------
  // Development Diagnostics & Testing Helpers
  // -------------------------------------------------------------

  /**
   * Resets local database state for development testing.
   * Completely clears child profiles and onboarding flags.
   */
  async resetLocalDatabaseForDev(): Promise<void> {
    try {
      const db = await getDatabase();
      await db.withTransactionAsync(async () => {
        await db.runAsync(`DELETE FROM ${TABLE_CHILD_PROFILES};`);
        await db.runAsync(`DELETE FROM ${TABLE_APP_SETTINGS};`);
      });
      console.log("[ProfileService] Local database reset for development successfully.");
    } catch (error) {
      console.warn("[ProfileService] Failed to reset database for dev:", error);
      throw error;
    }
  },

  /**
   * Inspect current local SQLite database state.
   */
  async inspectLocalDatabase(): Promise<DatabaseInspectionResult> {
    const db = await getDatabase();
    
    // User version
    const versionRes = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version;");
    const userVersion = versionRes?.user_version ?? 0;

    // Tables
    const tablesRes = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;"
    );
    const tables = tablesRes.map((t) => t.name);

    // Profile count
    const countRes = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${TABLE_CHILD_PROFILES};`
    );
    const childProfilesCount = countRes?.count ?? 0;

    // Active profile
    const activeProfile = await ChildProfileRepository.getActiveChildProfile();
    const activeProfileId = activeProfile?.id ?? null;

    // Onboarding status
    const onboardingCompleted = await this.hasCompletedOnboarding();

    // App settings
    const appSettings = await AppSettingsRepository.getAll();

    return {
      userVersion,
      tables,
      childProfilesCount,
      activeProfileId,
      activeProfile,
      onboardingCompleted,
      appSettings,
    };
  },

  /**
   * Seed a development child profile for quick testing without full onboarding.
   */
  async seedDevChildProfile(): Promise<ChildProfile> {
    const profile = await this.completeFirstLaunchOnboarding({
      nickname: "Koki Champion",
      age: 6,
      avatarId: "avatar_01",
      uiLanguage: "km",
    });
    console.log("[ProfileService] Seeded dev profile:", profile.nickname);
    return profile;
  },
};
