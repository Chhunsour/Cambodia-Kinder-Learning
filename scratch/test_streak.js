const { DatabaseSync } = require("node:sqlite");

const db = new DatabaseSync(":memory:");
db.exec("PRAGMA foreign_keys = ON;");

console.log("=== 1. Testing Schema and Migration DDL ===");

// Create parent table child_profiles
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

// Migration v5: Learning Streaks
db.exec(`
  CREATE TABLE learning_streaks (
    profile_id TEXT PRIMARY KEY NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
    current_streak INTEGER NOT NULL DEFAULT 0,
    longest_streak INTEGER NOT NULL DEFAULT 0,
    last_qualified_date TEXT,
    total_qualified_days INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX idx_learning_streaks_last_date ON learning_streaks(last_qualified_date);
`);

// Migration v5: Streak Pet Progress
db.exec(`
  CREATE TABLE streak_pet_progress (
    profile_id TEXT PRIMARY KEY NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
    highest_stage TEXT NOT NULL DEFAULT 'egg',
    current_companion_id TEXT NOT NULL DEFAULT 'koki_bird',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
`);

console.log("✓ learning_streaks and streak_pet_progress created successfully with foreign keys and indexes");

// Insert profiles
const now = Date.now();
db.exec(`
  INSERT INTO child_profiles (id, nickname, age, learning_band, avatar_id, created_at, updated_at)
  VALUES ('cp_dara', 'Dara', 5, 'explorer', 'avatar_01', ${now}, ${now}),
         ('cp_sokha', 'Sokha', 6, 'explorer', 'avatar_02', ${now}, ${now});
`);
console.log("✓ Inserted 2 profiles: Dara and Sokha");

console.log("\n=== 2. Testing Date Utility Logic ===");

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDayDifference(dateStr1, dateStr2) {
  const [y1, m1, d1] = dateStr1.split("-").map(Number);
  const [y2, m2, d2] = dateStr2.split("-").map(Number);
  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((utc2 - utc1) / msPerDay);
}

// Assertions on dates
const diffSame = getDayDifference("2026-09-16", "2026-09-16");
if (diffSame !== 0) throw new Error(`Expected diff 0, got ${diffSame}`);

const diffConsec = getDayDifference("2026-09-16", "2026-09-17");
if (diffConsec !== 1) throw new Error(`Expected diff 1, got ${diffConsec}`);

const diffMonth = getDayDifference("2026-02-28", "2026-03-01");
if (diffMonth !== 1) throw new Error(`Expected diff 1 on month boundary, got ${diffMonth}`);

const diffLeap = getDayDifference("2024-02-28", "2024-02-29");
if (diffLeap !== 1) throw new Error(`Expected diff 1 on leap year, got ${diffLeap}`);

const diffYear = getDayDifference("2026-12-31", "2027-01-01");
if (diffYear !== 1) throw new Error(`Expected diff 1 on year boundary, got ${diffYear}`);

const diffMissed = getDayDifference("2026-09-16", "2026-09-18");
if (diffMissed !== 2) throw new Error(`Expected diff 2 for missed day, got ${diffMissed}`);

console.log("✓ Date utilities passed all boundary checks");

console.log("\n=== 3. Testing Pet Stage & Permanence Logic ===");

const PET_STAGE_RANKS = {
  egg: 0,
  hatchling: 1,
  young: 2,
  grown: 3,
  special: 4,
};

function getPetStageForStreak(streak) {
  if (streak >= 30) return "special";
  if (streak >= 14) return "grown";
  if (streak >= 7) return "young";
  if (streak >= 3) return "hatchling";
  return "egg";
}

function getMaxStage(stage1, stage2) {
  const rank1 = PET_STAGE_RANKS[stage1] ?? 0;
  const rank2 = PET_STAGE_RANKS[stage2] ?? 0;
  return rank1 >= rank2 ? stage1 : stage2;
}

if (getPetStageForStreak(0) !== "egg") throw new Error("Expected egg for 0");
if (getPetStageForStreak(3) !== "hatchling") throw new Error("Expected hatchling for 3");
if (getPetStageForStreak(7) !== "young") throw new Error("Expected young for 7");
if (getPetStageForStreak(14) !== "grown") throw new Error("Expected grown for 14");
if (getPetStageForStreak(30) !== "special") throw new Error("Expected special for 30");

if (getMaxStage("egg", "special") !== "special") {
  throw new Error("Permanence failure: special stage was demoted!");
}

console.log("✓ Pet stage thresholds and non-demoting permanence verified");

console.log("\n=== 4. Testing Multi-Day Streak Recording ===");

const STREAK_MILESTONES = [3, 7, 14, 30, 50, 100];

function recordLessonStreak(profileId, referenceDate) {
  const todayStr = getLocalDateString(referenceDate);
  const nowMs = referenceDate.getTime();

  let streakRow = db.prepare("SELECT * FROM learning_streaks WHERE profile_id = ?").get(profileId);
  let petRow = db.prepare("SELECT * FROM streak_pet_progress WHERE profile_id = ?").get(profileId);

  const prevStreak = streakRow ? streakRow.current_streak : 0;
  const prevLongest = streakRow ? streakRow.longest_streak : 0;
  const lastDate = streakRow ? streakRow.last_qualified_date : null;
  const totalDays = streakRow ? streakRow.total_qualified_days : 0;
  const prevHighestStage = petRow ? petRow.highest_stage : "egg";

  if (lastDate === todayStr) {
    return {
      streakUpdated: false,
      currentStreak: prevStreak,
      longestStreak: prevLongest,
      isNewMilestone: false,
      newMilestone: null,
      petGrew: false,
      newPetStage: null,
      message: "Already completed a lesson today!",
    };
  }

  let newStreak = 1;
  if (lastDate !== null) {
    const diff = getDayDifference(lastDate, todayStr);
    if (diff === 1) {
      newStreak = prevStreak + 1;
    } else {
      newStreak = 1;
    }
  }

  const newLongest = Math.max(prevLongest, newStreak);
  const newTotalDays = totalDays + 1;

  const isNewMilestone = STREAK_MILESTONES.includes(newStreak);
  const newMilestone = isNewMilestone ? newStreak : null;

  const earnedStage = getPetStageForStreak(newStreak);
  const newHighestStage = getMaxStage(earnedStage, prevHighestStage);
  const petGrew = (PET_STAGE_RANKS[newHighestStage] ?? 0) > (PET_STAGE_RANKS[prevHighestStage] ?? 0);

  db.exec("BEGIN IMMEDIATE;");
  try {
    if (!streakRow) {
      db.prepare(`
        INSERT INTO learning_streaks (profile_id, current_streak, longest_streak, last_qualified_date, total_qualified_days, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(profileId, newStreak, newLongest, todayStr, newTotalDays, nowMs, nowMs);
    } else {
      db.prepare(`
        UPDATE learning_streaks
        SET current_streak = ?, longest_streak = ?, last_qualified_date = ?, total_qualified_days = ?, updated_at = ?
        WHERE profile_id = ?
      `).run(newStreak, newLongest, todayStr, newTotalDays, nowMs, profileId);
    }

    if (!petRow) {
      db.prepare(`
        INSERT INTO streak_pet_progress (profile_id, highest_stage, current_companion_id, created_at, updated_at)
        VALUES (?, ?, 'koki_bird', ?, ?)
      `).run(profileId, newHighestStage, nowMs, nowMs);
    } else {
      db.prepare(`
        UPDATE streak_pet_progress
        SET highest_stage = ?, updated_at = ?
        WHERE profile_id = ?
      `).run(newHighestStage, nowMs, profileId);
    }

    db.exec("COMMIT;");
  } catch (err) {
    db.exec("ROLLBACK;");
    throw err;
  }

  return {
    streakUpdated: true,
    currentStreak: newStreak,
    longestStreak: newLongest,
    isNewMilestone,
    newMilestone,
    petGrew,
    newPetStage: petGrew ? newHighestStage : null,
    message: newStreak > 1 ? `Streak extended to ${newStreak} days!` : "Streak started!",
  };
}

// Day 1 Lesson 1
const d1_1 = recordLessonStreak("cp_dara", new Date(2026, 8, 1, 9, 0, 0));
if (!d1_1.streakUpdated || d1_1.currentStreak !== 1) throw new Error("Day 1 failed");

// Day 1 Lesson 2 (same day)
const d1_2 = recordLessonStreak("cp_dara", new Date(2026, 8, 1, 16, 0, 0));
if (d1_2.streakUpdated !== false || d1_2.currentStreak !== 1) throw new Error("Same day failed");

// Consecutive days to 30
for (let d = 2; d <= 30; d++) {
  recordLessonStreak("cp_dara", new Date(2026, 8, d, 10, 0, 0));
}

// Day 32 (gap of 2 calendar days)
const d32 = recordLessonStreak("cp_dara", new Date(2026, 9, 2, 10, 0, 0));
if (d32.currentStreak !== 1) throw new Error("Current streak should reset to 1");
if (d32.longestStreak !== 30) throw new Error("Longest streak should stay 30");

const daraPet = db.prepare("SELECT * FROM streak_pet_progress WHERE profile_id = 'cp_dara'").get();
if (daraPet.highest_stage !== "special") throw new Error("Pet was demoted");

console.log("✓ All multi-day and pet permanence assertions passed cleanly");
