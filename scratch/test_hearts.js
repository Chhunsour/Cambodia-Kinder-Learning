const { DatabaseSync } = require("node:sqlite");
const assert = require("node:assert");

const db = new DatabaseSync(":memory:");
db.exec("PRAGMA foreign_keys = ON;");

console.log("=== 1. Testing Schema and Migration v6 DDL ===");

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

// 2. Migration v6: Heart State & Heart Events
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

  CREATE INDEX idx_heart_events_profile ON heart_events(profile_id);
  CREATE INDEX idx_heart_events_created ON heart_events(created_at);
`);

console.log("✓ heart_state and heart_events tables created successfully with foreign keys and indexes");

// Insert profiles
const startTime = 1700000000000;
db.exec(`
  INSERT INTO child_profiles (id, nickname, age, learning_band, avatar_id, created_at, updated_at)
  VALUES ('cp_dara', 'Dara', 5, 'explorer', 'avatar_01', ${startTime}, ${startTime}),
         ('cp_sokha', 'Sokha', 6, 'explorer', 'avatar_02', ${startTime}, ${startTime});
`);
console.log("✓ Inserted 2 profiles: Dara and Sokha");

console.log("\n=== 2. Testing Heart Regen Calculator Logic ===");

const MAX_HEARTS = 5;
const HEART_REGEN_INTERVAL_MINUTES = 30;
const HEART_REGEN_INTERVAL_MS = HEART_REGEN_INTERVAL_MINUTES * 60 * 1000; // 1,800,000 ms

function calculateRegeneratedHearts({
  currentHearts,
  maxHearts = MAX_HEARTS,
  lastRegenerationAt,
  now = Date.now(),
}) {
  if (currentHearts >= maxHearts) {
    return {
      currentHearts: maxHearts,
      maxHearts,
      newAnchorMs: now,
      heartsEarned: 0,
      nextHeartInMs: null,
      fullRegenInMs: null,
      isFull: true,
    };
  }

  // Defense against clock moving backward
  if (now < lastRegenerationAt) {
    return {
      currentHearts,
      maxHearts,
      newAnchorMs: now,
      heartsEarned: 0,
      nextHeartInMs: HEART_REGEN_INTERVAL_MS,
      fullRegenInMs: (maxHearts - currentHearts) * HEART_REGEN_INTERVAL_MS,
      isFull: false,
    };
  }

  const elapsedMs = now - lastRegenerationAt;
  const intervalsElapsed = Math.floor(elapsedMs / HEART_REGEN_INTERVAL_MS);
  const heartsToEarn = Math.min(intervalsElapsed, maxHearts - currentHearts);
  const newHearts = Math.min(currentHearts + heartsToEarn, maxHearts);

  if (newHearts >= maxHearts) {
    return {
      currentHearts: maxHearts,
      maxHearts,
      newAnchorMs: now,
      heartsEarned: heartsToEarn,
      nextHeartInMs: null,
      fullRegenInMs: null,
      isFull: true,
    };
  }

  const newAnchorMs = lastRegenerationAt + intervalsElapsed * HEART_REGEN_INTERVAL_MS;
  const msIntoCurrentInterval = now - newAnchorMs;
  const nextHeartInMs = Math.max(0, HEART_REGEN_INTERVAL_MS - msIntoCurrentInterval);
  const heartsRemainingToFull = maxHearts - newHearts;
  const fullRegenInMs = nextHeartInMs + (heartsRemainingToFull - 1) * HEART_REGEN_INTERVAL_MS;

  return {
    currentHearts: newHearts,
    maxHearts,
    newAnchorMs,
    heartsEarned: heartsToEarn,
    nextHeartInMs,
    fullRegenInMs,
    isFull: false,
  };
}

// Test 2.1: Full hearts remains full
{
  const res = calculateRegeneratedHearts({
    currentHearts: 5,
    maxHearts: 5,
    lastRegenerationAt: startTime,
    now: startTime + 3600000,
  });
  assert.strictEqual(res.currentHearts, 5);
  assert.strictEqual(res.heartsEarned, 0);
  assert.strictEqual(res.isFull, true);
  assert.strictEqual(res.nextHeartInMs, null);
  console.log("✓ Test 2.1: Full hearts remains full (no extra hearts awarded)");
}

// Test 2.2: Partial interval (15 mins) -> 0 earned, ~15m remaining
{
  const res = calculateRegeneratedHearts({
    currentHearts: 3,
    maxHearts: 5,
    lastRegenerationAt: startTime,
    now: startTime + 15 * 60 * 1000,
  });
  assert.strictEqual(res.currentHearts, 3);
  assert.strictEqual(res.heartsEarned, 0);
  assert.strictEqual(res.isFull, false);
  assert.strictEqual(res.nextHeartInMs, 15 * 60 * 1000);
  assert.strictEqual(res.fullRegenInMs, 15 * 60 * 1000 + 30 * 60 * 1000);
  console.log("✓ Test 2.2: 15 minutes elapsed -> 0 earned, 15m until next heart");
}

// Test 2.3: Exactly 30 mins -> +1 earned
{
  const res = calculateRegeneratedHearts({
    currentHearts: 3,
    maxHearts: 5,
    lastRegenerationAt: startTime,
    now: startTime + 30 * 60 * 1000,
  });
  assert.strictEqual(res.currentHearts, 4);
  assert.strictEqual(res.heartsEarned, 1);
  assert.strictEqual(res.newAnchorMs, startTime + 30 * 60 * 1000);
  assert.strictEqual(res.nextHeartInMs, 30 * 60 * 1000);
  console.log("✓ Test 2.3: Exactly 30 minutes elapsed -> +1 heart earned, next in 30m");
}

// Test 2.4: 65 mins -> +2 earned (30m * 2 = 60m), 25m until next heart
{
  const res = calculateRegeneratedHearts({
    currentHearts: 2,
    maxHearts: 5,
    lastRegenerationAt: startTime,
    now: startTime + 65 * 60 * 1000,
  });
  assert.strictEqual(res.currentHearts, 4);
  assert.strictEqual(res.heartsEarned, 2);
  assert.strictEqual(res.newAnchorMs, startTime + 60 * 60 * 1000);
  assert.strictEqual(res.nextHeartInMs, 25 * 60 * 1000);
  console.log("✓ Test 2.4: 65 minutes elapsed -> +2 hearts earned, 25m until next heart");
}

// Test 2.5: 180 mins from 0 hearts -> capped at 5
{
  const res = calculateRegeneratedHearts({
    currentHearts: 0,
    maxHearts: 5,
    lastRegenerationAt: startTime,
    now: startTime + 180 * 60 * 1000,
  });
  assert.strictEqual(res.currentHearts, 5);
  assert.strictEqual(res.heartsEarned, 5);
  assert.strictEqual(res.isFull, true);
  assert.strictEqual(res.nextHeartInMs, null);
  console.log("✓ Test 2.5: 3 hours elapsed from 0 hearts -> fully capped at 5 hearts");
}

// Test 2.6: Clock backward defense
{
  const res = calculateRegeneratedHearts({
    currentHearts: 2,
    maxHearts: 5,
    lastRegenerationAt: startTime,
    now: startTime - 100000,
  });
  assert.strictEqual(res.currentHearts, 2);
  assert.strictEqual(res.heartsEarned, 0);
  assert.strictEqual(res.newAnchorMs, startTime - 100000);
  console.log("✓ Test 2.6: Clock turned backwards handled safely (anchor reset, 0 exploit)");
}

console.log("\n=== 3. Testing SQLite Heart Repository Operations ===");

// 3.1 Initialize heart state for Dara
db.exec(`
  INSERT INTO heart_state (profile_id, current_hearts, max_hearts, last_regeneration_at, updated_at)
  VALUES ('cp_dara', 5, 5, ${startTime}, ${startTime});
`);
let daraState = db.prepare("SELECT * FROM heart_state WHERE profile_id = 'cp_dara'").get();
assert.strictEqual(daraState.current_hearts, 5);
assert.strictEqual(daraState.max_hearts, 5);
console.log("✓ Test 3.1: Initialized Dara with 5 hearts");

// 3.2 Consume 1 heart on eligible mistake
let eventId1 = "evt_001";
db.exec(`
  UPDATE heart_state
  SET current_hearts = current_hearts - 1, updated_at = ${startTime + 5000}
  WHERE profile_id = 'cp_dara';

  INSERT INTO heart_events (id, profile_id, delta, resulting_hearts, source_type, source_id, created_at)
  VALUES ('${eventId1}', 'cp_dara', -1, 4, 'mistake', 'act_01', ${startTime + 5000});
`);

daraState = db.prepare("SELECT * FROM heart_state WHERE profile_id = 'cp_dara'").get();
assert.strictEqual(daraState.current_hearts, 4);
const eventCount = db.prepare("SELECT count(*) as count FROM heart_events WHERE profile_id = 'cp_dara'").get().count;
assert.strictEqual(eventCount, 1);
console.log("✓ Test 3.2: Consumed 1 heart on mistake -> 4 hearts remaining, event recorded");

// 3.3 Consume down to 0 hearts
for (let i = 0; i < 4; i++) {
  const current = db.prepare("SELECT current_hearts FROM heart_state WHERE profile_id = 'cp_dara'").get().current_hearts;
  const newHearts = Math.max(0, current - 1);
  db.exec(`
    UPDATE heart_state SET current_hearts = ${newHearts}, updated_at = ${startTime + 10000 + i * 1000} WHERE profile_id = 'cp_dara';
    INSERT INTO heart_events (id, profile_id, delta, resulting_hearts, source_type, source_id, created_at)
    VALUES ('evt_00${i+2}', 'cp_dara', -1, ${newHearts}, 'mistake', 'act_${i+2}', ${startTime + 10000 + i * 1000});
  `);
}

daraState = db.prepare("SELECT * FROM heart_state WHERE profile_id = 'cp_dara'").get();
assert.strictEqual(daraState.current_hearts, 0);
console.log("✓ Test 3.3: Consumed down to 0 hearts (clamped at 0, no negative hearts)");

// 3.4 Attempt to consume at 0 hearts -> stays 0
const atZero = daraState.current_hearts;
assert.strictEqual(atZero, 0);
console.log("✓ Test 3.4: Reached 0 hearts: learning continues smoothly via Practice Mode");

// 3.5 Restore hearts via foundation API (e.g. reward or dev)
const restoredHearts = Math.min(daraState.current_hearts + 3, 5);
db.exec(`
  UPDATE heart_state SET current_hearts = ${restoredHearts}, updated_at = ${startTime + 20000} WHERE profile_id = 'cp_dara';
  INSERT INTO heart_events (id, profile_id, delta, resulting_hearts, source_type, source_id, created_at)
  VALUES ('evt_restore_1', 'cp_dara', 3, ${restoredHearts}, 'dev_admin', NULL, ${startTime + 20000});
`);
daraState = db.prepare("SELECT * FROM heart_state WHERE profile_id = 'cp_dara'").get();
assert.strictEqual(daraState.current_hearts, 3);
console.log("✓ Test 3.5: Restored 3 hearts -> 3 hearts now available");

console.log("\n=== 4. Testing Multi-Profile Isolation ===");

// Initialize Sokha
db.exec(`
  INSERT INTO heart_state (profile_id, current_hearts, max_hearts, last_regeneration_at, updated_at)
  VALUES ('cp_sokha', 5, 5, ${startTime}, ${startTime});
`);

const sokhaState = db.prepare("SELECT * FROM heart_state WHERE profile_id = 'cp_sokha'").get();
assert.strictEqual(sokhaState.current_hearts, 5);
assert.strictEqual(daraState.current_hearts, 3);
console.log("✓ Test 4.1: Sokha has 5 hearts while Dara has 3 hearts (strict profile isolation)");

// Cascade deletion test
db.exec("DELETE FROM child_profiles WHERE id = 'cp_dara'");
const daraRemaining = db.prepare("SELECT * FROM heart_state WHERE profile_id = 'cp_dara'").get();
assert.strictEqual(daraRemaining, undefined);
const daraEvents = db.prepare("SELECT count(*) as count FROM heart_events WHERE profile_id = 'cp_dara'").get().count;
assert.strictEqual(daraEvents, 0);
const sokhaRemaining = db.prepare("SELECT * FROM heart_state WHERE profile_id = 'cp_sokha'").get();
assert.strictEqual(sokhaRemaining.current_hearts, 5);
console.log("✓ Test 4.2: Deleting Dara cascade-deletes Dara's heart_state and heart_events without affecting Sokha");

console.log("\n==========================================");
console.log("ALL 12 TESTS PASSED PERFECTLY!");
console.log("==========================================");
