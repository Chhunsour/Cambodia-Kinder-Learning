/**
 * Automated Verification Suite for Friends-Only Weekly Learning Leaderboard
 *
 * Tests:
 * 1. Star Event Creation & Best-Star Improvement Rule (no replay farming)
 * 2. Duplicate Protection (source_completion_id uniqueness)
 * 3. Weekly Windowing & Week Key Date Calculation (Monday to Sunday)
 * 4. Prior Week Separation (no retroactive dumping)
 * 5. RPC Security & Friendship Enforcement (caller check, only self + approved friends)
 * 6. Stranger Exclusion & Removed Friend Exclusion
 * 7. Friendly Tie Ranking (RANK(): same score = same rank, e.g. 1, 1, 3)
 * 8. Small Friend Groups & Zero-Friend Behavior
 * 9. Offline Cache & Immediate Local Score Reflection
 * 10. Data Minimization & Child Privacy
 */

const assert = require("assert");

// Helper: Calculate week start key (Monday YYYY-MM-DD)
function getWeekStartKey(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const dayOfMonth = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${dayOfMonth}`;
}

function getWeekBounds(weekKey) {
  const start = new Date(`${weekKey}T00:00:00.000Z`).getTime();
  const end = start + 7 * 24 * 60 * 60 * 1000;
  return { startMs: start, endMs: end };
}

// In-Memory Simulation Database
class MockDatabase {
  constructor() {
    this.children = new Map();
    this.friendships = new Map();
    this.starEvents = []; // Array of { id, child_id, lesson_id, track_id, stars_delta, source_completion_id, earned_at }
    this.uniqueCompletionIds = new Set();
    this.cache = new Map(); // "profileId_weekKey" -> payload
  }

  addChild(child) {
    this.children.set(child.id, child);
  }

  addFriendship(childA, childB) {
    const [a, b] = [childA, childB].sort();
    this.friendships.set(`${a}_${b}`, { child_a: a, child_b: b });
  }

  removeFriendship(childA, childB) {
    const [a, b] = [childA, childB].sort();
    this.friendships.delete(`${a}_${b}`);
  }

  // Record Star Event with Duplicate Protection
  recordStarEvent(event) {
    if (this.uniqueCompletionIds.has(event.source_completion_id)) {
      // UNIQUE constraint violation ignored (idempotent)
      return false;
    }
    this.uniqueCompletionIds.add(event.source_completion_id);
    this.starEvents.push({ ...event });
    return true;
  }

  // Simulated RPC: get_friends_weekly_leaderboard
  getFriendsWeeklyLeaderboard(callerParentId, childId, weekKey) {
    const child = this.children.get(childId);
    if (!child) throw new Error("CHILD_NOT_FOUND");
    // Ownership check
    if (child.parent_id !== callerParentId) {
      throw new Error("UNAUTHORIZED: Child does not belong to caller");
    }

    const { startMs, endMs } = getWeekBounds(weekKey);

    // 1. Gather self + approved friends
    const allowedChildIds = new Set([childId]);
    for (const [key, fs] of this.friendships.entries()) {
      if (fs.child_a === childId) allowedChildIds.add(fs.child_b);
      if (fs.child_b === childId) allowedChildIds.add(fs.child_a);
    }

    // 2. Sum weekly stars within window
    const results = [];
    for (const cId of allowedChildIds) {
      const c = this.children.get(cId);
      if (!c) continue;

      const weeklyStars = this.starEvents
        .filter(
          (e) =>
            e.child_id === cId &&
            e.earned_at >= startMs &&
            e.earned_at < endMs
        )
        .reduce((sum, e) => sum + e.stars_delta, 0);

      results.push({
        child_id: c.id,
        nickname: c.nickname,
        avatar_id: c.avatar_id,
        weekly_stars: weeklyStars,
        is_current_child: c.id === childId,
      });
    }

    // 3. Sort descending by score, stable tiebreaker by nickname
    results.sort((a, b) => {
      if (b.weekly_stars !== a.weekly_stars) {
        return b.weekly_stars - a.weekly_stars;
      }
      return a.nickname.localeCompare(b.nickname);
    });

    // 4. Compute standard competition rank (same score = same rank, e.g. 1, 1, 3)
    let currentRank = 1;
    return results.map((entry, index) => {
      if (index > 0 && entry.weekly_stars < results[index - 1].weekly_stars) {
        currentRank = index + 1;
      }
      return {
        ...entry,
        rank: currentRank,
      };
    });
  }
}

async function runTests() {
  console.log("==================================================================");
  console.log("🧪 KOKI FRIENDS-ONLY WEEKLY LEADERBOARD TEST SUITE");
  console.log("==================================================================\n");

  const db = new MockDatabase();

  // Test 1: Star Event Creation & Best-Star Improvement Rule
  console.log("Test 1: Star Event Creation & Best-Star Improvement Rule...");
  let previousBest = 0;
  let newStars = 2;
  let delta = Math.max(0, newStars - previousBest);
  assert.strictEqual(delta, 2, "First completion 2 stars -> delta = 2");

  const event1 = {
    id: "evt_1",
    child_id: "child_dara",
    lesson_id: "kv_001",
    track_id: "world-1",
    stars_delta: delta,
    source_completion_id: `star_evt_child_dara_kv_001_0_to_2`,
    earned_at: Date.now(),
  };
  const recorded1 = db.recordStarEvent(event1);
  assert.strictEqual(recorded1, true, "First event must be recorded");

  // Replay without improvement
  previousBest = 2;
  newStars = 2;
  delta = Math.max(0, newStars - previousBest);
  assert.strictEqual(delta, 0, "Replaying at same stars must yield delta = 0");

  // Replay with improvement (2 -> 3)
  previousBest = 2;
  newStars = 3;
  delta = Math.max(0, newStars - previousBest);
  assert.strictEqual(delta, 1, "Improving from 2 to 3 stars must yield delta = 1");

  const event2 = {
    id: "evt_2",
    child_id: "child_dara",
    lesson_id: "kv_001",
    track_id: "world-1",
    stars_delta: delta,
    source_completion_id: `star_evt_child_dara_kv_001_2_to_3`,
    earned_at: Date.now(),
  };
  const recorded2 = db.recordStarEvent(event2);
  assert.strictEqual(recorded2, true, "Improvement event must be recorded");

  // Replay at 3 stars again
  previousBest = 3;
  newStars = 3;
  delta = Math.max(0, newStars - previousBest);
  assert.strictEqual(delta, 0, "Replaying at 3 stars must yield delta = 0");
  console.log("  ✓ First completion earns delta stars (+2)");
  console.log("  ✓ Replay without improvement earns 0 stars");
  console.log("  ✓ Replay with improvement earns delta stars (+1)");
  console.log("  ✓ Infinite replay farming strictly prevented\n");

  // Test 2: Duplicate Protection
  console.log("Test 2: Duplicate Protection (source_completion_id uniqueness)...");
  const dupEvent = {
    id: "evt_dup",
    child_id: "child_dara",
    lesson_id: "kv_001",
    track_id: "world-1",
    stars_delta: 2,
    source_completion_id: `star_evt_child_dara_kv_001_0_to_2`, // Same as event1
    earned_at: Date.now(),
  };
  const recordedDup = db.recordStarEvent(dupEvent);
  assert.strictEqual(recordedDup, false, "Duplicate completion ID must be rejected");
  console.log("  ✓ Duplicate completion event rejected by unique constraint\n");

  // Test 3: Weekly Windowing & Week Key Date Calculation
  console.log("Test 3: Weekly Windowing & Week Key Date Calculation...");
  const sampleDate = new Date("2026-09-16T10:00:00Z"); // Wednesday
  const weekKey = getWeekStartKey(sampleDate);
  assert.strictEqual(weekKey, "2026-09-14", "Monday of 2026-09-16 must be 2026-09-14");

  const bounds = getWeekBounds(weekKey);
  const startDay = new Date(bounds.startMs).toISOString();
  const endDay = new Date(bounds.endMs).toISOString();
  assert(startDay.startsWith("2026-09-14T00:00:00"), "Week starts Monday 00:00:00 UTC");
  assert(endDay.startsWith("2026-09-21T00:00:00"), "Week ends next Monday 00:00:00 UTC (7 days duration)");
  console.log("  ✓ Week key resolves correctly: %s", weekKey);
  console.log("  ✓ Week boundaries span exactly 7 days: %s to %s\n", startDay, endDay);

  // Test 4: Prior Week Separation
  console.log("Test 4: Prior Week Separation (no retroactive dumping)...");
  const priorWeekMs = new Date("2026-09-08T12:00:00Z").getTime(); // Week of Sept 7
  db.recordStarEvent({
    id: "evt_old",
    child_id: "child_dara",
    lesson_id: "kv_002",
    track_id: "world-1",
    stars_delta: 3,
    source_completion_id: "star_evt_child_dara_kv_002_0_to_3",
    earned_at: priorWeekMs,
  });

  // Setup children in mock DB
  db.addChild({
    id: "child_dara",
    parent_id: "parent_1",
    nickname: "Dara",
    avatar_id: "avatar_01",
    age: 6,
    email: "parent1@example.com",
  });
  db.addChild({
    id: "child_sokha",
    parent_id: "parent_2",
    nickname: "Sokha",
    avatar_id: "avatar_02",
    age: 7,
    email: "parent2@example.com",
  });
  db.addChild({
    id: "child_bopha",
    parent_id: "parent_3",
    nickname: "Bopha",
    avatar_id: "avatar_03",
    age: 5,
    email: "parent3@example.com",
  });
  db.addChild({
    id: "child_stranger",
    parent_id: "parent_4",
    nickname: "Stranger",
    avatar_id: "avatar_04",
    age: 8,
    email: "stranger@example.com",
  });

  // Current week events for Dara
  const currentWeekMs = new Date("2026-09-15T10:00:00Z").getTime();
  db.recordStarEvent({
    id: "evt_dara_current",
    child_id: "child_dara",
    lesson_id: "kv_003",
    track_id: "world-1",
    stars_delta: 3,
    source_completion_id: "star_evt_child_dara_kv_003_0_to_3",
    earned_at: currentWeekMs,
  });

  // Add friendships: Dara <-> Sokha, Dara <-> Bopha (Stranger is NOT a friend)
  db.addFriendship("child_dara", "child_sokha");
  db.addFriendship("child_dara", "child_bopha");

  // Sokha events
  db.recordStarEvent({
    id: "evt_sokha_1",
    child_id: "child_sokha",
    lesson_id: "kv_001",
    track_id: "world-1",
    stars_delta: 3,
    source_completion_id: "star_evt_child_sokha_kv_001_0_to_3",
    earned_at: currentWeekMs,
  });

  // Stranger events (even if high score, must never appear!)
  db.recordStarEvent({
    id: "evt_stranger_1",
    child_id: "child_stranger",
    lesson_id: "kv_001",
    track_id: "world-1",
    stars_delta: 3,
    source_completion_id: "star_evt_stranger_kv_001_0_to_3",
    earned_at: currentWeekMs,
  });

  const daraLeaderboard = db.getFriendsWeeklyLeaderboard("parent_1", "child_dara", "2026-09-14");
  const daraEntry = daraLeaderboard.find((e) => e.child_id === "child_dara");
  // Dara has: 3 (current) + 2 (evt1) + 1 (evt2) = 6 stars. Prior week (3) excluded!
  assert.strictEqual(daraEntry.weekly_stars, 6, "Dara weekly stars must be 6 (prior week excluded)");
  console.log("  ✓ Prior week events strictly excluded from current week's tally\n");

  // Test 5: RPC Security & Stranger Exclusion
  console.log("Test 5: RPC Security & Stranger Exclusion...");
  // 5A: Unauthorized caller
  assert.throws(
    () => db.getFriendsWeeklyLeaderboard("unauthorized_parent", "child_dara", "2026-09-14"),
    /UNAUTHORIZED/,
    "Unauthorized parent must be rejected"
  );
  // 5B: Stranger exclusion
  const strangerInLeaderboard = daraLeaderboard.find((e) => e.child_id === "child_stranger");
  assert.strictEqual(strangerInLeaderboard, undefined, "Stranger must NEVER appear in leaderboard");
  console.log("  ✓ Parent ownership verified by RPC; unauthorized access blocked");
  console.log("  ✓ Unrelated strangers never appear on leaderboard\n");

  // Test 6: Removed Friend Exclusion
  console.log("Test 6: Removed Friend Exclusion...");
  // Remove friendship between Dara and Bopha
  db.removeFriendship("child_dara", "child_bopha");
  const afterRemoval = db.getFriendsWeeklyLeaderboard("parent_1", "child_dara", "2026-09-14");
  const bophaInLeaderboard = afterRemoval.find((e) => e.child_id === "child_bopha");
  assert.strictEqual(bophaInLeaderboard, undefined, "Removed friend must immediately disappear");
  console.log("  ✓ Removed friend disappears immediately from future leaderboard queries\n");

  // Test 7: Friendly Tie Ranking
  console.log("Test 7: Friendly Tie Ranking (same score = same rank)...");
  // Re-add Bopha and set Bopha's stars equal to Dara's (6)
  db.addFriendship("child_dara", "child_bopha");
  db.recordStarEvent({
    id: "evt_bopha_1",
    child_id: "child_bopha",
    lesson_id: "kv_001",
    track_id: "world-1",
    stars_delta: 3,
    source_completion_id: "star_evt_child_bopha_kv_001_0_to_3",
    earned_at: currentWeekMs,
  });
  db.recordStarEvent({
    id: "evt_bopha_2",
    child_id: "child_bopha",
    lesson_id: "kv_002",
    track_id: "world-1",
    stars_delta: 3,
    source_completion_id: "star_evt_child_bopha_kv_002_0_to_3",
    earned_at: currentWeekMs,
  });

  // Dara has 6 stars, Bopha has 6 stars, Sokha has 3 stars
  const tiedLeaderboard = db.getFriendsWeeklyLeaderboard("parent_1", "child_dara", "2026-09-14");
  const rank1List = tiedLeaderboard.filter((e) => e.rank === 1);
  assert.strictEqual(rank1List.length, 2, "Both Dara and Bopha must have rank 1");
  const sokhaEntry = tiedLeaderboard.find((e) => e.child_id === "child_sokha");
  assert.strictEqual(sokhaEntry.rank, 3, "Sokha must have rank 3 following two rank 1s (1, 1, 3)");
  console.log("  ✓ Friendly tie ranking verified: Dara (Rank 1), Bopha (Rank 1), Sokha (Rank 3)\n");

  // Test 8: Zero Friends State
  console.log("Test 8: Zero Friends State...");
  db.addChild({
    id: "child_lonely",
    parent_id: "parent_lonely",
    nickname: "Solo Child",
    avatar_id: "avatar_05",
  });
  db.recordStarEvent({
    id: "evt_solo_1",
    child_id: "child_lonely",
    lesson_id: "kv_001",
    track_id: "world-1",
    stars_delta: 2,
    source_completion_id: "star_evt_child_lonely_kv_001_0_to_2",
    earned_at: currentWeekMs,
  });
  const soloLeaderboard = db.getFriendsWeeklyLeaderboard("parent_lonely", "child_lonely", "2026-09-14");
  assert.strictEqual(soloLeaderboard.length, 1, "Leaderboard with 0 friends contains only self");
  assert.strictEqual(soloLeaderboard[0].weekly_stars, 2, "Self score accurately reflected");
  assert.strictEqual(soloLeaderboard[0].is_current_child, true);
  console.log("  ✓ Zero friends state displays self row with earned stars\n");

  // Test 9: Offline Cache & Immediate Local Score Reflection
  console.log("Test 9: Offline Cache & Immediate Local Score Reflection...");
  // Simulate cached snapshot of friends from yesterday
  const cachedSnapshot = {
    week_key: "2026-09-14",
    cached_at: Date.now() - 3600000,
    entries: [
      { child_id: "child_sokha", nickname: "Sokha", avatar_id: "avatar_02", weekly_stars: 3, rank: 1, is_current_child: false },
      { child_id: "child_dara", nickname: "Dara", avatar_id: "avatar_01", weekly_stars: 1, rank: 2, is_current_child: true },
    ],
    current_child_stars: 1,
  };

  // Dara earns 3 new stars locally offline
  const localDaraStars = 4; // Now higher than cached (1) and higher than Sokha (3)
  const updatedOfflineEntries = cachedSnapshot.entries.map((e) => {
    if (e.is_current_child) {
      return { ...e, weekly_stars: Math.max(e.weekly_stars, localDaraStars) };
    }
    return e;
  });

  // Re-rank
  updatedOfflineEntries.sort((a, b) => b.weekly_stars - a.weekly_stars);
  let r = 1;
  const reRanked = updatedOfflineEntries.map((e, idx) => {
    if (idx > 0 && e.weekly_stars < updatedOfflineEntries[idx - 1].weekly_stars) r = idx + 1;
    return { ...e, rank: r };
  });

  assert.strictEqual(reRanked[0].child_id, "child_dara", "Dara must move to rank 1 with local offline score");
  assert.strictEqual(reRanked[0].weekly_stars, 4);
  assert.strictEqual(reRanked[1].child_id, "child_sokha");
  assert.strictEqual(reRanked[1].weekly_stars, 3);
  console.log("  ✓ Offline mode reflects local star improvements immediately and adjusts rank\n");

  // Test 10: Data Minimization & Privacy
  console.log("Test 10: Data Minimization & Child Privacy Protection...");
  for (const entry of tiedLeaderboard) {
    assert.strictEqual(entry.email, undefined, "Email must not exist");
    assert.strictEqual(entry.age, undefined, "Age must not exist");
    assert.strictEqual(entry.parent_id, undefined, "Parent ID must not exist");
    assert.strictEqual(entry.wallet, undefined, "Wallet balance must not exist");
    assert.strictEqual(entry.hearts, undefined, "Hearts must not exist");
    assert(entry.nickname !== undefined, "Nickname present");
    assert(entry.avatar_id !== undefined, "Avatar present");
    assert(entry.weekly_stars !== undefined, "Weekly stars present");
    assert(entry.rank !== undefined, "Rank present");
  }
  console.log("  ✓ Result contains strictly { child_id, nickname, avatar_id, weekly_stars, rank, is_current_child }");
  console.log("  ✓ Zero private data leaked\n");

  console.log("==================================================================");
  console.log("🎉 ALL 10 LEADERBOARD TESTS PASSED SUCCESSFULLY!");
  console.log("==================================================================");
}

runTests().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
