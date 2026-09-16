/**
 * Local SQLite DDL for Koki.
 * Designed for local-first, offline gameplay.
 * Children can play without creating an account or connecting to the internet.
 */
export const MIGRATIONS = [
  {
    version: 1,
    name: "initial_local_first_schema",
    up: [
      `CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY NOT NULL,
        nickname TEXT NOT NULL,
        age INTEGER NOT NULL DEFAULT 5,
        learning_band TEXT NOT NULL DEFAULT "explorer",
        avatar_id TEXT NOT NULL,
        ui_language TEXT NOT NULL DEFAULT "km",
        stars_count INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        sync_status TEXT NOT NULL DEFAULT "local"
      );`,

      `CREATE TABLE IF NOT EXISTS lesson_progress (
        id TEXT PRIMARY KEY NOT NULL,
        profile_id TEXT NOT NULL,
        lesson_id TEXT NOT NULL,
        stars INTEGER NOT NULL DEFAULT 0,
        score INTEGER NOT NULL DEFAULT 0,
        completed_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        sync_status TEXT NOT NULL DEFAULT "local",
        FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
      );`,

      `CREATE INDEX IF NOT EXISTS idx_lesson_progress_profile 
        ON lesson_progress(profile_id);`,

      `CREATE TABLE IF NOT EXISTS offline_sync_queue (
        id TEXT PRIMARY KEY NOT NULL,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        payload TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        last_attempt_at INTEGER,
        error TEXT
      );`,

      `CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );`,
    ],
  },
  {
    version: 2,
    name: "ensure_profile_schema_fields",
    up: [
      // Ensure all required columns exist
      `CREATE TABLE IF NOT EXISTS profiles_new (
        id TEXT PRIMARY KEY NOT NULL,
        nickname TEXT NOT NULL,
        age INTEGER NOT NULL DEFAULT 5,
        learning_band TEXT NOT NULL DEFAULT "explorer",
        avatar_id TEXT NOT NULL,
        ui_language TEXT NOT NULL DEFAULT "km",
        stars_count INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        sync_status TEXT NOT NULL DEFAULT "local"
      );`,
      `INSERT OR IGNORE INTO profiles_new (id, nickname, age, learning_band, avatar_id, ui_language, stars_count, is_active, created_at, updated_at, sync_status)
        SELECT id, COALESCE(nickname, name, "Little Explorer"), 5, "explorer", avatar_id, "km", stars_count, is_active, created_at, updated_at, sync_status FROM profiles;`,
      `DROP TABLE IF EXISTS profiles;`,
      `ALTER TABLE profiles_new RENAME TO profiles;`,
    ],
  },
];
