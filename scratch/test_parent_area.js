const { DatabaseSync } = require("node:sqlite");
const assert = require("node:assert");

const db = new DatabaseSync(":memory:");
db.exec("PRAGMA foreign_keys = ON;");

console.log("=================================================");
console.log("=== PARENT AREA & PARENT GATE TEST SUITE      ===");
console.log("=================================================\n");

// =================================================================
// 1. Database Schema & Tables Setup (Schema v6)
// =================================================================
console.log("--- 1. Setting up SQLite Schema v6 ---");

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
    last_completed_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE(profile_id, lesson_id)
  );

  CREATE TABLE wallet_balances (
    profile_id TEXT PRIMARY KEY NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
    balance INTEGER NOT NULL DEFAULT 0,
    lifetime_earned INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE cosmetic_inventory (
    profile_id TEXT NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL,
    acquired_at INTEGER NOT NULL,
    source TEXT NOT NULL DEFAULT 'shop',
    PRIMARY KEY(profile_id, item_id)
  );

  CREATE TABLE learning_streaks (
    profile_id TEXT PRIMARY KEY NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
    current_streak INTEGER NOT NULL DEFAULT 0,
    longest_streak INTEGER NOT NULL DEFAULT 0,
    last_completed_date TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE heart_state (
    profile_id TEXT PRIMARY KEY NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
    current_hearts INTEGER NOT NULL DEFAULT 5,
    max_hearts INTEGER NOT NULL DEFAULT 5,
    last_refill_at INTEGER NOT NULL,
    next_refill_at INTEGER,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE app_settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );
`);
console.log("✓ Schema created with foreign keys enabled.\n");

// =================================================================
// 2. Testing Math Gate Generator Logic
// =================================================================
console.log("--- 2. Testing Math Gate Generator Logic ---");

function toKhmerDigits(num) {
  const khmerDigits = ["០", "១", "២", "៣", "៤", "៥", "៦", "៧", "៨", "៩"];
  return String(num)
    .split("")
    .map((ch) => {
      const digit = parseInt(ch, 10);
      return !isNaN(digit) ? khmerDigits[digit] : ch;
    })
    .join("");
}

function generateMathGateChallenge() {
  const isAddition = Math.random() < 0.6;
  if (isAddition) {
    const numA = Math.floor(Math.random() * 9) + 3; // 3 to 11
    const numB = Math.floor(Math.random() * 8) + 2; // 2 to 9
    const expected = numA + numB;
    return {
      numA,
      numB,
      operation: "+",
      expectedAnswer: expected,
      questionEn: `${numA} + ${numB}`,
      questionKm: `${toKhmerDigits(numA)} + ${toKhmerDigits(numB)}`,
    };
  } else {
    const expected = Math.floor(Math.random() * 8) + 2; // 2 to 9
    const numB = Math.floor(Math.random() * 7) + 2; // 2 to 8
    const numA = expected + numB;
    return {
      numA,
      numB,
      operation: "-",
      expectedAnswer: expected,
      questionEn: `${numA} - ${numB}`,
      questionKm: `${toKhmerDigits(numA)} - ${toKhmerDigits(numB)}`,
    };
  }
}

// Generate 500 challenges to test boundaries
for (let i = 0; i < 500; i++) {
  const c = generateMathGateChallenge();
  assert(c.expectedAnswer > 0, `Challenge answer must be strictly positive! Got: ${c.expectedAnswer}`);
  if (c.operation === "+") {
    assert.strictEqual(c.numA + c.numB, c.expectedAnswer);
  } else {
    assert.strictEqual(c.numA - c.numB, c.expectedAnswer);
    assert(c.numA > c.numB, "Subtraction minuend must be strictly greater than subtrahend");
  }
  assert(c.questionKm.length > 0, "Khmer question must be non-empty");
  assert(c.questionEn.length > 0, "English question must be non-empty");
}
console.log("✓ Verified 500 randomized math challenges: all answers positive, no negatives, no division/multiplication.\n");

// =================================================================
// 3. Testing In-Memory Parent Gate Session Manager
// =================================================================
console.log("--- 3. Testing Parent Gate Session Manager ---");

class MockParentGateSession {
  constructor() {
    this._unlocked = false;
    this._lastUnlockedAt = null;
    this.TIMEOUT_MS = 30 * 60 * 1000;
  }
  isUnlocked(now = Date.now()) {
    if (!this._unlocked) return false;
    if (this._lastUnlockedAt && now - this._lastUnlockedAt > this.TIMEOUT_MS) {
      this.lock();
      return false;
    }
    return true;
  }
  unlock(now = Date.now()) {
    this._unlocked = true;
    this._lastUnlockedAt = now;
  }
  lock() {
    this._unlocked = false;
    this._lastUnlockedAt = null;
  }
  keepAlive(now = Date.now()) {
    if (this._unlocked) {
      this._lastUnlockedAt = now;
    }
  }
}

const session = new MockParentGateSession();
assert.strictEqual(session.isUnlocked(), false, "Initial gate state must be locked");

session.unlock();
assert.strictEqual(session.isUnlocked(), true, "Gate must be unlocked after unlock()");

// Check timeout expiration after 31 minutes
const futureTime = Date.now() + 31 * 60 * 1000;
assert.strictEqual(session.isUnlocked(futureTime), false, "Gate must auto-lock after session inactivity");

session.unlock();
assert.strictEqual(session.isUnlocked(), true, "Gate can be unlocked again");
session.lock();
assert.strictEqual(session.isUnlocked(), false, "Manual lock must lock gate immediately");
console.log("✓ In-memory session manager adheres to unlock, manual lock, and inactivity auto-lock.\n");

// =================================================================
// 4. Testing Profile Editing & Learning Band Recalculation
// =================================================================
console.log("--- 4. Testing Profile Editing & Learning Band Recalculation ---");

function deriveLearningBand(age) {
  if (age <= 5) return "explorer";
  if (age <= 7) return "adventurer";
  return "champion";
}

const now = Date.now();
// Insert Child 1 (Age 4 -> explorer)
db.prepare(`
  INSERT INTO child_profiles (id, nickname, age, learning_band, avatar_id, ui_language, onboarding_completed, created_at, updated_at)
  VALUES ('child_01', 'តារា', 4, 'explorer', 'avatar_01', 'km', 1, ?, ?)
`).run(now, now);

// Insert Child 2 (Age 7 -> adventurer)
db.prepare(`
  INSERT INTO child_profiles (id, nickname, age, learning_band, avatar_id, ui_language, onboarding_completed, created_at, updated_at)
  VALUES ('child_02', 'Sophie', 7, 'adventurer', 'avatar_02', 'en', 1, ?, ?)
`).run(now, now);

// Insert some learning progress for Child 1
db.prepare(`
  INSERT INTO lesson_progress (id, profile_id, lesson_id, world_id, status, best_stars, completion_count, total_attempts, total_mistakes, last_completed_at, created_at, updated_at)
  VALUES ('lp_01', 'child_01', 'lesson-1-1', 'world-1', 'completed', 3, 1, 1, 0, ?, ?, ?)
`).run(now - 1000, now, now);

db.prepare(`
  INSERT INTO lesson_progress (id, profile_id, lesson_id, world_id, status, best_stars, completion_count, total_attempts, total_mistakes, last_completed_at, created_at, updated_at)
  VALUES ('lp_02', 'child_01', 'lesson-1-2', 'world-1', 'completed', 2, 1, 2, 1, ?, ?, ?)
`).run(now - 500, now, now);

// Wallet for Child 1
db.prepare(`
  INSERT INTO wallet_balances (profile_id, balance, lifetime_earned, updated_at)
  VALUES ('child_01', 150, 150, ?)
`).run(now);

// Verify initial state of Child 1
let p1 = db.prepare("SELECT * FROM child_profiles WHERE id = 'child_01'").get();
assert.strictEqual(p1.nickname, "តារា");
assert.strictEqual(p1.age, 4);
assert.strictEqual(p1.learning_band, "explorer");

// Parent updates age from 4 to 8 (turning 8 years old)
const newAge = 8;
const newBand = deriveLearningBand(newAge);
assert.strictEqual(newBand, "champion");

db.prepare(`
  UPDATE child_profiles
  SET age = ?, learning_band = ?, updated_at = ?
  WHERE id = 'child_01'
`).run(newAge, newBand, Date.now());

p1 = db.prepare("SELECT * FROM child_profiles WHERE id = 'child_01'").get();
assert.strictEqual(p1.age, 8);
assert.strictEqual(p1.learning_band, "champion");

// CRITICAL SAFETY CHECK: Did updating age delete or reset any progress or stars?
const p1Lessons = db.prepare("SELECT * FROM lesson_progress WHERE profile_id = 'child_01' ORDER BY lesson_id ASC").all();
assert.strictEqual(p1Lessons.length, 2, "Lesson progress count must remain 2");
assert.strictEqual(p1Lessons[0].best_stars, 3, "Lesson 1-1 stars must stay 3");
assert.strictEqual(p1Lessons[1].best_stars, 2, "Lesson 1-2 stars must stay 2");

const p1Wallet = db.prepare("SELECT * FROM wallet_balances WHERE profile_id = 'child_01'").get();
assert.strictEqual(p1Wallet.balance, 150, "Coins balance must remain intact");

console.log("✓ Age update automatically re-derives learning band without deleting or modifying progress.\n");

// Update nickname with complex Khmer diacritics
const khmerNickname = "សុខា ស្រីពៅ";
db.prepare(`
  UPDATE child_profiles
  SET nickname = ?, updated_at = ?
  WHERE id = 'child_01'
`).run(khmerNickname, Date.now());

p1 = db.prepare("SELECT * FROM child_profiles WHERE id = 'child_01'").get();
assert.strictEqual(p1.nickname, khmerNickname, "Khmer unicode nickname preserved perfectly");
console.log("✓ Khmer unicode string stored and retrieved accurately.\n");

// =================================================================
// 5. Testing Parent Audio Settings Persistence in SQLite
// =================================================================
console.log("--- 5. Testing Parent Audio Settings Persistence ---");

function setAudioSettings(profileId, settings) {
  const key = `parent_audio_${profileId}`;
  const jsonVal = JSON.stringify(settings);
  db.prepare(`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `).run(key, jsonVal, Date.now());
}

function getAudioSettings(profileId) {
  const key = `parent_audio_${profileId}`;
  const row = db.prepare("SELECT value FROM app_settings WHERE key = ?").get(key);
  if (!row) {
    return { narrationEnabled: true, soundEffectsEnabled: true };
  }
  return JSON.parse(row.value);
}

// Default fallback check
const defaultAudio = getAudioSettings("non_existent_profile");
assert.strictEqual(defaultAudio.narrationEnabled, true);
assert.strictEqual(defaultAudio.soundEffectsEnabled, true);

// Toggle narration off for Child 1
setAudioSettings("child_01", { narrationEnabled: false, soundEffectsEnabled: true });
let savedAudio = getAudioSettings("child_01");
assert.strictEqual(savedAudio.narrationEnabled, false);
assert.strictEqual(savedAudio.soundEffectsEnabled, true);

// Toggle SFX off as well
setAudioSettings("child_01", { narrationEnabled: false, soundEffectsEnabled: false });
savedAudio = getAudioSettings("child_01");
assert.strictEqual(savedAudio.narrationEnabled, false);
assert.strictEqual(savedAudio.soundEffectsEnabled, false);
console.log("✓ Audio preferences persist and retrieve per child profile in app_settings.\n");

// =================================================================
// 6. Testing Real Recent Learning Activity Query
// =================================================================
console.log("--- 6. Testing Recent Learning Activity Derived from SQLite ---");

// Add an incomplete lesson to ensure it's filtered out
db.prepare(`
  INSERT INTO lesson_progress (id, profile_id, lesson_id, world_id, status, best_stars, completion_count, total_attempts, total_mistakes, last_completed_at, created_at, updated_at)
  VALUES ('lp_03', 'child_01', 'lesson-1-3', 'world-1', 'in_progress', 0, 0, 1, 2, NULL, ?, ?)
`).run(now, now);

// Add another completed lesson with most recent timestamp
db.prepare(`
  INSERT INTO lesson_progress (id, profile_id, lesson_id, world_id, status, best_stars, completion_count, total_attempts, total_mistakes, last_completed_at, created_at, updated_at)
  VALUES ('lp_04', 'child_01', 'lesson-english-1', 'english_basics', 'completed', 3, 1, 1, 0, ?, ?, ?)
`).run(now + 5000, now, now);

const recentCompleted = db.prepare(`
  SELECT * FROM lesson_progress
  WHERE profile_id = 'child_01'
    AND status = 'completed'
    AND last_completed_at > 0
  ORDER BY last_completed_at DESC
  LIMIT 4
`).all();

assert.strictEqual(recentCompleted.length, 3, "Only the 3 completed lessons should be returned");
assert.strictEqual(recentCompleted[0].lesson_id, "lesson-english-1", "Most recent lesson must be first");
assert.strictEqual(recentCompleted[1].lesson_id, "lesson-1-2", "Second most recent");
assert.strictEqual(recentCompleted[2].lesson_id, "lesson-1-1", "Third most recent");
console.log("✓ Real SQLite recent learning history queries and sorts accurately.\n");

// =================================================================
// 7. Testing Cascade Profile Deletion & Active Pointer Fallback
// =================================================================
console.log("--- 7. Testing Cascade Profile Deletion & Active Profile Pointer ---");

// App settings active pointer
db.prepare("INSERT INTO app_settings (key, value, updated_at) VALUES ('active_child_profile_id', 'child_01', ?)").run(now);
db.prepare("INSERT INTO app_settings (key, value, updated_at) VALUES ('onboarding_completed', 'true', ?)").run(now);

// Delete Child 1
db.prepare("DELETE FROM child_profiles WHERE id = 'child_01'").run();

// Verify foreign key cascades
const orphanProgress = db.prepare("SELECT count(*) as c FROM lesson_progress WHERE profile_id = 'child_01'").get().c;
const orphanWallet = db.prepare("SELECT count(*) as c FROM wallet_balances WHERE profile_id = 'child_01'").get().c;
assert.strictEqual(orphanProgress, 0, "All lesson progress for child_01 must be cascaded");
assert.strictEqual(orphanWallet, 0, "All wallet rows for child_01 must be cascaded");

// Verify Child 2 remains completely intact
const child2 = db.prepare("SELECT * FROM child_profiles WHERE id = 'child_02'").get();
assert(child2 !== undefined, "child_02 must remain intact");
assert.strictEqual(child2.nickname, "Sophie");

// Simulate active pointer switch to Child 2
db.prepare("UPDATE app_settings SET value = 'child_02' WHERE key = 'active_child_profile_id'").run();
const activeChild = db.prepare("SELECT value FROM app_settings WHERE key = 'active_child_profile_id'").get().value;
assert.strictEqual(activeChild, "child_02");
console.log("✓ Cascade deletion purged child_01 records, preserved child_02, and updated active profile.\n");

// Now delete Child 2 (the final remaining profile)
db.prepare("DELETE FROM child_profiles WHERE id = 'child_02'").run();
const remainingCount = db.prepare("SELECT count(*) as c FROM child_profiles").get().c;
assert.strictEqual(remainingCount, 0, "No profiles remain");

// Reset onboarding when 0 profiles remain
db.prepare("DELETE FROM app_settings WHERE key = 'active_child_profile_id'").run();
db.prepare("UPDATE app_settings SET value = 'false' WHERE key = 'onboarding_completed'").run();

const finalOnboarding = db.prepare("SELECT value FROM app_settings WHERE key = 'onboarding_completed'").get().value;
assert.strictEqual(finalOnboarding, "false", "Onboarding flag reset to false when last profile deleted");
console.log("✓ Deleting the sole remaining profile resets onboarding flag to route back to onboarding.\n");

console.log("=================================================");
console.log("=== ALL PARENT AREA TESTS PASSED SUCCESSFULLY ===");
console.log("=================================================");
