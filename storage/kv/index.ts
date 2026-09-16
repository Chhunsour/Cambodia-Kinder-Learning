import { AppSettingsRepository } from "../repositories/appSettingsRepository";

/**
 * Key-Value persistence helper backed by SQLite app_settings.
 * Delegates directly to canonical AppSettingsRepository.
 */
export const KeyValueStore = {
  get(key: string): Promise<string | null> {
    return AppSettingsRepository.get(key);
  },

  set(key: string, value: string): Promise<void> {
    return AppSettingsRepository.set(key, value);
  },

  remove(key: string): Promise<void> {
    return AppSettingsRepository.remove(key);
  },

  getAll(): Promise<Record<string, string>> {
    return AppSettingsRepository.getAll();
  },
};
