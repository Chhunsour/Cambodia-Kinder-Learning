import { DatabaseSync } from "node:sqlite";

console.log("=== Koki SQLite Foundation Verification Test ===");

// 1. Initialize in-memory SQLite database with WAL & foreign keys
const db = new DatabaseSync(":memory:");
db.exec("PRAGMA foreign_keys = ON;");

// 2. Verify PRAGMA user_version initial state
let versionRes = db.prepare("PRAGMA user_version;").get();
console.log("Initial user_version:", versionRes.user_version);
if (versionRes.user_version !== 0) throw new Error("Expected initial user_version to be 0");

// 3. Simulate legacy table existence to verify migration 1 auto-migration
db.exec(`
  CREATE TABLE profiles (
    id TEXT PRIMARY KEY NOT NULL,
    nickname TEXT NOT NULL,
    age INTEGER NOT NULL,
    learning_band TEXT NOT NULL,
    avatar_id TEXT NOT NULL,
    ui_language TEXT NOT NULL,
    stars_count INTEGER NOT NULL,
    is_active INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  INSERT INTO profiles (id, nickname, age, learning_band, avatar_id, ui_language, stars_count, is_active, created_at, updated_at)
  VALUES ('legacy_01', 'ចៅកូគី (Chao Koki)', 5, 'explorer', 'avatar_01', 'km', 10, 1, 1000, 1000);
  
  CREATE TABLE app_settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );
  INSERT INTO app_settings (key, value, updated_at) VALUES ('active_profile_id', 'legacy_01', 1000);
`);

console.log("✓ Created legacy profiles table with sample child record");

// 4. Run Migration 1 logic
const migration1 = {
  version: 1,
  name: "create_child_profiles_and_app_settings",
  run: (database) => {
    database.exec(`
      CREATE TABLE IF NOT EXISTS child_profiles (
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
      CREATE INDEX IF NOT EXISTS idx_child_profiles_created_at ON child_profiles(created_at);
      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);

    // Check if legacy 'profiles' table exists
    const legacyCheck = database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='profiles';").get();
    if (legacyCheck) {
      database.exec(`
        INSERT OR IGNORE INTO child_profiles (
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
        DROP TABLE IF EXISTS profiles;
      `);
    }

    // Migrate active_profile_id to active_child_profile_id
    const oldActive = database.prepare("SELECT value FROM app_settings WHERE key = 'active_profile_id';").get();
    if (oldActive?.value) {
      database.prepare(`
        INSERT INTO app_settings (key, value, updated_at) VALUES ('active_child_profile_id', ?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;
      `).run(oldActive.value, Date.now());
      database.prepare("DELETE FROM app_settings WHERE key = 'active_profile_id';").run();
    }
  },
};

migration1.run(db);
db.exec("PRAGMA user_version = 1;");

versionRes = db.prepare("PRAGMA user_version;").get();
console.log("Post-migration user_version:", versionRes.user_version);
if (versionRes.user_version !== 1) throw new Error("Expected user_version 1");

// Verify legacy data was migrated cleanly to child_profiles
const migratedChild = db.prepare("SELECT * FROM child_profiles WHERE id = 'legacy_01';").get();
console.log("✓ Migrated legacy profile into child_profiles:", migratedChild.nickname);
if (migratedChild.nickname !== "ចៅកូគី (Chao Koki)") throw new Error("Legacy profile nickname mismatch");
if (migratedChild.onboarding_completed !== 1) throw new Error("Expected onboarding_completed = 1");

// Verify active_child_profile_id in app_settings
const activeSetting = db.prepare("SELECT value FROM app_settings WHERE key = 'active_child_profile_id';").get();
if (activeSetting.value !== "legacy_01") throw new Error("Expected active_child_profile_id to be legacy_01");
console.log("✓ Legacy active_profile_id setting migrated to active_child_profile_id");

// 5. Test inserting Khmer Unicode nicknames and special characters
const khmerNickname = "សុខា 🇰🇭 ✨";
db.prepare(`
  INSERT INTO child_profiles (id, nickname, age, learning_band, avatar_id, ui_language, onboarding_completed, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
`).run("cp_khmer_02", khmerNickname, 7, "adventurer", "avatar_02", "km", 1, Date.now(), Date.now());

const fetchedKhmer = db.prepare("SELECT * FROM child_profiles WHERE id = 'cp_khmer_02';").get();
console.log("✓ Khmer Unicode preserved perfectly:", fetchedKhmer.nickname);
if (fetchedKhmer.nickname !== khmerNickname) throw new Error("Khmer nickname corrupted");

// 6. Test Corrupted / Invalid active_child_profile_id Recovery
db.prepare("UPDATE app_settings SET value = 'non_existent_id' WHERE key = 'active_child_profile_id';").run();

// Simulation of getActiveChildProfile recovery logic:
let activeIdRow = db.prepare("SELECT value FROM app_settings WHERE key = 'active_child_profile_id';").get();
let activeProfile = db.prepare("SELECT * FROM child_profiles WHERE id = ?;").get(activeIdRow?.value);
if (!activeProfile) {
  // Recovery: get most recently updated profile
  activeProfile = db.prepare("SELECT * FROM child_profiles ORDER BY updated_at DESC LIMIT 1;").get();
  db.prepare("UPDATE app_settings SET value = ? WHERE key = 'active_child_profile_id';").run(activeProfile.id);
}
console.log("✓ Resilient fallback repaired active_child_profile_id to:", activeProfile.id);
if (activeProfile.id !== "cp_khmer_02" && activeProfile.id !== "legacy_01") {
  throw new Error("Active profile recovery failed");
}

// 7. Test Onboarding Draft persistence and retrieval
const draftData = { step: 3, age: 6, locale: "km", nickname: "បូរី" };
db.prepare(`
  INSERT INTO app_settings (key, value, updated_at) VALUES ('onboarding_draft', ?, ?)
  ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;
`).run(JSON.stringify(draftData), Date.now());

const readDraft = db.prepare("SELECT value FROM app_settings WHERE key = 'onboarding_draft';").get();
const parsedDraft = JSON.parse(readDraft.value);
console.log("✓ Onboarding draft persisted & retrieved:", parsedDraft.nickname, "step:", parsedDraft.step);
if (parsedDraft.step !== 3 || parsedDraft.nickname !== "បូរី") throw new Error("Draft verification failed");

// Clear draft
db.prepare("DELETE FROM app_settings WHERE key = 'onboarding_draft';").run();
const emptyDraft = db.prepare("SELECT value FROM app_settings WHERE key = 'onboarding_draft';").get();
if (emptyDraft !== undefined) throw new Error("Draft should be deleted");
console.log("✓ Onboarding draft cleared successfully");

// 8. Test Profile Deletion with Active Profile Reassignment
console.log("✓ Deleting active profile cp_khmer_02...");
db.prepare("DELETE FROM child_profiles WHERE id = 'cp_khmer_02';").run();
// Reassignment logic:
const remainingProfile = db.prepare("SELECT * FROM child_profiles ORDER BY updated_at DESC LIMIT 1;").get();
db.prepare("UPDATE app_settings SET value = ? WHERE key = 'active_child_profile_id';").run(remainingProfile.id);
console.log("✓ Active profile safely reassigned to remaining profile:", remainingProfile.nickname, "(", remainingProfile.id, ")");
if (remainingProfile.id !== "legacy_01") throw new Error("Reassignment failed");

// 9. Test Dev Reset
db.exec("DELETE FROM child_profiles; DELETE FROM app_settings;");
const countAfterReset = db.prepare("SELECT count(*) as cnt FROM child_profiles;").get().cnt;
const settingsAfterReset = db.prepare("SELECT count(*) as cnt FROM app_settings;").get().cnt;
console.log("✓ Database dev reset verified (child_profiles count:", countAfterReset, ", app_settings count:", settingsAfterReset, ")");
if (countAfterReset !== 0 || settingsAfterReset !== 0) throw new Error("Reset failed");

console.log("\n>>> ALL 9 SQLITE FOUNDATION TESTS PASSED SUCCESSFULLY! <<<\n");
db.close();
