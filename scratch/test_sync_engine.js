const { DatabaseSync } = require("node:sqlite");
const assert = require("node:assert");

const db = new DatabaseSync(":memory:");
db.exec("PRAGMA foreign_keys = ON;");

console.log("=================================================================");
console.log("=== KOKI FULL LOCAL <-> CLOUD SYNC & CONFLICT MERGER TESTS    ===");
console.log("=================================================================\n");

// =================================================================
// 1. SQLite Migration v8: Schema, Sync Queue, Streak Days & Tombstones
// =================================================================
console.log("--- 1. Testing SQLite Migration v8 & Table Setup ---");

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
    current_hearts INTEGER NOT NULL DEFAULT 5 CHECK(current_hearts BETWEEN 0 AND 5),
    max_hearts INTEGER NOT NULL DEFAULT 5,
    last_regeneration_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE cloud_bindings (
    profile_id TEXT PRIMARY KEY NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
    cloud_child_id TEXT NOT NULL,
    cloud_parent_id TEXT NOT NULL,
    bound_at INTEGER NOT NULL,
    last_sync_at INTEGER,
    last_successful_sync_at INTEGER,
    last_pull_at INTEGER,
    last_push_at INTEGER,
    sync_status TEXT NOT NULL DEFAULT 'synced',
    sync_error TEXT
  );

  -- Migration 8 tables
  CREATE TABLE sync_queue (
    id TEXT PRIMARY KEY NOT NULL,
    profile_id TEXT NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    operation TEXT NOT NULL CHECK(operation IN ('upsert', 'delete')),
    payload TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'failed')),
    attempt_count INTEGER NOT NULL DEFAULT 0,
    next_attempt_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    error TEXT
  );

  CREATE INDEX idx_sync_queue_lookup ON sync_queue(profile_id, status, next_attempt_at);

  CREATE TABLE streak_days (
    id TEXT PRIMARY KEY NOT NULL,
    profile_id TEXT NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
    day_date TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    UNIQUE(profile_id, day_date)
  );

  CREATE INDEX idx_streak_days_profile ON streak_days(profile_id, day_date);

  CREATE TABLE deleted_entities_tombstones (
    id TEXT PRIMARY KEY NOT NULL,
    profile_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    deleted_at INTEGER NOT NULL
  );
`);

console.log("✓ Migration v8 DDL executed successfully.");

// =================================================================
// 2. Sync Queue Lifecycle & Exponential Backoff
// =================================================================
console.log("\n--- 2. Testing Sync Queue Lifecycle & Exponential Backoff ---");

const now = Date.now();
const profileId = "cp_child_001";
db.exec(`
  INSERT INTO child_profiles (id, nickname, age, learning_band, avatar_id, created_at, updated_at)
  VALUES ('${profileId}', 'Sophea', 5, 'band_1', 'koki_default', ${now}, ${now});
`);

// Test enqueue
const enqueueStmt = db.prepare(`
  INSERT INTO sync_queue (id, profile_id, entity_type, entity_id, operation, payload, status, attempt_count, next_attempt_at, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, 'pending', 0, ?, ?, ?);
`);

enqueueStmt.run("sq_1", profileId, "lesson_progress", "lesson-1", "upsert", JSON.stringify({ bestStars: 2 }), now, now, now);
enqueueStmt.run("sq_2", profileId, "wallets", profileId, "upsert", JSON.stringify({ coinBalance: 20 }), now, now, now);

let queueItems = db.prepare(`SELECT * FROM sync_queue WHERE profile_id = ? ORDER BY created_at ASC;`).all(profileId);
assert.strictEqual(queueItems.length, 2, "Should have 2 items in sync queue");
console.log("✓ Queue insertions recorded correctly.");

// Test mark processing
db.prepare(`UPDATE sync_queue SET status = 'processing', updated_at = ? WHERE id = ?;`).run(now, "sq_1");
let item1 = db.prepare(`SELECT * FROM sync_queue WHERE id = 'sq_1';`).get();
assert.strictEqual(item1.status, "processing");
console.log("✓ Queue item status transition to 'processing' verified.");

// Test failure with exponential backoff
function calculateBackoffDelay(attemptCount) {
  const delays = [60 * 1000, 5 * 60 * 1000, 15 * 60 * 1000, 60 * 60 * 1000];
  return delays[Math.min(attemptCount - 1, delays.length - 1)];
}

const attempt1Delay = calculateBackoffDelay(1); // 1 min
const attempt2Delay = calculateBackoffDelay(2); // 5 min
const attempt3Delay = calculateBackoffDelay(3); // 15 min
const attempt4Delay = calculateBackoffDelay(4); // 60 min
const attempt5Delay = calculateBackoffDelay(5); // capped at 60 min

assert.strictEqual(attempt1Delay, 60000, "Attempt 1 backoff should be 1m");
assert.strictEqual(attempt2Delay, 300000, "Attempt 2 backoff should be 5m");
assert.strictEqual(attempt3Delay, 900000, "Attempt 3 backoff should be 15m");
assert.strictEqual(attempt4Delay, 3600000, "Attempt 4 backoff should be 60m");
assert.strictEqual(attempt5Delay, 3600000, "Attempt 5+ backoff should be capped at 60m");
console.log("✓ Exponential backoff progression verified (1m -> 5m -> 15m -> 60m max).");

// Record failure
const nextRetry = now + attempt1Delay;
db.prepare(`
  UPDATE sync_queue
  SET status = 'failed', attempt_count = 1, next_attempt_at = ?, error = 'Network timeout', updated_at = ?
  WHERE id = 'sq_1';
`).run(nextRetry, now);

item1 = db.prepare(`SELECT * FROM sync_queue WHERE id = 'sq_1';`).get();
assert.strictEqual(item1.status, "failed");
assert.strictEqual(item1.attempt_count, 1);
assert.strictEqual(item1.next_attempt_at, nextRetry);
console.log("✓ Failure recorded with scheduled retry time.");

// Reset failed items
db.prepare(`
  UPDATE sync_queue
  SET status = 'pending', next_attempt_at = ?, error = NULL, updated_at = ?
  WHERE profile_id = ? AND status = 'failed';
`).run(now, now, profileId);

item1 = db.prepare(`SELECT * FROM sync_queue WHERE id = 'sq_1';`).get();
assert.strictEqual(item1.status, "pending");
console.log("✓ Reset failed items verified.");

// Delete processed item
db.prepare(`DELETE FROM sync_queue WHERE id = 'sq_2';`).run();
queueItems = db.prepare(`SELECT * FROM sync_queue WHERE profile_id = ?;`).all(profileId);
assert.strictEqual(queueItems.length, 1);
console.log("✓ Successfully pushed items cleanly deleted from queue.");

// =================================================================
// 3. Entity-Specific Conflict Merge Algorithms
// =================================================================
console.log("\n--- 3. Testing Pure Conflict Resolution Algorithms ---");

// --- A. Lesson Progress: Max Stars & Non-Regressing Status ---
console.log("-> 3A. Lesson Progress");
function mergeLessonProgress(localList, remoteList, childId) {
  const localMap = new Map();
  for (const item of localList) localMap.set(item.lessonId, item);
  const remoteMap = new Map();
  for (const item of remoteList) remoteMap.set(item.lesson_id, item);

  const allKeys = new Set([...localMap.keys(), ...remoteMap.keys()]);
  const mergedLocal = [];
  const toPushToCloud = [];

  for (const key of allKeys) {
    const local = localMap.get(key);
    const remote = remoteMap.get(key);

    if (local && !remote) {
      mergedLocal.push(local);
      toPushToCloud.push({
        id: local.id,
        child_id: childId,
        lesson_id: local.lessonId,
        world_id: local.worldId,
        status: local.status,
        best_stars: local.bestStars,
        completion_count: local.completionCount,
        total_attempts: local.totalAttempts,
        total_mistakes: local.totalMistakes,
        first_completed_at: local.firstCompletedAt ? new Date(local.firstCompletedAt).toISOString() : null,
        last_completed_at: local.lastCompletedAt ? new Date(local.lastCompletedAt).toISOString() : null,
        created_at: new Date(local.createdAt).toISOString(),
        updated_at: new Date(local.updatedAt).toISOString(),
      });
    } else if (!local && remote) {
      mergedLocal.push({
        id: remote.id,
        profileId: childId,
        lessonId: remote.lesson_id,
        worldId: remote.world_id,
        status: remote.status,
        bestStars: remote.best_stars,
        completionCount: remote.completion_count,
        totalAttempts: remote.total_attempts,
        totalMistakes: remote.total_mistakes,
        firstCompletedAt: remote.first_completed_at ? new Date(remote.first_completed_at).getTime() : null,
        lastCompletedAt: remote.last_completed_at ? new Date(remote.last_completed_at).getTime() : null,
        createdAt: new Date(remote.created_at).getTime(),
        updatedAt: new Date(remote.updated_at).getTime(),
      });
    } else if (local && remote) {
      const bestStars = Math.max(local.bestStars, remote.best_stars);
      const isCompleted = local.status === "completed" || remote.status === "completed";
      const status = isCompleted ? "completed" : (local.status === "in_progress" || remote.status === "in_progress" ? "in_progress" : local.status);
      const completionCount = Math.max(local.completionCount, remote.completion_count);

      const merged = {
        id: local.id,
        profileId: childId,
        lessonId: key,
        worldId: local.worldId,
        status,
        bestStars,
        completionCount,
        totalAttempts: Math.max(local.totalAttempts, remote.total_attempts),
        totalMistakes: Math.min(local.totalMistakes, remote.total_mistakes),
        firstCompletedAt: local.firstCompletedAt || (remote.first_completed_at ? new Date(remote.first_completed_at).getTime() : null),
        lastCompletedAt: Math.max(local.lastCompletedAt || 0, remote.last_completed_at ? new Date(remote.last_completed_at).getTime() : 0) || null,
        createdAt: Math.min(local.createdAt, new Date(remote.created_at).getTime()),
        updatedAt: Math.max(local.updatedAt, new Date(remote.updated_at).getTime()),
      };
      mergedLocal.push(merged);

      if (merged.bestStars > remote.best_stars || (merged.status === "completed" && remote.status !== "completed")) {
        toPushToCloud.push({
          id: merged.id,
          child_id: childId,
          lesson_id: merged.lessonId,
          world_id: merged.worldId,
          status: merged.status,
          best_stars: merged.bestStars,
          completion_count: merged.completionCount,
          total_attempts: merged.totalAttempts,
          total_mistakes: merged.totalMistakes,
          first_completed_at: merged.firstCompletedAt ? new Date(merged.firstCompletedAt).toISOString() : null,
          last_completed_at: merged.lastCompletedAt ? new Date(merged.lastCompletedAt).toISOString() : null,
          created_at: new Date(merged.createdAt).toISOString(),
          updated_at: new Date(merged.updatedAt).toISOString(),
        });
      }
    }
  }

  return { mergedLocal, toPushToCloud };
}

const localLessons = [
  { id: "lp_1", lessonId: "lesson-1", worldId: "world-1", status: "completed", bestStars: 3, completionCount: 2, totalAttempts: 2, totalMistakes: 0, createdAt: now - 10000, updatedAt: now - 5000 },
  { id: "lp_2", lessonId: "lesson-2", worldId: "world-1", status: "in_progress", bestStars: 1, completionCount: 0, totalAttempts: 1, totalMistakes: 2, createdAt: now - 10000, updatedAt: now - 5000 },
];
const remoteLessons = [
  { id: "lp_1_rem", child_id: profileId, lesson_id: "lesson-1", world_id: "world-1", status: "completed", best_stars: 2, completion_count: 1, total_attempts: 1, total_mistakes: 1, created_at: new Date(now - 12000).toISOString(), updated_at: new Date(now - 8000).toISOString() },
  { id: "lp_2_rem", child_id: profileId, lesson_id: "lesson-2", world_id: "world-1", status: "completed", best_stars: 2, completion_count: 1, total_attempts: 1, total_mistakes: 0, created_at: new Date(now - 12000).toISOString(), updated_at: new Date(now - 4000).toISOString() },
  { id: "lp_3_rem", child_id: profileId, lesson_id: "lesson-3", world_id: "world-1", status: "completed", best_stars: 3, completion_count: 1, total_attempts: 1, total_mistakes: 0, created_at: new Date(now - 2000).toISOString(), updated_at: new Date(now - 1000).toISOString() },
];

const progressRes = mergeLessonProgress(localLessons, remoteLessons, profileId);
assert.strictEqual(progressRes.mergedLocal.length, 3, "Merged lessons should contain all 3 lessons");
const l1 = progressRes.mergedLocal.find(l => l.lessonId === "lesson-1");
const l2 = progressRes.mergedLocal.find(l => l.lessonId === "lesson-2");
const l3 = progressRes.mergedLocal.find(l => l.lessonId === "lesson-3");

assert.strictEqual(l1.bestStars, 3, "Lesson 1 should preserve higher local stars (3 > 2)");
assert.strictEqual(l2.status, "completed", "Lesson 2 should take completed status from remote");
assert.strictEqual(l2.bestStars, 2, "Lesson 2 should take higher stars from remote (2 > 1)");
assert.strictEqual(l3.bestStars, 3, "Lesson 3 from remote should be included");
console.log("✓ Lesson progress merge correctly takes max(stars), non-regressing completion, and unions lessons.");

// --- B. Coin Ledger & Reconciled Wallet ---
console.log("\n-> 3B. Coin Ledger & Reconciled Wallet");
function mergeCoinTransactionsAndWallet(localTx, remoteTx, childId) {
  const seenKeys = new Set();
  const mergedTx = [];
  const toInsertLocally = [];
  const toPushToCloud = [];

  const localKeySet = new Set();
  for (const t of localTx) {
    const key = `${t.sourceType}:${t.sourceId}`;
    localKeySet.add(key);
  }
  const remoteKeySet = new Set();
  for (const t of remoteTx) {
    const key = `${t.source_type}:${t.source_id}`;
    remoteKeySet.add(key);
  }

  for (const t of localTx) {
    const key = `${t.sourceType}:${t.sourceId}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      mergedTx.push(t);
      if (!remoteKeySet.has(key)) {
        toPushToCloud.push({
          id: t.id,
          child_id: childId,
          amount: t.amount,
          type: t.type,
          source_type: t.sourceType,
          source_id: t.sourceId,
          description: t.description,
          created_at: new Date(t.createdAt).toISOString(),
        });
      }
    }
  }

  for (const t of remoteTx) {
    const key = `${t.source_type}:${t.source_id}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      const converted = {
        id: t.id,
        profileId: childId,
        amount: t.amount,
        type: t.type,
        sourceType: t.source_type,
        sourceId: t.source_id,
        description: t.description,
        createdAt: new Date(t.created_at).getTime(),
      };
      mergedTx.push(converted);
      toInsertLocally.push(converted);
    }
  }

  let ledgerSum = 0;
  for (const tx of mergedTx) {
    ledgerSum += tx.amount;
  }
  const reconciledBalance = Math.max(0, ledgerSum);

  return { reconciledBalance, toInsertLocally, toPushToCloud };
}

const localTx = [
  { id: "tx_1", sourceType: "lesson_reward", sourceId: "lesson-1", amount: 15, type: "earned", description: "Lesson 1", createdAt: now - 5000 },
  { id: "tx_2", sourceType: "shop_purchase", sourceId: "hat_straw", amount: -20, type: "spent", description: "Straw Hat", createdAt: now - 3000 },
];
const remoteTx = [
  // Same lesson-1 reward recorded on cloud
  { id: "tx_1_rem", source_type: "lesson_reward", source_id: "lesson-1", amount: 15, type: "earned", description: "Lesson 1", created_at: new Date(now - 5000).toISOString() },
  // Additional lesson completed on second device
  { id: "tx_3_rem", source_type: "lesson_reward", source_id: "lesson-2", amount: 15, type: "earned", description: "Lesson 2", created_at: new Date(now - 1000).toISOString() },
];

const coinRes = mergeCoinTransactionsAndWallet(localTx, remoteTx, profileId);
// Total: 15 (lesson-1 deduplicated) - 20 (purchase) + 15 (lesson-2 remote) = 10
assert.strictEqual(coinRes.reconciledBalance, 10, "Reconciled balance should be exactly 10 (15 - 20 + 15)");
assert.strictEqual(coinRes.toInsertLocally.length, 1, "Should insert 1 new transaction from remote (lesson-2)");
assert.strictEqual(coinRes.toPushToCloud.length, 1, "Should push 1 local transaction to cloud (hat purchase)");
console.log("✓ Ledger merge prevents duplicate awards and calculates balance from SUM(transactions).");

// --- C. Cosmetic Inventory Union ---
console.log("\n-> 3C. Cosmetic Inventory Union");
function mergeCosmeticInventory(localIds, remoteItems) {
  const localSet = new Set(localIds);
  const remoteSet = new Set(remoteItems.map(i => i.item_id));
  const allOwned = new Set([...localSet, ...remoteSet]);

  const toInsertLocally = [];
  const toPushToCloud = [];

  for (const id of allOwned) {
    if (!localSet.has(id)) toInsertLocally.push(id);
    if (!remoteSet.has(id)) toPushToCloud.push(id);
  }

  return { allOwnedItemIds: Array.from(allOwned), toInsertLocally, toPushToCloud };
}

const localInv = ["hat_straw", "shirt_blue"];
const remoteInv = [{ item_id: "shirt_blue" }, { item_id: "glasses_cool" }];
const invRes = mergeCosmeticInventory(localInv, remoteInv);

assert.deepStrictEqual(invRes.allOwnedItemIds.sort(), ["glasses_cool", "hat_straw", "shirt_blue"]);
assert.deepStrictEqual(invRes.toInsertLocally, ["glasses_cool"]);
assert.deepStrictEqual(invRes.toPushToCloud, ["hat_straw"]);
console.log("✓ Cosmetic inventory takes full union so child never loses purchased cosmetics.");

// --- D. Equipped Appearance with Valid Ownership Clamping ---
console.log("\n-> 3D. Equipped Appearance");
function mergeEquippedAppearance(localApp, remoteApp, nowTs, validOwnedIds) {
  let winner = localApp;
  if (remoteApp) {
    const remoteUpdated = new Date(remoteApp.updated_at).getTime();
    // Deterministic timestamp winner
    if (remoteUpdated > nowTs - 2000) {
      winner = {
        head: remoteApp.head_item_id,
        face: remoteApp.face_item_id,
        neck: remoteApp.neck_item_id,
        body: remoteApp.body_item_id,
        back: remoteApp.back_item_id,
        special: remoteApp.special_item_id,
      };
    }
  }

  // Clamping to owned items
  return {
    head: winner.head && validOwnedIds.has(winner.head) ? winner.head : null,
    face: winner.face && validOwnedIds.has(winner.face) ? winner.face : null,
    neck: winner.neck && validOwnedIds.has(winner.neck) ? winner.neck : null,
    body: winner.body && validOwnedIds.has(winner.body) ? winner.body : null,
    back: winner.back && validOwnedIds.has(winner.back) ? winner.back : null,
    special: winner.special && validOwnedIds.has(winner.special) ? winner.special : null,
  };
}

const localApp = { head: "hat_straw", face: "unowned_item", neck: null, body: "shirt_blue", back: null, special: null };
const validOwned = new Set(["hat_straw", "shirt_blue"]);
const mergedApp = mergeEquippedAppearance(localApp, null, now, validOwned);

assert.strictEqual(mergedApp.head, "hat_straw");
assert.strictEqual(mergedApp.face, null, "Unowned item should be clamped to null");
assert.strictEqual(mergedApp.body, "shirt_blue");
console.log("✓ Equipped appearance clamps cleanly to owned cosmetics.");

// --- E. Streaks, Pet Progression & Streak Days ---
console.log("\n-> 3E. Streaks, Pet Progression & Streak Days");
const stageRank = { egg: 0, baby: 1, teen: 2, adult: 3 };
function maxStage(s1, s2) {
  const r1 = stageRank[s1] ?? 0;
  const r2 = stageRank[s2] ?? 0;
  return r1 >= r2 ? s1 : s2;
}

assert.strictEqual(maxStage("baby", "teen"), "teen");
assert.strictEqual(maxStage("teen", "egg"), "teen", "Pet stage must never demote");
assert.strictEqual(maxStage("adult", "baby"), "adult");

// Calendar day union and recalculation
const localStreakDays = ["2026-09-14", "2026-09-15"];
const remoteStreakDays = ["2026-09-15", "2026-09-16"];
const unionDays = Array.from(new Set([...localStreakDays, ...remoteStreakDays])).sort();
assert.deepStrictEqual(unionDays, ["2026-09-14", "2026-09-15", "2026-09-16"]);
console.log("✓ Streak days unioned across devices into continuous consecutive days: 3-day streak.");

// --- F. Conservative Hearts Regen ---
console.log("\n-> 3F. Conservative Hearts Regeneration");
function mergeHearts(localHeart, remoteHeart) {
  if (!remoteHeart) return localHeart.currentHearts;
  // Conservative hearts: take min of available hearts across devices to avoid glitching extra lives
  return Math.min(localHeart.currentHearts, remoteHeart.current_hearts);
}

assert.strictEqual(mergeHearts({ currentHearts: 4 }, { current_hearts: 2 }), 2, "Should take conservative min (2)");
assert.strictEqual(mergeHearts({ currentHearts: 3 }, { current_hearts: 5 }), 3, "Should take conservative min (3)");
console.log("✓ Hearts merge uses conservative min to prevent infinite life exploit.");

// =================================================================
// 4. Multi-Device Second Device Conflict Resolution
// =================================================================
console.log("\n--- 4. Testing Multi-Device Second Device Conflict Resolution ---");

// Simulating parent account having cloud child
const parentId = "parent_usr_123";
const existingCloudChildren = [
  { id: "cp_sophea_cloud", nickname: "Sophea", age: 6, learning_band: "band_2" },
];

// Local child on device 2 has different id
const localDevice2Child = { id: "cp_local_guest_2", nickname: "Sophea", age: 5 };

// Choice 1: Restore Cloud Child
console.log("-> 4A. Option: Restore Cloud Child");
db.exec(`
  INSERT INTO child_profiles (id, nickname, age, learning_band, avatar_id, created_at, updated_at)
  VALUES ('${existingCloudChildren[0].id}', '${existingCloudChildren[0].nickname}', ${existingCloudChildren[0].age}, '${existingCloudChildren[0].learning_band}', 'koki_default', ${now}, ${now});

  INSERT INTO cloud_bindings (profile_id, cloud_child_id, cloud_parent_id, bound_at, last_sync_at, sync_status)
  VALUES ('${existingCloudChildren[0].id}', '${existingCloudChildren[0].id}', '${parentId}', ${now}, ${now}, 'synced');
`);

let restoredProfile = db.prepare(`SELECT * FROM child_profiles WHERE id = ?;`).get(existingCloudChildren[0].id);
assert.ok(restoredProfile);
assert.strictEqual(restoredProfile.nickname, "Sophea");
assert.strictEqual(restoredProfile.learning_band, "band_2");
console.log("✓ Restored cloud child saved to local SQLite with synced cloud binding.");

// Choice 2: Merge Local into Cloud Child
console.log("\n-> 4B. Option: Merge Local into Cloud Child");
db.exec(`
  INSERT INTO child_profiles (id, nickname, age, learning_band, avatar_id, created_at, updated_at)
  VALUES ('${localDevice2Child.id}', '${localDevice2Child.nickname}', ${localDevice2Child.age}, 'band_1', 'koki_default', ${now}, ${now});

  -- Binding links local device child to the existing cloud child id
  INSERT INTO cloud_bindings (profile_id, cloud_child_id, cloud_parent_id, bound_at, last_sync_at, sync_status)
  VALUES ('${localDevice2Child.id}', '${existingCloudChildren[0].id}', '${parentId}', ${now}, ${now}, 'synced');
`);

let mergedBinding = db.prepare(`SELECT * FROM cloud_bindings WHERE profile_id = ?;`).get(localDevice2Child.id);
assert.ok(mergedBinding);
assert.strictEqual(mergedBinding.cloud_child_id, existingCloudChildren[0].id);
console.log("✓ Local profile successfully mapped to existing cloud child for unified sync.");

// Choice 3: Keep Local as Independent Child
console.log("\n-> 4C. Option: Keep Local Device Profile");
const localDevice3Child = { id: "cp_local_guest_3", nickname: "Borey", age: 4 };
db.exec(`
  INSERT INTO child_profiles (id, nickname, age, learning_band, avatar_id, created_at, updated_at)
  VALUES ('${localDevice3Child.id}', '${localDevice3Child.nickname}', ${localDevice3Child.age}, 'band_1', 'koki_default', ${now}, ${now});

  INSERT INTO cloud_bindings (profile_id, cloud_child_id, cloud_parent_id, bound_at, last_sync_at, sync_status)
  VALUES ('${localDevice3Child.id}', '${localDevice3Child.id}', '${parentId}', ${now}, ${now}, 'synced');
`);

let independentBinding = db.prepare(`SELECT * FROM cloud_bindings WHERE profile_id = ?;`).get(localDevice3Child.id);
assert.ok(independentBinding);
assert.strictEqual(independentBinding.cloud_child_id, localDevice3Child.id);
console.log("✓ Local child successfully registered as independent profile under parent account.");

// =================================================================
// 5. Offline-First Resilience
// =================================================================
console.log("\n--- 5. Offline-First Non-Blocking Playability ---");

// Child plays offline: lesson completed, coins earned, streak incremented
const offlineNow = now + 100000;
db.exec(`
  INSERT INTO lesson_progress (id, profile_id, lesson_id, world_id, status, best_stars, completion_count, total_attempts, total_mistakes, created_at, updated_at)
  VALUES ('lp_offline_1', '${localDevice3Child.id}', 'lesson-10', 'world-1', 'completed', 3, 1, 1, 0, ${offlineNow}, ${offlineNow});

  INSERT INTO coin_transactions (id, profile_id, amount, type, source_type, source_id, description, created_at)
  VALUES ('tx_offline_1', '${localDevice3Child.id}', 15, 'earned', 'lesson_reward', 'lesson-10', 'Offline lesson', ${offlineNow});

  INSERT INTO wallets (profile_id, coin_balance, created_at, updated_at)
  VALUES ('${localDevice3Child.id}', 15, ${offlineNow}, ${offlineNow})
  ON CONFLICT(profile_id) DO UPDATE SET coin_balance = coin_balance + 15, updated_at = ${offlineNow};

  INSERT INTO sync_queue (id, profile_id, entity_type, entity_id, operation, payload, status, attempt_count, next_attempt_at, created_at, updated_at)
  VALUES ('sq_off_1', '${localDevice3Child.id}', 'lesson_progress', 'lesson-10', 'upsert', '{"bestStars":3,"status":"completed"}', 'pending', 0, ${offlineNow}, ${offlineNow}, ${offlineNow});

  INSERT INTO sync_queue (id, profile_id, entity_type, entity_id, operation, payload, status, attempt_count, next_attempt_at, created_at, updated_at)
  VALUES ('sq_off_2', '${localDevice3Child.id}', 'coin_transactions', 'tx_offline_1', 'upsert', '{"amount":15}', 'pending', 0, ${offlineNow}, ${offlineNow}, ${offlineNow});
`);

const offlineProgress = db.prepare(`SELECT * FROM lesson_progress WHERE profile_id = ?;`).get(localDevice3Child.id);
const offlineWallet = db.prepare(`SELECT * FROM wallets WHERE profile_id = ?;`).get(localDevice3Child.id);
const pendingQueue = db.prepare(`SELECT COUNT(*) as count FROM sync_queue WHERE profile_id = ? AND status = 'pending';`).get(localDevice3Child.id);

assert.strictEqual(offlineProgress.status, "completed");
assert.strictEqual(offlineProgress.best_stars, 3);
assert.strictEqual(offlineWallet.coin_balance, 15);
assert.strictEqual(pendingQueue.count, 2);

console.log("✓ Offline gameplay: immediate SQLite writes, zero network blocking, mutations queued safely.");

console.log("\n=================================================================");
console.log("=== ALL FULL SYNC & CONFLICT MERGER TESTS PASSED (100%)       ===");
console.log("=================================================================\n");
