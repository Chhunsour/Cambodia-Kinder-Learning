import { AppSettingsRepository } from "@/storage/repositories/appSettingsRepository";
import { LearningReminderSettings } from "@/features/notifications/types";

export interface ParentAudioSettings {
  narrationEnabled: boolean;
  soundEffectsEnabled: boolean;
}

export interface ParentDownloadSettings {
  downloadWifiOnly: boolean;
}

const KEY_SOUND_EFFECTS = "parent_sound_effects_enabled";
const KEY_DOWNLOAD_WIFI_ONLY = "parent_download_wifi_only";

/**
 * Service managing parent preferences and local app audio switches.
 */
export const ParentSettingsService = {
  /**
   * Get audio settings for the active profile / app.
   */
  async getAudioSettings(profileId: string): Promise<ParentAudioSettings> {
    try {
      const narrationKey = `parent_narration_enabled_${profileId}`;
      const [narrationVal, sfxVal] = await Promise.all([
        AppSettingsRepository.get(narrationKey),
        AppSettingsRepository.get(KEY_SOUND_EFFECTS),
      ]);

      return {
        narrationEnabled: narrationVal === null ? true : narrationVal === "true",
        soundEffectsEnabled: sfxVal === null ? true : sfxVal === "true",
      };
    } catch (error) {
      console.warn("[ParentSettingsService] Failed to load audio settings:", error);
      return {
        narrationEnabled: true,
        soundEffectsEnabled: true,
      };
    }
  },

  /**
   * Update audio settings in SQLite app settings.
   */
  async updateAudioSettings(
    profileId: string,
    settings: Partial<ParentAudioSettings>
  ): Promise<ParentAudioSettings> {
    try {
      const narrationKey = `parent_narration_enabled_${profileId}`;

      if (settings.narrationEnabled !== undefined) {
        await AppSettingsRepository.set(
          narrationKey,
          settings.narrationEnabled ? "true" : "false"
        );
      }

      if (settings.soundEffectsEnabled !== undefined) {
        await AppSettingsRepository.set(
          KEY_SOUND_EFFECTS,
          settings.soundEffectsEnabled ? "true" : "false"
        );
      }

      return this.getAudioSettings(profileId);
    } catch (error) {
      console.warn("[ParentSettingsService] Failed to update audio settings:", error);
      throw error;
    }
  },

  /**
   * Get global download settings (Wi-Fi only rule).
   */
  async getDownloadSettings(): Promise<ParentDownloadSettings> {
    try {
      const val = await AppSettingsRepository.get(KEY_DOWNLOAD_WIFI_ONLY);
      return {
        downloadWifiOnly: val === null ? true : val === "true", // Default: true (Wi-Fi only)
      };
    } catch (error) {
      console.warn("[ParentSettingsService] Failed to load download settings:", error);
      return { downloadWifiOnly: true };
    }
  },

  /**
   * Update download settings.
   */
  async updateDownloadSettings(
    settings: Partial<ParentDownloadSettings>
  ): Promise<ParentDownloadSettings> {
    try {
      if (settings.downloadWifiOnly !== undefined) {
        await AppSettingsRepository.set(
          KEY_DOWNLOAD_WIFI_ONLY,
          settings.downloadWifiOnly ? "true" : "false"
        );
      }
      return this.getDownloadSettings();
    } catch (error) {
      console.warn("[ParentSettingsService] Failed to update download settings:", error);
      throw error;
    }
  },

  /**
   * Get learning reminder settings for a child profile.
   * Default: enabled: false, timeHour: 18 (6:00 PM), timeMinute: 0.
   */
  async getReminderSettings(profileId: string): Promise<LearningReminderSettings> {
    try {
      const key = `parent_reminder_settings_${profileId}`;
      const json = await AppSettingsRepository.get(key);
      if (!json) {
        return {
          enabled: false,
          timeHour: 18,
          timeMinute: 0,
        };
      }
      return JSON.parse(json);
    } catch (err) {
      console.warn(`[ParentSettingsService] Failed to get reminder settings for ${profileId}:`, err);
      return {
        enabled: false,
        timeHour: 18,
        timeMinute: 0,
      };
    }
  },

  /**
   * Update learning reminder settings for a child profile.
   */
  async updateReminderSettings(
    profileId: string,
    partial: Partial<LearningReminderSettings>
  ): Promise<LearningReminderSettings> {
    try {
      const current = await this.getReminderSettings(profileId);
      const updated: LearningReminderSettings = {
        ...current,
        ...partial,
        lastScheduledAt: new Date().toISOString(),
      };
      const key = `parent_reminder_settings_${profileId}`;
      await AppSettingsRepository.set(key, JSON.stringify(updated));
      return updated;
    } catch (err) {
      console.warn(`[ParentSettingsService] Failed to update reminder settings for ${profileId}:`, err);
      throw err;
    }
  },
};
