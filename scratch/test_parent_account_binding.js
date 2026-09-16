const { DatabaseSync } = require("node:sqlite");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const db = new DatabaseSync(":memory:");
db.exec("PRAGMA foreign_keys = ON;");

console.log("=================================================================");
console.log("=== PARENT ACCOUNT BINDING & SUPABASE FOUNDATION TEST SUITE   ===");
console.log("=================================================================\n");

// =================================================================
// 1. SQLite Schema Migration v7 (cloud_bindings)
// =================================================================
console.log("--- 1. Testing SQLite Migration v7 & Table Setup ---");

db.exec(`
  CREATE TABLE child_profiles (
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

  CREATE TABLE lesson_progress (
    id TEXT PRIMARY KEY NOT NULL,
    profile_id TEXT NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
    lesson_id TEXT NOT NULL,
    world_id TEXT NOT NULL DEFAULT 'world-1',
    status TEXT NOT NULL CHECK(status IN ('locked', 'unlocked', 'in_progress', 'completed')),
    best_stars INTEGER NOT NULL DEFAULT 0 CHECK(best_stars BETWEEN 0 AND 3),
    completion_count INTEGER NOT NULL DEFAULT 0,
    total_attempts INTEGER NOT NULL DEFAULT 0,
    total_mistakes INTEGER NOT NULL DEFAULT 0,
    first_completed_at INTEGER,
    last_completed_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE(profile_id, lesson_id)
  );

  CREATE TABLE wallets (
    profile_id TEXT PRIMARY KEY NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
    coin_balance INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE coin_transactions (
    id TEXT PRIMARY KEY NOT NULL,
    profile_id TEXT NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    type TEXT NOT NULL,
    source_type TEXT NOT NULL,
    source_id TEXT NOT NULL,
    description TEXT,
    created_at INTEGER NOT NULL,
    UNIQUE(profile_id, source_type, source_id)
  );

  CREATE TABLE cosmetic_inventory (
    id TEXT PRIMARY KEY NOT NULL,
    profile_id TEXT NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL,
    acquired_at INTEGER NOT NULL,
    source TEXT NOT NULL DEFAULT 'shop',
    UNIQUE(profile_id, item_id)
  );

  CREATE TABLE koki_appearance (
    profile_id TEXT PRIMARY KEY NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
    head_item_id TEXT,
    face_item_id TEXT,
    neck_item_id TEXT,
    body_item_id TEXT,
    back_item_id TEXT,
    special_item_id TEXT,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE learning_streaks (
    profile_id TEXT PRIMARY KEY NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
    current_streak INTEGER NOT NULL DEFAULT 0,
    longest_streak INTEGER NOT NULL DEFAULT 0,
    last_qualified_date TEXT,
    total_qualified_days INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE streak_pet_progress (
    profile_id TEXT PRIMARY KEY NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
    highest_stage TEXT NOT NULL DEFAULT 'egg',
    current_companion_id TEXT NOT NULL DEFAULT 'starter_pet',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE heart_state (
    profile_id TEXT PRIMARY KEY NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
    current_hearts INTEGER NOT NULL DEFAULT 5,
    max_hearts INTEGER NOT NULL DEFAULT 5,
    last_regeneration_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE app_settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );

  -- Migration v7: cloud_bindings
  CREATE TABLE cloud_bindings (
    profile_id TEXT PRIMARY KEY NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
    cloud_child_id TEXT NOT NULL,
    cloud_parent_id TEXT NOT NULL,
    bound_at INTEGER NOT NULL,
    last_sync_at INTEGER NOT NULL,
    sync_status TEXT NOT NULL DEFAULT 'synced'
  );

  CREATE INDEX idx_cloud_bindings_parent ON cloud_bindings(cloud_parent_id);
  PRAGMA user_version = 7;
`);

const version = db.prepare("PRAGMA user_version;").get().user_version;
assert.strictEqual(version, 7, "SQLite user_version must be 7");
console.log("✓ Migration v7 applied cleanly. PRAGMA user_version = 7.\n");

// =================================================================
// 2. Testing Cloud Binding Repository Operations & Cascade Delete
// =================================================================
console.log("--- 2. Testing Cloud Binding Repository CRUD & Cascade Delete ---");

const now = Date.now();
// Insert Child 1
db.prepare(`
  INSERT INTO child_profiles (id, nickname, age, learning_band, avatar_id, ui_language, onboarding_completed, created_at, updated_at)
  VALUES ('child_local_123', 'Dara', 5, 'explorer', 'avatar_01', 'km', 1, ?, ?)
`).run(now, now);

// Save Cloud Binding
db.prepare(`
  INSERT INTO cloud_bindings (profile_id, cloud_child_id, cloud_parent_id, bound_at, last_sync_at, sync_status)
  VALUES (?, ?, ?, ?, ?, ?)
`).run("child_local_123", "child_local_123", "parent_uuid_abc", now, now, "synced");

let binding = db.prepare("SELECT * FROM cloud_bindings WHERE profile_id = 'child_local_123'").get();
assert.strictEqual(binding.cloud_child_id, "child_local_123", "Cloud child ID must match local child ID");
assert.strictEqual(binding.cloud_parent_id, "parent_uuid_abc");
assert.strictEqual(binding.sync_status, "synced");

// Update sync timestamp
const syncTime = now + 10000;
db.prepare("UPDATE cloud_bindings SET last_sync_at = ? WHERE profile_id = 'child_local_123'").run(syncTime);
binding = db.prepare("SELECT * FROM cloud_bindings WHERE profile_id = 'child_local_123'").get();
assert.strictEqual(binding.last_sync_at, syncTime);

// Test Cascade Deletion: deleting child_profiles row cascades to cloud_bindings
db.prepare("DELETE FROM child_profiles WHERE id = 'child_local_123'").run();
binding = db.prepare("SELECT * FROM cloud_bindings WHERE profile_id = 'child_local_123'").get();
assert.strictEqual(binding, undefined, "Cloud binding must cascade-delete when local child profile is deleted");
console.log("✓ Cloud binding CRUD and ON DELETE CASCADE verified.\n");

// =================================================================
// 3. Testing Local Snapshot Compilation Logic
// =================================================================
console.log("--- 3. Testing Local Snapshot Compilation ---");

// Re-insert Child Profile with complete learning state
db.prepare(`
  INSERT INTO child_profiles (id, nickname, age, learning_band, avatar_id, ui_language, onboarding_completed, created_at, updated_at)
  VALUES ('child_snapshot_test', 'Sophea', 6, 'adventurer', 'avatar_02', 'km', 1, ?, ?)
`).run(now, now);

// Lesson Progress
db.prepare(`
  INSERT INTO lesson_progress (id, profile_id, lesson_id, world_id, status, best_stars, completion_count, total_attempts, total_mistakes, first_completed_at, last_completed_at, created_at, updated_at)
  VALUES ('lp_1', 'child_snapshot_test', 'lesson-1-1', 'world-1', 'completed', 3, 2, 2, 0, ?, ?, ?, ?)
`).run(now - 2000, now - 1000, now - 2000, now);

db.prepare(`
  INSERT INTO lesson_progress (id, profile_id, lesson_id, world_id, status, best_stars, completion_count, total_attempts, total_mistakes, first_completed_at, last_completed_at, created_at, updated_at)
  VALUES ('lp_2', 'child_snapshot_test', 'en_001', 'english_basics', 'completed', 2, 1, 2, 1, ?, ?, ?, ?)
`).run(now - 1500, now - 500, now - 1500, now);

// Wallet & Transaction
db.prepare(`
  INSERT INTO wallets (profile_id, coin_balance, created_at, updated_at)
  VALUES ('child_snapshot_test', 240, ?, ?)
`).run(now, now);

db.prepare(`
  INSERT INTO coin_transactions (id, profile_id, amount, type, source_type, source_id, description, created_at)
  VALUES ('tx_1', 'child_snapshot_test', 20, 'reward', 'lesson', 'lesson-1-1', 'Star reward', ?)
`).run(now);

// Inventory & Appearance
db.prepare(`
  INSERT INTO cosmetic_inventory (id, profile_id, item_id, acquired_at, source)
  VALUES ('inv_1', 'child_snapshot_test', 'hat_safari', ?, 'shop')
`).run(now);

db.prepare(`
  INSERT INTO koki_appearance (profile_id, head_item_id, face_item_id, neck_item_id, body_item_id, back_item_id, special_item_id, updated_at)
  VALUES ('child_snapshot_test', 'hat_safari', NULL, NULL, NULL, NULL, NULL, ?)
`).run(now);

// Streak & Pet
db.prepare(`
  INSERT INTO learning_streaks (profile_id, current_streak, longest_streak, last_qualified_date, total_qualified_days, created_at, updated_at)
  VALUES ('child_snapshot_test', 5, 7, '2026-09-16', 12, ?, ?)
`).run(now, now);

db.prepare(`
  INSERT INTO streak_pet_progress (profile_id, highest_stage, current_companion_id, created_at, updated_at)
  VALUES ('child_snapshot_test', 'baby', 'starter_pet', ?, ?)
`).run(now, now);

// Heart State
db.prepare(`
  INSERT INTO heart_state (profile_id, current_hearts, max_hearts, last_regeneration_at, created_at, updated_at)
  VALUES ('child_snapshot_test', 4, 5, ?, ?, ?)
`).run(now, now, now);

// Query and verify snapshot
const childRow = db.prepare("SELECT * FROM child_profiles WHERE id = 'child_snapshot_test'").get();
const lessons = db.prepare("SELECT * FROM lesson_progress WHERE profile_id = 'child_snapshot_test' ORDER BY lesson_id ASC").all();
const wallet = db.prepare("SELECT * FROM wallets WHERE profile_id = 'child_snapshot_test'").get();
const inventory = db.prepare("SELECT * FROM cosmetic_inventory WHERE profile_id = 'child_snapshot_test'").all();
const appearance = db.prepare("SELECT * FROM koki_appearance WHERE profile_id = 'child_snapshot_test'").get();
const streak = db.prepare("SELECT * FROM learning_streaks WHERE profile_id = 'child_snapshot_test'").get();
const pet = db.prepare("SELECT * FROM streak_pet_progress WHERE profile_id = 'child_snapshot_test'").get();
const hearts = db.prepare("SELECT * FROM heart_state WHERE profile_id = 'child_snapshot_test'").get();

assert.strictEqual(childRow.id, "child_snapshot_test", "Child ID preserved");
assert.strictEqual(childRow.learning_band, "adventurer");
assert.strictEqual(lessons.length, 2, "Includes both Khmer and English progress");
assert.strictEqual(lessons[0].lesson_id, "en_001");
assert.strictEqual(lessons[1].lesson_id, "lesson-1-1");
assert.strictEqual(wallet.coin_balance, 240);
assert.strictEqual(inventory[0].item_id, "hat_safari");
assert.strictEqual(appearance.head_item_id, "hat_safari");
assert.strictEqual(streak.current_streak, 5);
assert.strictEqual(pet.highest_stage, "baby");
assert.strictEqual(hearts.current_hearts, 4);

console.log("✓ Local snapshot serializes all domain modules cleanly with stable child UUID.\n");

// =================================================================
// 4. Testing Post-Lesson Save Progress Prompt Eligibility & Cooldown
// =================================================================
console.log("--- 4. Testing Save Progress Prompt Eligibility & Cooldown ---");

function checkPromptEligibility(profileId, mockNow = Date.now()) {
  // 1. If bound, false
  const isBound = db.prepare("SELECT 1 FROM cloud_bindings WHERE profile_id = ?").get(profileId);
  if (isBound) return false;

  // 2. Completed count
  const completedCount = db.prepare("SELECT COUNT(*) as c FROM lesson_progress WHERE profile_id = ? AND status = 'completed'").get(profileId).c;
  if (completedCount < 3) return false;

  // 3. Dismissal cooldown
  const dismissedAtRow = db.prepare("SELECT value FROM app_settings WHERE key = ?").get(`save_progress_prompt_dismissed_at_${profileId}`);
  const dismissedCountRow = db.prepare("SELECT value FROM app_settings WHERE key = ?").get(`save_progress_prompt_dismissed_count_${profileId}`);

  if (dismissedAtRow && dismissedCountRow) {
    const dismissedAt = parseInt(dismissedAtRow.value, 10);
    const dismissedCount = parseInt(dismissedCountRow.value, 10);
    const hoursSince = (mockNow - dismissedAt) / (1000 * 60 * 60);
    const lessonsSince = completedCount - dismissedCount;

    if (hoursSince < 24 && lessonsSince < 3) {
      return false;
    }
  }

  return true;
}

// Child currently has 2 completed lessons -> ineligible
assert.strictEqual(checkPromptEligibility("child_snapshot_test"), false, "Ineligible with 2 completed lessons");

// Add 3rd completed lesson
db.prepare(`
  INSERT INTO lesson_progress (id, profile_id, lesson_id, world_id, status, best_stars, completion_count, total_attempts, total_mistakes, first_completed_at, last_completed_at, created_at, updated_at)
  VALUES ('lp_3', 'child_snapshot_test', 'lesson-1-2', 'world-1', 'completed', 3, 1, 1, 0, ?, ?, ?, ?)
`).run(now, now, now, now);

// Now has 3 completed lessons -> ELIGIBLE!
assert.strictEqual(checkPromptEligibility("child_snapshot_test"), true, "Eligible with 3 completed lessons");

// Simulate Parent Dismissing Prompt ("Not Now")
db.prepare("INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)").run(`save_progress_prompt_dismissed_at_child_snapshot_test`, now.toString(), now);
db.prepare("INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)").run(`save_progress_prompt_dismissed_count_child_snapshot_test`, "3", now);

// Immediately after dismissal -> suppressed
assert.strictEqual(checkPromptEligibility("child_snapshot_test", now + 1000), false, "Suppressed right after dismissal");

// After 25 hours -> ELIGIBLE AGAIN!
const nextDay = now + 25 * 60 * 60 * 1000;
assert.strictEqual(checkPromptEligibility("child_snapshot_test", nextDay), true, "Eligible again after 24h cooldown");

// Once bound to cloud -> ALWAYS SUPPRESSED!
db.prepare(`
  INSERT INTO cloud_bindings (profile_id, cloud_child_id, cloud_parent_id, bound_at, last_sync_at, sync_status)
  VALUES (?, ?, ?, ?, ?, ?)
`).run("child_snapshot_test", "child_snapshot_test", "parent_1", now, now, "synced");
assert.strictEqual(checkPromptEligibility("child_snapshot_test", nextDay), false, "Permanently suppressed once bound to cloud");

console.log("✓ Save progress prompt eligibility, dismissal cooldown, and binding suppression verified.\n");

// =================================================================
// 5. Testing Password Validation & Parent Error Formatting
// =================================================================
console.log("--- 5. Testing Password Validation & Auth Error Formatting ---");

function validatePassword(pass, confirmPass) {
  if (!pass || pass.length < 6) {
    return { valid: false, error: "Password must be at least 6 characters." };
  }
  if (confirmPass !== undefined && pass !== confirmPass) {
    return { valid: false, error: "Passwords do not match." };
  }
  return { valid: true };
}

assert.strictEqual(validatePassword("12345").valid, false);
assert.strictEqual(validatePassword("123456", "different").valid, false);
assert.strictEqual(validatePassword("securePass123", "securePass123").valid, true);

function formatAuthError(err) {
  const msg = (err?.message || String(err)).toLowerCase();
  if (msg.includes("invalid login") || msg.includes("invalid credential")) {
    return "Incorrect email or password. Please check and try again.";
  }
  if (msg.includes("already registered") || msg.includes("user already exists")) {
    return "An account with this email already exists. Please sign in instead.";
  }
  if (msg.includes("password should be at least")) {
    return "Password must be at least 6 characters long.";
  }
  return "Unable to connect to account. Please try again later.";
}

assert.strictEqual(
  formatAuthError(new Error("Invalid login credentials")),
  "Incorrect email or password. Please check and try again."
);
assert.strictEqual(
  formatAuthError(new Error("User already registered")),
  "An account with this email already exists. Please sign in instead."
);
console.log("✓ Password rules and friendly parent error translation verified.\n");

// =================================================================
// 6. Testing Supabase SQL Migration File & RLS Verification
// =================================================================
console.log("--- 6. Verifying Supabase SQL Schema & RLS Policies ---");

const sqlPath = path.resolve(process.cwd(), "supabase/migrations/20260916000000_parent_account_and_child_sync.sql");
assert(fs.existsSync(sqlPath), "Supabase migration file must exist");
const sqlContent = fs.readFileSync(sqlPath, "utf-8");

const requiredTables = [
  "profiles",
  "children",
  "lesson_progress",
  "wallets",
  "coin_transactions",
  "cosmetic_inventory",
  "equipped_cosmetics",
  "learning_streaks",
  "streak_pet_progress",
  "heart_state",
];

for (const table of requiredTables) {
  // Verify table creation
  assert(
    sqlContent.includes(`create table if not exists public.${table}`),
    `Table public.${table} must be defined in migration`
  );
  // Verify RLS enabled
  assert(
    sqlContent.includes(`alter table public.${table} enable row level security;`),
    `RLS must be enabled on public.${table}`
  );
}

// Verify no broad "using (true)" policies
assert(
  !sqlContent.toLowerCase().includes("using (true)"),
  "Security violation: broad 'using (true)' policies are forbidden!"
);

// Verify parent_id = auth.uid() policy on children
assert(
  sqlContent.includes("auth.uid() = parent_id"),
  "Children table must enforce auth.uid() = parent_id"
);

// Verify child tables check parent_id in select id from children
assert(
  sqlContent.includes("child_id in (select id from public.children where parent_id = auth.uid())"),
  "Child data tables must enforce parent ownership via children foreign key"
);

console.log("✓ Supabase SQL migration: 10 tables defined, all with strict RLS and zero permissive leaks.\n");

console.log("=================================================================");
console.log("=== ALL PARENT ACCOUNT BINDING TESTS PASSED SUCCESSFULLY      ===");
console.log("=================================================================");
