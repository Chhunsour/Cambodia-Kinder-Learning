/**
 * Database schema constants and DDL declarations for Koki SQLite.
 *
 * Local-first, offline-first architecture for children's learning.
 */

export const DB_NAME = "koki_local.db";

export const TABLE_CHILD_PROFILES = "child_profiles";
export const TABLE_APP_SETTINGS = "app_settings";
export const TABLE_LESSON_PROGRESS = "lesson_progress";
export const TABLE_WALLETS = "wallets";
export const TABLE_COIN_TRANSACTIONS = "coin_transactions";
export const TABLE_COSMETIC_INVENTORY = "cosmetic_inventory";
export const TABLE_KOKI_APPEARANCE = "koki_appearance";
export const TABLE_LEARNING_STREAKS = "learning_streaks";
export const TABLE_STREAK_PET_PROGRESS = "streak_pet_progress";
export const TABLE_HEART_STATE = "heart_state";
export const TABLE_HEART_EVENTS = "heart_events";
export const TABLE_CLOUD_BINDINGS = "cloud_bindings";
export const TABLE_SYNC_QUEUE = "sync_queue";
export const TABLE_STREAK_DAYS = "streak_days";
export const TABLE_DELETED_TOMBSTONES = "deleted_entities_tombstones";
export const TABLE_LEARNING_STAR_EVENTS = "learning_star_events";
export const TABLE_LEADERBOARD_CACHE = "leaderboard_cache";
export const TABLE_CONTENT_PACKS = "content_packs";

export const APP_SETTING_KEYS = {
  ACTIVE_CHILD_PROFILE_ID: "active_child_profile_id",
  ONBOARDING_COMPLETED: "onboarding_completed",
  ONBOARDING_DRAFT: "onboarding_draft",
} as const;

export const SQL_CREATE_CHILD_PROFILES_TABLE = `
  CREATE TABLE IF NOT EXISTS ${TABLE_CHILD_PROFILES} (
    id TEXT PRIMARY KEY NOT NULL,
    nickname TEXT NOT NULL,
    age INTEGER NOT NULL,
    learning_band TEXT NOT NULL,
    avatar_id TEXT NOT NULL,
    ui_language TEXT NOT NULL DEFAULT 'km',
    onboarding_completed INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
`;

export const SQL_CREATE_CHILD_PROFILES_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_child_profiles_created_at 
  ON ${TABLE_CHILD_PROFILES}(created_at);
`;

export const SQL_CREATE_APP_SETTINGS_TABLE = `
  CREATE TABLE IF NOT EXISTS ${TABLE_APP_SETTINGS} (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );
`;

export const SQL_CREATE_LESSON_PROGRESS_TABLE = `
  CREATE TABLE IF NOT EXISTS ${TABLE_LESSON_PROGRESS} (
    id TEXT PRIMARY KEY NOT NULL,
    profile_id TEXT NOT NULL REFERENCES ${TABLE_CHILD_PROFILES}(id) ON DELETE CASCADE,
    lesson_id TEXT NOT NULL,
    world_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'completed',
    best_stars INTEGER NOT NULL DEFAULT 1,
    completion_count INTEGER NOT NULL DEFAULT 1,
    total_attempts INTEGER NOT NULL DEFAULT 1,
    total_mistakes INTEGER NOT NULL DEFAULT 0,
    first_completed_at INTEGER NOT NULL,
    last_completed_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE(profile_id, lesson_id)
  );
`;

export const SQL_CREATE_LESSON_PROGRESS_INDEXES = `
  CREATE INDEX IF NOT EXISTS idx_lesson_progress_profile_world 
  ON ${TABLE_LESSON_PROGRESS}(profile_id, world_id);

  CREATE INDEX IF NOT EXISTS idx_lesson_progress_profile_lesson 
  ON ${TABLE_LESSON_PROGRESS}(profile_id, lesson_id);
`;

export const SQL_CREATE_WALLETS_TABLE = `
  CREATE TABLE IF NOT EXISTS ${TABLE_WALLETS} (
    profile_id TEXT PRIMARY KEY NOT NULL REFERENCES ${TABLE_CHILD_PROFILES}(id) ON DELETE CASCADE,
    coin_balance INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
`;

export const SQL_CREATE_COIN_TRANSACTIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS ${TABLE_COIN_TRANSACTIONS} (
    id TEXT PRIMARY KEY NOT NULL,
    profile_id TEXT NOT NULL REFERENCES ${TABLE_CHILD_PROFILES}(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    type TEXT NOT NULL,
    source_type TEXT NOT NULL,
    source_id TEXT NOT NULL,
    description TEXT,
    created_at INTEGER NOT NULL,
    UNIQUE(profile_id, source_type, source_id)
  );
`;

export const SQL_CREATE_COIN_TRANSACTIONS_INDEXES = `
  CREATE INDEX IF NOT EXISTS idx_coin_transactions_profile 
  ON ${TABLE_COIN_TRANSACTIONS}(profile_id, created_at DESC);
`;

export const SQL_CREATE_COSMETIC_INVENTORY_TABLE = `
  CREATE TABLE IF NOT EXISTS ${TABLE_COSMETIC_INVENTORY} (
    id TEXT PRIMARY KEY NOT NULL,
    profile_id TEXT NOT NULL REFERENCES ${TABLE_CHILD_PROFILES}(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL,
    acquired_at INTEGER NOT NULL,
    source TEXT NOT NULL DEFAULT 'purchase',
    UNIQUE(profile_id, item_id)
  );
`;

export const SQL_CREATE_COSMETIC_INVENTORY_INDEXES = `
  CREATE INDEX IF NOT EXISTS idx_cosmetic_inventory_profile 
  ON ${TABLE_COSMETIC_INVENTORY}(profile_id, acquired_at DESC);
`;

export const SQL_CREATE_KOKI_APPEARANCE_TABLE = `
  CREATE TABLE IF NOT EXISTS ${TABLE_KOKI_APPEARANCE} (
    profile_id TEXT PRIMARY KEY NOT NULL REFERENCES ${TABLE_CHILD_PROFILES}(id) ON DELETE CASCADE,
    head_item_id TEXT,
    face_item_id TEXT,
    neck_item_id TEXT,
    body_item_id TEXT,
    back_item_id TEXT,
    special_item_id TEXT,
    updated_at INTEGER NOT NULL
  );
`;

export const SQL_CREATE_LEARNING_STREAKS_TABLE = `
  CREATE TABLE IF NOT EXISTS ${TABLE_LEARNING_STREAKS} (
    profile_id TEXT PRIMARY KEY NOT NULL REFERENCES ${TABLE_CHILD_PROFILES}(id) ON DELETE CASCADE,
    current_streak INTEGER NOT NULL DEFAULT 0,
    longest_streak INTEGER NOT NULL DEFAULT 0,
    last_qualified_date TEXT,
    total_qualified_days INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
`;

export const SQL_CREATE_STREAK_PET_PROGRESS_TABLE = `
  CREATE TABLE IF NOT EXISTS ${TABLE_STREAK_PET_PROGRESS} (
    profile_id TEXT PRIMARY KEY NOT NULL REFERENCES ${TABLE_CHILD_PROFILES}(id) ON DELETE CASCADE,
    highest_stage TEXT NOT NULL DEFAULT 'egg',
    current_companion_id TEXT NOT NULL DEFAULT 'starter_pet',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
`;

export const SQL_CREATE_HEART_STATE_TABLE = `
  CREATE TABLE IF NOT EXISTS ${TABLE_HEART_STATE} (
    profile_id TEXT PRIMARY KEY NOT NULL REFERENCES ${TABLE_CHILD_PROFILES}(id) ON DELETE CASCADE,
    current_hearts INTEGER NOT NULL DEFAULT 5,
    max_hearts INTEGER NOT NULL DEFAULT 5,
    last_regeneration_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
`;

export const SQL_CREATE_HEART_EVENTS_TABLE = `
  CREATE TABLE IF NOT EXISTS ${TABLE_HEART_EVENTS} (
    id TEXT PRIMARY KEY NOT NULL,
    profile_id TEXT NOT NULL REFERENCES ${TABLE_CHILD_PROFILES}(id) ON DELETE CASCADE,
    delta INTEGER NOT NULL,
    source_type TEXT NOT NULL,
    source_id TEXT,
    created_at INTEGER NOT NULL
  );
`;

export const SQL_CREATE_HEART_EVENTS_INDEXES = `
  CREATE INDEX IF NOT EXISTS idx_heart_events_profile 
  ON ${TABLE_HEART_EVENTS}(profile_id, created_at DESC);
`;

export const SQL_CREATE_CLOUD_BINDINGS_TABLE = `
  CREATE TABLE IF NOT EXISTS ${TABLE_CLOUD_BINDINGS} (
    profile_id TEXT PRIMARY KEY NOT NULL REFERENCES ${TABLE_CHILD_PROFILES}(id) ON DELETE CASCADE,
    cloud_child_id TEXT NOT NULL,
    cloud_parent_id TEXT NOT NULL,
    bound_at INTEGER NOT NULL,
    last_sync_at INTEGER NOT NULL,
    sync_status TEXT NOT NULL DEFAULT 'synced'
  );
`;

export const SQL_CREATE_CLOUD_BINDINGS_INDEXES = `
  CREATE INDEX IF NOT EXISTS idx_cloud_bindings_parent 
  ON ${TABLE_CLOUD_BINDINGS}(cloud_parent_id);
`;

export const SQL_CREATE_SYNC_QUEUE_TABLE = `
  CREATE TABLE IF NOT EXISTS ${TABLE_SYNC_QUEUE} (
    id TEXT PRIMARY KEY NOT NULL,
    profile_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    operation TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    last_attempt_at INTEGER,
    status TEXT NOT NULL DEFAULT 'pending'
  );
`;

export const SQL_CREATE_SYNC_QUEUE_INDEXES = `
  CREATE INDEX IF NOT EXISTS idx_sync_queue_profile_status 
  ON ${TABLE_SYNC_QUEUE}(profile_id, status);

  CREATE INDEX IF NOT EXISTS idx_sync_queue_created_at 
  ON ${TABLE_SYNC_QUEUE}(created_at);
`;

export const SQL_CREATE_STREAK_DAYS_TABLE = `
  CREATE TABLE IF NOT EXISTS ${TABLE_STREAK_DAYS} (
    profile_id TEXT NOT NULL REFERENCES ${TABLE_CHILD_PROFILES}(id) ON DELETE CASCADE,
    day_date TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (profile_id, day_date)
  );
`;

export const SQL_CREATE_STREAK_DAYS_INDEXES = `
  CREATE INDEX IF NOT EXISTS idx_streak_days_profile 
  ON ${TABLE_STREAK_DAYS}(profile_id);
`;

export const SQL_CREATE_DELETED_TOMBSTONES_TABLE = `
  CREATE TABLE IF NOT EXISTS ${TABLE_DELETED_TOMBSTONES} (
    id TEXT PRIMARY KEY NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    parent_id TEXT,
    deleted_at INTEGER NOT NULL
  );
`;

export const SQL_CREATE_LEARNING_STAR_EVENTS_TABLE = `
  CREATE TABLE IF NOT EXISTS ${TABLE_LEARNING_STAR_EVENTS} (
    id TEXT PRIMARY KEY NOT NULL,
    profile_id TEXT NOT NULL REFERENCES ${TABLE_CHILD_PROFILES}(id) ON DELETE CASCADE,
    lesson_id TEXT NOT NULL,
    track_id TEXT NOT NULL DEFAULT 'world-1',
    stars_delta INTEGER NOT NULL CHECK (stars_delta >= 1 AND stars_delta <= 3),
    source_completion_id TEXT NOT NULL UNIQUE,
    earned_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );
`;

export const SQL_CREATE_LEARNING_STAR_EVENTS_INDEXES = `
  CREATE INDEX IF NOT EXISTS idx_star_events_profile_earned 
  ON ${TABLE_LEARNING_STAR_EVENTS}(profile_id, earned_at);

  CREATE INDEX IF NOT EXISTS idx_star_events_completion 
  ON ${TABLE_LEARNING_STAR_EVENTS}(source_completion_id);
`;

export const SQL_CREATE_LEADERBOARD_CACHE_TABLE = `
  CREATE TABLE IF NOT EXISTS ${TABLE_LEADERBOARD_CACHE} (
    profile_id TEXT NOT NULL REFERENCES ${TABLE_CHILD_PROFILES}(id) ON DELETE CASCADE,
    week_key TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    cached_at INTEGER NOT NULL,
    PRIMARY KEY (profile_id, week_key)
  );
`;

export const SQL_CREATE_CONTENT_PACKS_TABLE = `
  CREATE TABLE IF NOT EXISTS ${TABLE_CONTENT_PACKS} (
    id TEXT PRIMARY KEY NOT NULL,
    version INTEGER NOT NULL,
    content_version INTEGER NOT NULL,
    status TEXT NOT NULL,
    installed_path TEXT,
    downloaded_bytes INTEGER NOT NULL DEFAULT 0,
    total_bytes INTEGER NOT NULL DEFAULT 0,
    checksum TEXT NOT NULL,
    manifest_json TEXT NOT NULL,
    installed_at INTEGER,
    updated_at INTEGER NOT NULL,
    last_error TEXT
  );
`;

export const SQL_CREATE_CONTENT_PACKS_INDEXES = `
  CREATE INDEX IF NOT EXISTS idx_content_packs_status 
  ON ${TABLE_CONTENT_PACKS}(status);
`;



