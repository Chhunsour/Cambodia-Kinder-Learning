import { LearningBand, ChildProfile } from "@/types/user";
import { Locale } from "@/types/common";

/**
 * Raw SQLite row representation for the child_profiles table
 */
export interface ChildProfileRow {
  id: string;
  nickname: string;
  age: number;
  learning_band: string;
  avatar_id: string;
  ui_language: string;
  onboarding_completed: number; // 0 or 1
  created_at: number;
  updated_at: number;
}

/**
 * Raw SQLite row representation for the app_settings table
 */
export interface AppSettingRow {
  key: string;
  value: string;
  updated_at: number;
}

/**
 * Raw SQLite row representation for the lesson_progress table
 */
export interface LessonProgressRow {
  id: string;
  profile_id: string;
  lesson_id: string;
  world_id: string;
  status: string; // 'locked' | 'unlocked' | 'completed'
  best_stars: number; // 1 | 2 | 3
  completion_count: number;
  total_attempts: number;
  total_mistakes: number;
  first_completed_at: number;
  last_completed_at: number;
  created_at: number;
  updated_at: number;
}

/**
 * DTO for inserting or updating a lesson progress record
 */
export interface UpsertLessonProgressDTO {
  id?: string;
  profileId: string;
  lessonId: string;
  worldId: string;
  status?: "locked" | "unlocked" | "completed";
  bestStars: 1 | 2 | 3;
  completionCount?: number;
  totalAttempts?: number;
  totalMistakes?: number;
  firstCompletedAt?: number;
  lastCompletedAt?: number;
  createdAt?: number;
  updatedAt?: number;
}

export type CoinTransactionType = "earn" | "spend" | "adjustment";

/**
 * Raw SQLite row representation for the wallets table
 */
export interface WalletRow {
  profile_id: string;
  coin_balance: number;
  created_at: number;
  updated_at: number;
}

/**
 * Raw SQLite row representation for the coin_transactions table
 */
export interface CoinTransactionRow {
  id: string;
  profile_id: string;
  amount: number;
  type: string;
  source_type: string;
  source_id: string;
  description: string | null;
  created_at: number;
}

/**
 * DTO for creating a coin transaction record
 */
export interface CreateCoinTransactionDTO {
  id?: string;
  profileId: string;
  amount: number;
  type: CoinTransactionType;
  sourceType: string;
  sourceId: string;
  description?: string;
  createdAt?: number;
}

/**
 * Raw SQLite row representation for cosmetic_inventory table
 */
export interface CosmeticInventoryRow {
  id: string;
  profile_id: string;
  item_id: string;
  acquired_at: number;
  source: string;
}

/**
 * Raw SQLite row representation for koki_appearance table
 */
export interface KokiAppearanceRow {
  profile_id: string;
  head_item_id: string | null;
  face_item_id: string | null;
  neck_item_id: string | null;
  body_item_id: string | null;
  back_item_id: string | null;
  special_item_id: string | null;
  updated_at: number;
}

/**
 * DTO for recording acquired cosmetic item
 */
export interface AcquireCosmeticDTO {
  id?: string;
  profileId: string;
  itemId: string;
  acquiredAt?: number;
  source?: "purchase" | "reward" | "default";
}

/**
 * DTO for updating Koki appearance slots
 */
export interface EquippedSlotsDTO {
  head?: string | null;
  face?: string | null;
  neck?: string | null;
  body?: string | null;
  back?: string | null;
  special?: string | null;
}

/**
 * Raw SQLite row representation for learning_streaks table
 */
export interface LearningStreakRow {
  profile_id: string;
  current_streak: number;
  longest_streak: number;
  last_qualified_date: string | null;
  total_qualified_days: number;
  created_at: number;
  updated_at: number;
}

/**
 * Raw SQLite row representation for streak_pet_progress table
 */
export interface StreakPetProgressRow {
  profile_id: string;
  highest_stage: string;
  current_companion_id: string;
  created_at: number;
  updated_at: number;
}

/**
 * Raw SQLite row representation for heart_state table
 */
export interface HeartStateRow {
  profile_id: string;
  current_hearts: number;
  max_hearts: number;
  last_regeneration_at: number;
  created_at: number;
  updated_at: number;
}

/**
 * Raw SQLite row representation for heart_events table
 */
export interface HeartEventRow {
  id: string;
  profile_id: string;
  delta: number;
  source_type: string;
  source_id: string | null;
  created_at: number;
}

export type SyncEntityType =
  | "child_profile"
  | "lesson_progress"
  | "wallet"
  | "coin_transactions"
  | "cosmetic_inventory"
  | "equipped_cosmetics"
  | "learning_streak"
  | "streak_pet_progress"
  | "heart_state"
  | "streak_days"
  | "learning_star_event";

export type SyncOperation = "upsert" | "delete";
export type SyncQueueStatus = "pending" | "processing" | "failed";

export interface SyncQueueRow {
  id: string;
  profile_id: string;
  entity_type: string;
  entity_id: string;
  operation: string;
  payload_json: string;
  created_at: number;
  attempt_count: number;
  last_attempt_at: number | null;
  status: string;
}

export interface CreateSyncQueueDTO {
  id?: string;
  profileId: string;
  entityType: SyncEntityType;
  entityId: string;
  operation: SyncOperation;
  payload: any;
  createdAt?: number;
}

export interface SyncQueueItem {
  id: string;
  profileId: string;
  entityType: SyncEntityType;
  entityId: string;
  operation: SyncOperation;
  payload: any;
  createdAt: number;
  attemptCount: number;
  lastAttemptAt: number | null;
  status: SyncQueueStatus;
}

export interface StreakDaysRow {
  profile_id: string;
  day_date: string;
  created_at: number;
}

export interface DeletedTombstoneRow {
  id: string;
  entity_type: string;
  entity_id: string;
  parent_id: string | null;
  deleted_at: number;
}


/**
 * DTO for creating a new child profile record in the repository
 */
export interface CreateChildProfileDTO {
  id?: string;
  nickname: string;
  age: number;
  learningBand?: LearningBand;
  avatarId: string;
  uiLanguage?: Locale;
  onboardingCompleted?: boolean;
  createdAt?: number;
  updatedAt?: number;
}

/**
 * DTO for updating an existing child profile
 */
export interface UpdateChildProfileDTO {
  nickname?: string;
  age?: number;
  learningBand?: LearningBand;
  avatarId?: string;
  uiLanguage?: Locale;
  onboardingCompleted?: boolean;
}

import { type SQLiteDatabase } from "expo-sqlite";

/**
 * Migration definition for SQLite schema versioning
 */
export interface DatabaseMigration {
  version: number;
  name: string;
  run: (db: SQLiteDatabase) => Promise<void>;
}

/**
 * Inspection payload for developer diagnostics
 */
export interface DatabaseInspectionResult {
  userVersion: number;
  tables: string[];
  childProfilesCount: number;
  activeProfileId: string | null;
  activeProfile: ChildProfile | null;
  onboardingCompleted: boolean;
  appSettings: Record<string, string>;
}

/**
 * Raw SQLite row representation for learning_star_events table
 */
export interface LearningStarEventRow {
  id: string;
  profile_id: string;
  lesson_id: string;
  track_id: string;
  stars_delta: number;
  source_completion_id: string;
  earned_at: number;
  created_at: number;
}

export interface LearningStarEvent {
  id: string;
  profileId: string;
  lessonId: string;
  trackId: string;
  starsDelta: number;
  sourceCompletionId: string;
  earnedAt: number;
  createdAt: number;
}

/**
 * Raw SQLite row representation for leaderboard_cache table
 */
export interface LeaderboardCacheRow {
  profile_id: string;
  week_key: string;
  payload_json: string;
  cached_at: number;
}

/**
 * Raw SQLite row representation for content_packs table
 */
export interface ContentPackRow {
  id: string;
  version: number;
  content_version: number;
  status: string;
  installed_path: string | null;
  downloaded_bytes: number;
  total_bytes: number;
  checksum: string;
  manifest_json: string;
  installed_at: number | null;
  updated_at: number;
  last_error: string | null;
}

export interface ContentPackRecord {
  id: string;
  version: number;
  contentVersion: number;
  status: "not_downloaded" | "downloading" | "installed" | "update_available" | "failed";
  installedPath: string | null;
  downloadedBytes: number;
  totalBytes: number;
  checksum: string;
  manifestJson: string;
  installedAt: number | null;
  updatedAt: number;
  lastError: string | null;
}
