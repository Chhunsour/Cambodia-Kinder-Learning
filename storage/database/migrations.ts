import { type SQLiteDatabase } from "expo-sqlite";
import {
  TABLE_CHILD_PROFILES,
  TABLE_APP_SETTINGS,
  SQL_CREATE_CHILD_PROFILES_TABLE,
  SQL_CREATE_CHILD_PROFILES_INDEX,
  SQL_CREATE_APP_SETTINGS_TABLE,
  SQL_CREATE_LESSON_PROGRESS_TABLE,
  SQL_CREATE_LESSON_PROGRESS_INDEXES,
  SQL_CREATE_WALLETS_TABLE,
  SQL_CREATE_COIN_TRANSACTIONS_TABLE,
  SQL_CREATE_COIN_TRANSACTIONS_INDEXES,
  SQL_CREATE_COSMETIC_INVENTORY_TABLE,
  SQL_CREATE_COSMETIC_INVENTORY_INDEXES,
  SQL_CREATE_KOKI_APPEARANCE_TABLE,
  SQL_CREATE_LEARNING_STREAKS_TABLE,
  SQL_CREATE_STREAK_PET_PROGRESS_TABLE,
  SQL_CREATE_HEART_STATE_TABLE,
  SQL_CREATE_HEART_EVENTS_TABLE,
  SQL_CREATE_HEART_EVENTS_INDEXES,
  SQL_CREATE_CLOUD_BINDINGS_TABLE,
  SQL_CREATE_CLOUD_BINDINGS_INDEXES,
  TABLE_CLOUD_BINDINGS,
  SQL_CREATE_SYNC_QUEUE_TABLE,
  SQL_CREATE_SYNC_QUEUE_INDEXES,
  SQL_CREATE_STREAK_DAYS_TABLE,
  SQL_CREATE_STREAK_DAYS_INDEXES,
  SQL_CREATE_DELETED_TOMBSTONES_TABLE,
  SQL_CREATE_LEARNING_STAR_EVENTS_TABLE,
  SQL_CREATE_LEARNING_STAR_EVENTS_INDEXES,
  SQL_CREATE_LEADERBOARD_CACHE_TABLE,
  SQL_CREATE_CONTENT_PACKS_TABLE,
  SQL_CREATE_CONTENT_PACKS_INDEXES,
  APP_SETTING_KEYS,
} from "./schema";
import { DatabaseMigration } from "./types";

export const MIGRATIONS: DatabaseMigration[] = [
  {
    version: 1,
    name: "create_child_profiles_and_app_settings",
    run: async (db: SQLiteDatabase) => {
      // 1. Create canonical child_profiles table
      await db.execAsync(SQL_CREATE_CHILD_PROFILES_TABLE);

      // 2. Create index for fast sorting and querying by created_at
      await db.execAsync(SQL_CREATE_CHILD_PROFILES_INDEX);

      // 3. Create app_settings table for key-value configuration
      await db.execAsync(SQL_CREATE_APP_SETTINGS_TABLE);

      // 4. Safe migration from any legacy 'profiles' table if present from previous builds
      const legacyProfilesCheck = await db.getFirstAsync<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='profiles';"
      );

      if (legacyProfilesCheck) {
        try {
          await db.execAsync(`
            INSERT OR IGNORE INTO ${TABLE_CHILD_PROFILES} (
              id, nickname, age, learning_band, avatar_id, ui_language, onboarding_completed, created_at, updated_at
            )
            SELECT 
              id,
              COALESCE(nickname, 'Little Explorer'),
              COALESCE(age, 5),
              COALESCE(learning_band, 'explorer'),
              COALESCE(avatar_id, 'avatar_01'),
              COALESCE(ui_language, 'km'),
              1,
              COALESCE(created_at, ${Date.now()}),
              COALESCE(updated_at, ${Date.now()})
            FROM profiles;
          `);

          // Clean up old legacy tables
          await db.execAsync("DROP TABLE IF EXISTS profiles;");
          await db.execAsync("DROP TABLE IF EXISTS profiles_new;");
          await db.execAsync("DROP TABLE IF EXISTS lesson_progress;");
          await db.execAsync("DROP TABLE IF EXISTS offline_sync_queue;");
        } catch (migrationErr) {
          console.warn("[Migrations] Legacy profile migration note:", migrationErr);
        }
      }

      // 5. Migrate legacy active_profile_id setting to active_child_profile_id if needed
      const oldActiveId = await db.getFirstAsync<{ value: string }>(
        "SELECT value FROM app_settings WHERE key = 'active_profile_id';"
      );
      if (oldActiveId?.value) {
        const now = Date.now();
        await db.runAsync(
          `INSERT INTO ${TABLE_APP_SETTINGS} (key, value, updated_at) VALUES (?, ?, ?)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;`,
          [APP_SETTING_KEYS.ACTIVE_CHILD_PROFILE_ID, oldActiveId.value, now]
        );
        await db.runAsync("DELETE FROM app_settings WHERE key = 'active_profile_id';");
      }
    },
  },
  {
    version: 2,
    name: "create_lesson_progress_table",
    run: async (db: SQLiteDatabase) => {
      // 1. Create canonical lesson_progress table
      await db.execAsync(SQL_CREATE_LESSON_PROGRESS_TABLE);

      // 2. Create performance indexes for profile/world and profile/lesson queries
      await db.execAsync(SQL_CREATE_LESSON_PROGRESS_INDEXES);
    },
  },
  {
    version: 3,
    name: "create_wallets_and_coin_transactions",
    run: async (db: SQLiteDatabase) => {
      // 1. Create wallets table
      await db.execAsync(SQL_CREATE_WALLETS_TABLE);

      // 2. Create coin_transactions ledger table
      await db.execAsync(SQL_CREATE_COIN_TRANSACTIONS_TABLE);

      // 3. Create index for fast profile transaction lookups
      await db.execAsync(SQL_CREATE_COIN_TRANSACTIONS_INDEXES);
    },
  },
  {
    version: 4,
    name: "create_cosmetic_inventory_and_appearance",
    run: async (db: SQLiteDatabase) => {
      // 1. Create cosmetic_inventory table
      await db.execAsync(SQL_CREATE_COSMETIC_INVENTORY_TABLE);

      // 2. Create index for fast profile inventory queries
      await db.execAsync(SQL_CREATE_COSMETIC_INVENTORY_INDEXES);

      // 3. Create koki_appearance table for equipped cosmetic slots
      await db.execAsync(SQL_CREATE_KOKI_APPEARANCE_TABLE);
    },
  },
  {
    version: 5,
    name: "create_learning_streaks_and_pet_progress",
    run: async (db: SQLiteDatabase) => {
      // 1. Create learning_streaks table
      await db.execAsync(SQL_CREATE_LEARNING_STREAKS_TABLE);

      // 2. Create streak_pet_progress table
      await db.execAsync(SQL_CREATE_STREAK_PET_PROGRESS_TABLE);
    },
  },
  {
    version: 6,
    name: "create_heart_state_and_events",
    run: async (db: SQLiteDatabase) => {
      // 1. Create heart_state table
      await db.execAsync(SQL_CREATE_HEART_STATE_TABLE);

      // 2. Create heart_events audit table
      await db.execAsync(SQL_CREATE_HEART_EVENTS_TABLE);

      // 3. Create index for fast profile heart event lookups
      await db.execAsync(SQL_CREATE_HEART_EVENTS_INDEXES);
    },
  },
  {
    version: 7,
    name: "create_cloud_bindings_table",
    run: async (db: SQLiteDatabase) => {
      // 1. Create cloud_bindings table
      await db.execAsync(SQL_CREATE_CLOUD_BINDINGS_TABLE);

      // 2. Create index for fast parent lookups
      await db.execAsync(SQL_CREATE_CLOUD_BINDINGS_INDEXES);
    },
  },
  {
    version: 8,
    name: "create_sync_queue_streak_days_and_sync_metadata",
    run: async (db: SQLiteDatabase) => {
      // 1. Create sync_queue table and indexes
      await db.execAsync(SQL_CREATE_SYNC_QUEUE_TABLE);
      await db.execAsync(SQL_CREATE_SYNC_QUEUE_INDEXES);

      // 2. Create streak_days table and indexes
      await db.execAsync(SQL_CREATE_STREAK_DAYS_TABLE);
      await db.execAsync(SQL_CREATE_STREAK_DAYS_INDEXES);

      // 3. Create deleted_entities_tombstones table
      await db.execAsync(SQL_CREATE_DELETED_TOMBSTONES_TABLE);

      // 4. Migrate cloud_bindings columns if not already present
      const tableInfo = await db.getAllAsync<{ name: string }>(
        `PRAGMA table_info(${TABLE_CLOUD_BINDINGS});`
      );
      const colNames = new Set(tableInfo.map((c) => c.name));
      if (!colNames.has("last_successful_sync_at")) {
        await db.execAsync(
          `ALTER TABLE ${TABLE_CLOUD_BINDINGS} ADD COLUMN last_successful_sync_at INTEGER;`
        );
      }
      if (!colNames.has("last_pull_at")) {
        await db.execAsync(
          `ALTER TABLE ${TABLE_CLOUD_BINDINGS} ADD COLUMN last_pull_at INTEGER;`
        );
      }
      if (!colNames.has("last_push_at")) {
        await db.execAsync(
          `ALTER TABLE ${TABLE_CLOUD_BINDINGS} ADD COLUMN last_push_at INTEGER;`
        );
      }
      if (!colNames.has("sync_error")) {
        await db.execAsync(
          `ALTER TABLE ${TABLE_CLOUD_BINDINGS} ADD COLUMN sync_error TEXT;`
        );
      }
    },
  },
  {
    version: 9,
    name: "create_learning_star_events_and_leaderboard_cache",
    run: async (db: SQLiteDatabase) => {
      // 1. Create learning_star_events table and indexes
      await db.execAsync(SQL_CREATE_LEARNING_STAR_EVENTS_TABLE);
      await db.execAsync(SQL_CREATE_LEARNING_STAR_EVENTS_INDEXES);

      // 2. Create leaderboard_cache table
      await db.execAsync(SQL_CREATE_LEADERBOARD_CACHE_TABLE);
    },
  },
  {
    version: 10,
    name: "create_content_packs_table",
    run: async (db: SQLiteDatabase) => {
      // Create content_packs table and status index
      await db.execAsync(SQL_CREATE_CONTENT_PACKS_TABLE);
      await db.execAsync(SQL_CREATE_CONTENT_PACKS_INDEXES);
    },
  },
];

/**
 * Execute sequential migrations up to the latest version.
 * Utilizes PRAGMA user_version to ensure idempotent execution.
 */
export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  const result = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version;");
  let currentVersion = result?.user_version ?? 0;

  for (const migration of MIGRATIONS) {
    if (migration.version > currentVersion) {
      console.log(`[Migrations] Applying migration v${migration.version}: ${migration.name}`);
      await db.withTransactionAsync(async () => {
        await migration.run(db);
      });
      await db.execAsync(`PRAGMA user_version = ${migration.version};`);
      currentVersion = migration.version;
      console.log(`[Migrations] Successfully migrated to v${migration.version}`);
    }
  }
}
