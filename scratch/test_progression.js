const { DatabaseSync } = require("node:sqlite");

const db = new DatabaseSync(":memory:");
db.exec("PRAGMA foreign_keys = ON;");

// 1. Create tables as defined in schema.ts
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

db.exec(`
  CREATE TABLE lesson_progress (
    id TEXT PRIMARY KEY NOT NULL,
    profile_id TEXT NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
    lesson_id TEXT NOT NULL,
    world_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'completed',
    best_stars INTEGER NOT NULL DEFAULT 1,
    completion_count INTEGER NOT NULL DEFAULT 1,
    total_attempts INTEGER NOT NULL DEFAULT 1,
    total_mistakes INTEGER NOT NULL DEFAULT 0,
    first_completed_at INTEGER NOT NULL,
    last_completed_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE(profile_id, lesson_id)
  );
`);

console.log("✓ Migration v1 and v2 DDL executed cleanly");

// 2. Insert two distinct child profiles: Dara and Sokha
const now = Date.now();
db.exec(`
  INSERT INTO child_profiles (id, nickname, age, learning_band, avatar_id, created_at, updated_at)
  VALUES ('cp_dara', 'Dara', 5, 'explorer', 'avatar_01', ${now}, ${now}),
         ('cp_sokha', 'Sokha', 6, 'explorer', 'avatar_02', ${now}, ${now});
`);

console.log("✓ Inserted 2 child profiles: Dara and Sokha");

// Helper simulating upsert from LessonProgressRepository
function upsertProgress({ profileId, lessonId, worldId, stars, attempts = 1, mistakes = 0 }) {
  const existing = db.prepare("SELECT * FROM lesson_progress WHERE profile_id = ? AND lesson_id = ?").get(profileId, lessonId);
  const prevBest = existing ? existing.best_stars : 0;
  const newBest = Math.max(prevBest, stars);
  const count = existing ? existing.completion_count + 1 : 1;
  const totAttempts = existing ? existing.total_attempts + attempts : attempts;
  const totMistakes = existing ? existing.total_mistakes + mistakes : mistakes;
  const firstCompleted = existing ? existing.first_completed_at : Date.now();
  const lastCompleted = Date.now();
  const id = existing ? existing.id : `lp_${Date.now()}_${Math.random()}`;

  db.prepare(`
    INSERT INTO lesson_progress (
      id, profile_id, lesson_id, world_id, status, best_stars,
      completion_count, total_attempts, total_mistakes,
      first_completed_at, last_completed_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 'completed', ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(profile_id, lesson_id) DO UPDATE SET
      best_stars = MAX(lesson_progress.best_stars, excluded.best_stars),
      completion_count = excluded.completion_count,
      total_attempts = excluded.total_attempts,
      total_mistakes = excluded.total_mistakes,
      last_completed_at = excluded.last_completed_at,
      updated_at = excluded.updated_at;
  `).run(id, profileId, lessonId, worldId, newBest, count, totAttempts, totMistakes, firstCompleted, lastCompleted, now, lastCompleted);

  return db.prepare("SELECT * FROM lesson_progress WHERE profile_id = ? AND lesson_id = ?").get(profileId, lessonId);
}

// 3. Test Dara completes Lesson 1 with 1 star
const r1 = upsertProgress({ profileId: "cp_dara", lessonId: "kv_001", worldId: "world-1", stars: 1, attempts: 2, mistakes: 2 });
if (r1.best_stars !== 1 || r1.completion_count !== 1) {
  throw new Error(`Expected best_stars 1, completion_count 1, got ${JSON.stringify(r1)}`);
}
console.log("✓ Dara completed Lesson 1 with 1 star. Row saved.");

// 4. Test Profile Isolation: Sokha has 0 records
const sokhaRecords = db.prepare("SELECT * FROM lesson_progress WHERE profile_id = 'cp_sokha'").all();
if (sokhaRecords.length !== 0) {
  throw new Error("Sokha should have 0 progress records!");
}
console.log("✓ Profile Isolation verified: Sokha has 0 records.");

// 5. Test Replay with Higher Score: Dara completes Lesson 1 with 3 stars
const r2 = upsertProgress({ profileId: "cp_dara", lessonId: "kv_001", worldId: "world-1", stars: 3, attempts: 1, mistakes: 0 });
if (r2.best_stars !== 3 || r2.completion_count !== 2) {
  throw new Error(`Expected best_stars 3, completion_count 2, got ${JSON.stringify(r2)}`);
}
console.log("✓ Dara replayed Lesson 1 with 3 stars: best_stars updated to 3, completion_count = 2.");

// 6. Test Replay with Lower Score: Dara completes Lesson 1 with 1 star
const r3 = upsertProgress({ profileId: "cp_dara", lessonId: "kv_001", worldId: "world-1", stars: 1, attempts: 3, mistakes: 3 });
if (r3.best_stars !== 3 || r3.completion_count !== 3) {
  throw new Error(`Expected best_stars to remain 3, completion_count 3, got ${JSON.stringify(r3)}`);
}
console.log("✓ Best-Star Rule verified: Replay with 1 star preserved best_stars at 3, completion_count = 3.");

// 7. Test Total Stars (No duplication on replays)
upsertProgress({ profileId: "cp_dara", lessonId: "kv_002", worldId: "world-1", stars: 2 });
const allDara = db.prepare("SELECT * FROM lesson_progress WHERE profile_id = 'cp_dara'").all();
const totalStars = allDara.reduce((sum, r) => sum + r.best_stars, 0);
if (totalStars !== 5) {
  throw new Error(`Expected total stars 5 (3 + 2), got ${totalStars}`);
}
console.log(`✓ Total Stars verified: ${totalStars} stars (no duplication from replay).`);

// 8. Test Cascade Deletion: Deleting Dara removes progress
db.prepare("DELETE FROM child_profiles WHERE id = 'cp_dara'").run();
const remainingProgress = db.prepare("SELECT * FROM lesson_progress WHERE profile_id = 'cp_dara'").all();
if (remainingProgress.length !== 0) {
  throw new Error("Expected cascade delete to remove all lesson progress for Dara");
}
console.log("✓ Foreign key ON DELETE CASCADE verified: Dara's progress cleanly removed.");

console.log("\nALL PROGRESSION SQL TESTS PASSED SUCCESSFULLY! 🎉");
