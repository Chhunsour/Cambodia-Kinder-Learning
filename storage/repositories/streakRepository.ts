import { getDatabase } from "../database";
import {
  TABLE_LEARNING_STREAKS,
  TABLE_STREAK_PET_PROGRESS,
} from "../database/schema";
import {
  LearningStreakRow,
  StreakPetProgressRow,
} from "../database/types";

export interface LearningStreak {
  profileId: string;
  currentStreak: number;
  longestStreak: number;
  lastQualifiedDate: string | null;
  totalQualifiedDays: number;
  createdAt: number;
  updatedAt: number;
}

export interface StreakPetProgress {
  profileId: string;
  highestStage: string;
  currentCompanionId: string;
  createdAt: number;
  updatedAt: number;
}

function mapRowToStreak(row: LearningStreakRow | null, profileId: string): LearningStreak {
  if (!row) {
    const now = Date.now();
    return {
      profileId,
      currentStreak: 0,
      longestStreak: 0,
      lastQualifiedDate: null,
      totalQualifiedDays: 0,
      createdAt: now,
      updatedAt: now,
    };
  }

  return {
    profileId: row.profile_id,
    currentStreak: row.current_streak,
    longestStreak: row.longest_streak,
    lastQualifiedDate: row.last_qualified_date,
    totalQualifiedDays: row.total_qualified_days,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRowToPetProgress(row: StreakPetProgressRow | null, profileId: string): StreakPetProgress {
  if (!row) {
    const now = Date.now();
    return {
      profileId,
      highestStage: "egg",
      currentCompanionId: "starter_pet",
      createdAt: now,
      updatedAt: now,
    };
  }

  return {
    profileId: row.profile_id,
    highestStage: row.highest_stage,
    currentCompanionId: row.current_companion_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * SQLite Repository for Learning Streaks and Streak Pet Growth.
 * Isolated per child profile, atomic updates, zero UI leak.
 */
export const StreakRepository = {
  /**
   * Get learning streak record for a child profile.
   */
  async getStreak(profileId: string): Promise<LearningStreak> {
    try {
      const db = await getDatabase();
      const row = await db.getFirstAsync<LearningStreakRow>(
        `SELECT * FROM ${TABLE_LEARNING_STREAKS} WHERE profile_id = ?;`,
        [profileId]
      );
      return mapRowToStreak(row, profileId);
    } catch (error) {
      console.warn(`[StreakRepository] Failed to get streak for "${profileId}":`, error);
      return mapRowToStreak(null, profileId);
    }
  },

  /**
   * Get streak pet progress for a child profile.
   */
  async getPetProgress(profileId: string): Promise<StreakPetProgress> {
    try {
      const db = await getDatabase();
      const row = await db.getFirstAsync<StreakPetProgressRow>(
        `SELECT * FROM ${TABLE_STREAK_PET_PROGRESS} WHERE profile_id = ?;`,
        [profileId]
      );
      return mapRowToPetProgress(row, profileId);
    } catch (error) {
      console.warn(`[StreakRepository] Failed to get pet progress for "${profileId}":`, error);
      return mapRowToPetProgress(null, profileId);
    }
  },

  /**
   * Atomically save streak and pet progress together in SQLite.
   */
  async saveStreakAndPet(
    streak: LearningStreak,
    highestStage: string,
    companionId = "starter_pet"
  ): Promise<{ streak: LearningStreak; pet: StreakPetProgress }> {
    const db = await getDatabase();
    const now = Date.now();

    await db.withTransactionAsync(async () => {
      // 1. Upsert learning_streaks
      await db.runAsync(
        `INSERT INTO ${TABLE_LEARNING_STREAKS} (
          profile_id, current_streak, longest_streak, last_qualified_date, total_qualified_days, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(profile_id) DO UPDATE SET
          current_streak = excluded.current_streak,
          longest_streak = excluded.longest_streak,
          last_qualified_date = excluded.last_qualified_date,
          total_qualified_days = excluded.total_qualified_days,
          updated_at = excluded.updated_at;`,
        [
          streak.profileId,
          streak.currentStreak,
          streak.longestStreak,
          streak.lastQualifiedDate,
          streak.totalQualifiedDays,
          streak.createdAt || now,
          now,
        ]
      );

      // 2. Upsert streak_pet_progress
      await db.runAsync(
        `INSERT INTO ${TABLE_STREAK_PET_PROGRESS} (
          profile_id, highest_stage, current_companion_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(profile_id) DO UPDATE SET
          highest_stage = excluded.highest_stage,
          current_companion_id = excluded.current_companion_id,
          updated_at = excluded.updated_at;`,
        [streak.profileId, highestStage, companionId, now, now]
      );
    });

    const [updatedStreak, updatedPet] = await Promise.all([
      this.getStreak(streak.profileId),
      this.getPetProgress(streak.profileId),
    ]);

    return { streak: updatedStreak, pet: updatedPet };
  },

  /**
   * Dev helper: Reset streak and pet progress for a child profile.
   */
  async resetStreakForDev(profileId: string): Promise<void> {
    try {
      const db = await getDatabase();
      await db.withTransactionAsync(async () => {
        await db.runAsync(`DELETE FROM ${TABLE_LEARNING_STREAKS} WHERE profile_id = ?;`, [profileId]);
        await db.runAsync(`DELETE FROM ${TABLE_STREAK_PET_PROGRESS} WHERE profile_id = ?;`, [profileId]);
      });
    } catch (error) {
      console.warn(`[StreakRepository] Failed to reset streak for "${profileId}":`, error);
    }
  },

  /**
   * Dev helper: Set streak to arbitrary values for testing.
   */
  async setStreakForDev(
    profileId: string,
    currentStreak: number,
    longestStreak?: number,
    lastDate?: string
  ): Promise<LearningStreak> {
    const existing = await this.getStreak(profileId);
    const longest = longestStreak ?? Math.max(existing.longestStreak, currentStreak);
    const now = Date.now();

    const streak: LearningStreak = {
      ...existing,
      currentStreak,
      longestStreak: longest,
      lastQualifiedDate: lastDate ?? existing.lastQualifiedDate,
      updatedAt: now,
    };

    const pet = await this.getPetProgress(profileId);
    const res = await this.saveStreakAndPet(streak, pet.highestStage);
    return res.streak;
  },

  /**
   * Dev helper: Set pet stage for testing.
   */
  async setPetStageForDev(profileId: string, stage: string): Promise<StreakPetProgress> {
    const streak = await this.getStreak(profileId);
    const res = await this.saveStreakAndPet(streak, stage);
    return res.pet;
  },
};
