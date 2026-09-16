const { DatabaseSync } = require("node:sqlite");
const assert = require("node:assert");

const db = new DatabaseSync(":memory:");
db.exec("PRAGMA foreign_keys = ON;");

console.log("=== 1. Testing Schema and Table Setup ===");

// 1. Create child_profiles
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
`);

// 2. Progression Table
db.exec(`
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
    last_completed_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE(profile_id, lesson_id)
  );

  CREATE INDEX idx_lesson_progress_profile_world ON lesson_progress(profile_id, world_id);
`);

// 3. Wallet Tables
db.exec(`
  CREATE TABLE wallet_balances (
    profile_id TEXT PRIMARY KEY NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
    balance INTEGER NOT NULL DEFAULT 0,
    lifetime_earned INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE coin_transactions (
    id TEXT PRIMARY KEY NOT NULL,
    profile_id TEXT NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    reason TEXT NOT NULL,
    reference_id TEXT,
    created_at INTEGER NOT NULL
  );

  CREATE INDEX idx_coin_tx_profile ON coin_transactions(profile_id);
`);

// 4. Streak Tables
db.exec(`
  CREATE TABLE streak_records (
    profile_id TEXT PRIMARY KEY NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
    current_streak INTEGER NOT NULL DEFAULT 0,
    best_streak INTEGER NOT NULL DEFAULT 0,
    last_active_date TEXT,
    streak_freeze_count INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE streak_pets (
    profile_id TEXT PRIMARY KEY NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
    pet_type TEXT NOT NULL DEFAULT 'sprout',
    growth_stage TEXT NOT NULL DEFAULT 'egg',
    growth_points INTEGER NOT NULL DEFAULT 0,
    stage_unlocked_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
`);

// 5. Heart Tables
db.exec(`
  CREATE TABLE heart_state (
    profile_id TEXT PRIMARY KEY NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
    current_hearts INTEGER NOT NULL DEFAULT 5,
    max_hearts INTEGER NOT NULL DEFAULT 5,
    last_regeneration_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE heart_events (
    id TEXT PRIMARY KEY NOT NULL,
    profile_id TEXT NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
    delta INTEGER NOT NULL,
    resulting_hearts INTEGER NOT NULL,
    source_type TEXT NOT NULL,
    source_id TEXT,
    created_at INTEGER NOT NULL
  );
`);

console.log("✓ All SQLite tables initialized successfully.");

// Insert profiles: Dara and Bopha
const now = Date.now();
db.exec(`
  INSERT INTO child_profiles (id, nickname, age, learning_band, avatar_id, created_at, updated_at)
  VALUES ('cp_dara', 'Dara', 5, 'explorer', 'avatar_01', ${now}, ${now}),
         ('cp_bopha', 'Bopha', 6, 'explorer', 'avatar_02', ${now}, ${now});
`);
console.log("✓ Inserted test profiles: Dara & Bopha.");

console.log("\n=== 2. Testing Track Independence (Khmer World-1 vs English Side Quest) ===");

// Dara completes Lesson 1 in English Basics
const recordEnglishLesson = (profileId, lessonId, stars) => {
  const existing = db.prepare(
    "SELECT * FROM lesson_progress WHERE profile_id = ? AND lesson_id = ?"
  ).get(profileId, lessonId);

  if (existing) {
    db.prepare(`
      UPDATE lesson_progress
      SET status = 'completed',
          best_stars = MAX(best_stars, ?),
          completion_count = completion_count + 1,
          updated_at = ?
      WHERE profile_id = ? AND lesson_id = ?
    `).run(stars, Date.now(), profileId, lessonId);
  } else {
    db.prepare(`
      INSERT INTO lesson_progress (id, profile_id, lesson_id, world_id, status, best_stars, completion_count, total_attempts, total_mistakes, last_completed_at, created_at, updated_at)
      VALUES (?, ?, ?, 'english_basics', 'completed', ?, 1, 1, 0, ?, ?, ?)
    `).run(`prog_${profileId}_${lessonId}`, profileId, lessonId, stars, Date.now(), Date.now(), Date.now());
  }
};

const recordVillageLesson = (profileId, lessonId, stars) => {
  db.prepare(`
    INSERT INTO lesson_progress (id, profile_id, lesson_id, world_id, status, best_stars, completion_count, total_attempts, total_mistakes, last_completed_at, created_at, updated_at)
    VALUES (?, ?, ?, 'world-1', 'completed', ?, 1, 1, 0, ?, ?, ?)
  `).run(`prog_${profileId}_${lessonId}`, profileId, lessonId, stars, Date.now(), Date.now(), Date.now());
};

recordEnglishLesson("cp_dara", "en_001", 3);

// Query Dara's World-1 progress
const daraWorld1Records = db.prepare(
  "SELECT * FROM lesson_progress WHERE profile_id = 'cp_dara' AND world_id = 'world-1'"
).all();
assert.strictEqual(daraWorld1Records.length, 0, "English completion must not affect world-1 progress!");
console.log("✓ Dara completed English en_001: world-1 records = 0 (isolation verified).");

// Query Dara's English Basics progress
const daraEnglishRecords = db.prepare(
  "SELECT * FROM lesson_progress WHERE profile_id = 'cp_dara' AND world_id = 'english_basics'"
).all();
assert.strictEqual(daraEnglishRecords.length, 1, "English progress correctly recorded.");
assert.strictEqual(daraEnglishRecords[0].lesson_id, "en_001");
assert.strictEqual(daraEnglishRecords[0].best_stars, 3);
console.log("✓ Dara English progress record verified: en_001, 3 stars.");

// Dara completes World-1 lesson kv_001
recordVillageLesson("cp_dara", "kv_001", 2);

const daraWorld1After = db.prepare(
  "SELECT * FROM lesson_progress WHERE profile_id = 'cp_dara' AND world_id = 'world-1'"
).all();
assert.strictEqual(daraWorld1After.length, 1);
assert.strictEqual(daraWorld1After[0].lesson_id, "kv_001");

const daraEnglishAfter = db.prepare(
  "SELECT * FROM lesson_progress WHERE profile_id = 'cp_dara' AND world_id = 'english_basics'"
).all();
assert.strictEqual(daraEnglishAfter.length, 1);
assert.strictEqual(daraEnglishAfter[0].lesson_id, "en_001");
console.log("✓ Both tracks maintain independent state concurrently.");

console.log("\n=== 3. Testing Sequential English Unlock Logic ===");

// Define English track sequence
const englishNodes = [
  { level: 1, lessonId: "en_001" },
  { level: 2, lessonId: "en_002" },
  { level: 3, lessonId: "en_003" },
  { level: 4, lessonId: "en_004" },
  { level: 5, lessonId: "en_005" },
  { level: 6, lessonId: "en_006" },
];

const deriveEnglishStatuses = (profileId) => {
  const records = db.prepare(
    "SELECT lesson_id, best_stars FROM lesson_progress WHERE profile_id = ? AND world_id = 'english_basics' AND status = 'completed'"
  ).all(profileId);

  const completedMap = new Map(records.map(r => [r.lesson_id, r.best_stars]));
  let foundCurrent = false;

  return englishNodes.map((n) => {
    if (completedMap.has(n.lessonId)) {
      return { lessonId: n.lessonId, status: "completed", stars: completedMap.get(n.lessonId) };
    }
    if (!foundCurrent) {
      foundCurrent = true;
      return { lessonId: n.lessonId, status: "current", stars: 0 };
    }
    return { lessonId: n.lessonId, status: "locked", stars: 0 };
  });
};

let statuses = deriveEnglishStatuses("cp_dara");
assert.strictEqual(statuses[0].status, "completed");
assert.strictEqual(statuses[1].status, "current");
assert.strictEqual(statuses[2].status, "locked");
assert.strictEqual(statuses[3].status, "locked");
assert.strictEqual(statuses[4].status, "locked");
assert.strictEqual(statuses[5].status, "locked");
console.log("✓ With en_001 done: en_002 is 'current', en_003-006 are 'locked'.");

// Dara completes en_002 with 2 stars
recordEnglishLesson("cp_dara", "en_002", 2);
statuses = deriveEnglishStatuses("cp_dara");
assert.strictEqual(statuses[0].status, "completed");
assert.strictEqual(statuses[1].status, "completed");
assert.strictEqual(statuses[2].status, "current");
assert.strictEqual(statuses[3].status, "locked");
console.log("✓ With en_002 done: en_003 is unlocked as 'current'.");

console.log("\n=== 4. Testing Coin Rewards on English Lessons ===");

// Coin reward simulation
const awardCoins = (profileId, lessonId, stars) => {
  // Base completion = 15 coins, 3 stars = 15 bonus coins
  const baseCoins = 15;
  const starCoins = stars === 3 ? 15 : stars === 2 ? 10 : 5;
  const total = baseCoins + starCoins;

  let wallet = db.prepare("SELECT * FROM wallet_balances WHERE profile_id = ?").get(profileId);
  if (!wallet) {
    db.prepare(`
      INSERT INTO wallet_balances (profile_id, balance, lifetime_earned, updated_at)
      VALUES (?, ?, ?, ?)
    `).run(profileId, total, total, Date.now());
  } else {
    db.prepare(`
      UPDATE wallet_balances
      SET balance = balance + ?, lifetime_earned = lifetime_earned + ?, updated_at = ?
      WHERE profile_id = ?
    `).run(total, total, Date.now(), profileId);
  }

  return total;
};

const coinsEarned = awardCoins("cp_dara", "en_001", 3);
assert.strictEqual(coinsEarned, 30);
const walletDara = db.prepare("SELECT balance FROM wallet_balances WHERE profile_id = 'cp_dara'").get();
assert.strictEqual(walletDara.balance, 30);
console.log(`✓ Dara earned ${coinsEarned} coins from English lesson en_001 (balance: ${walletDara.balance}).`);

console.log("\n=== 5. Testing Daily Streak Recording on English Lessons ===");

const recordStreak = (profileId, dateStr) => {
  let streak = db.prepare("SELECT * FROM streak_records WHERE profile_id = ?").get(profileId);
  if (!streak) {
    db.prepare(`
      INSERT INTO streak_records (profile_id, current_streak, best_streak, last_active_date, streak_freeze_count, updated_at)
      VALUES (?, 1, 1, ?, 0, ?)
    `).run(profileId, dateStr, Date.now());
    return 1;
  }
  if (streak.last_active_date === dateStr) {
    // Already active today, streak doesn't increment twice
    return streak.current_streak;
  }
  const newStreak = streak.current_streak + 1;
  db.prepare(`
    UPDATE streak_records
    SET current_streak = ?, best_streak = MAX(best_streak, ?), last_active_date = ?, updated_at = ?
    WHERE profile_id = ?
  `).run(newStreak, newStreak, dateStr, Date.now(), profileId);
  return newStreak;
};

const streakToday = recordStreak("cp_dara", "2026-09-16");
assert.strictEqual(streakToday, 1);
const streakReplay = recordStreak("cp_dara", "2026-09-16");
assert.strictEqual(streakReplay, 1, "Streak must not increment twice on same calendar day");
console.log("✓ Streak correctly credited for English learning (idempotent for same day).");

console.log("\n=== 6. Testing Total Stars Aggregation Across All Worlds ===");

const getTotalStars = (profileId) => {
  const result = db.prepare(
    "SELECT SUM(best_stars) as total FROM lesson_progress WHERE profile_id = ? AND status = 'completed'"
  ).get(profileId);
  return result.total || 0;
};

// Dara has: en_001 (3 stars), en_002 (2 stars), kv_001 (2 stars) => 7 total stars
const totalStars = getTotalStars("cp_dara");
assert.strictEqual(totalStars, 7);
console.log(`✓ Dara total stars across all worlds = ${totalStars} (3 + 2 + 2 = 7).`);

console.log("\n==========================================");
console.log("🎉 ALL ENGLISH SIDE QUEST TESTS PASSED!");
console.log("==========================================");
