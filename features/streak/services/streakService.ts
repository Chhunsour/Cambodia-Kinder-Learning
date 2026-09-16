import { StreakRepository, LearningStreak } from "../../../storage/repositories/streakRepository";
import {
  RecordLessonStreakInput,
  StreakRecordResult,
  StreakPet,
  PetStage,
} from "../types";
import {
  getLocalDateString,
  getDayDifference,
  isSameCalendarDay,
  isConsecutiveCalendarDay,
} from "./dateUtils";
import {
  getPetStageForStreak,
  getMaxStage,
  calculatePetProgress,
  PET_STAGE_DETAILS,
  PET_STAGE_RANKS,
  STREAK_MILESTONES,
} from "./petStageConfig";
import { StreakDaysRepository } from "@/storage/repositories/streakDaysRepository";
import { SyncService } from "@/features/parent/services/syncService";
import { reminderService } from "@/features/notifications";

export const StreakService = {
  /**
   * Qualifies today's completed lesson toward the child's daily streak and companion pet growth.
   *
   * Rules:
   * 1. Same calendar day: Does not increment again.
   * 2. Consecutive calendar day: Increments current streak by 1 and updates longest streak.
   * 3. Missed >= 1 calendar day: Gently restarts current streak at 1 with encouraging phrasing.
   * 4. Pet Growth: Pet advances when milestones are reached and NEVER demotes if streak restarts.
   */
  async recordLessonStreak(input: RecordLessonStreakInput): Promise<StreakRecordResult> {
    const { profileId, referenceDate } = input;
    const todayStr = getLocalDateString(referenceDate || new Date());

    const [existingStreak, existingPet] = await Promise.all([
      StreakRepository.getStreak(profileId),
      StreakRepository.getPetProgress(profileId),
    ]);

    // 1. Check if already qualified today
    if (isSameCalendarDay(existingStreak.lastQualifiedDate, todayStr)) {
      return {
        streakUpdated: false,
        currentStreak: existingStreak.currentStreak,
        longestStreak: existingStreak.longestStreak,
        isNewMilestone: false,
        newMilestone: null,
        petGrew: false,
        newPetStage: null,
        message: "You already kept your streak burning today! Great job!",
      };
    }

    let newCurrentStreak = 1;
    if (isConsecutiveCalendarDay(existingStreak.lastQualifiedDate, todayStr)) {
      newCurrentStreak = existingStreak.currentStreak + 1;
    } else {
      // Missed 1+ days or first time learning
      newCurrentStreak = 1;
    }

    const newLongestStreak = Math.max(existingStreak.longestStreak, newCurrentStreak);
    const newTotalDays = existingStreak.totalQualifiedDays + 1;

    // 2. Pet growth check
    const earnedStageFromStreak = getPetStageForStreak(newCurrentStreak);
    const prevHighestStage = (existingPet.highestStage as PetStage) || "egg";
    const newHighestStage = getMaxStage(earnedStageFromStreak, prevHighestStage);

    const prevRank = PET_STAGE_RANKS[prevHighestStage] ?? 0;
    const newRank = PET_STAGE_RANKS[newHighestStage] ?? 0;
    const petGrew = newRank > prevRank;

    // 3. Milestone check
    const isNewMilestone = (STREAK_MILESTONES as readonly number[]).includes(newCurrentStreak);
    const newMilestone = isNewMilestone ? newCurrentStreak : null;

    // 4. Atomically persist to SQLite
    const updatedStreakData: LearningStreak = {
      profileId,
      currentStreak: newCurrentStreak,
      longestStreak: newLongestStreak,
      lastQualifiedDate: todayStr,
      totalQualifiedDays: newTotalDays,
      createdAt: existingStreak.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    await StreakRepository.saveStreakAndPet(
      updatedStreakData,
      newHighestStage,
      existingPet.currentCompanionId
    );

    // 5. Durable calendar qualification & sync mutations
    await StreakDaysRepository.recordStreakDay(profileId, todayStr);

    // Suppress today's learning reminder since daily goal is complete
    reminderService.onDailyGoalCompleted(profileId).catch(() => {});

    SyncService.enqueueSyncMutation({
      profileId,
      entityType: "streak_days",
      entityId: todayStr,
      operation: "upsert",
      payload: { dayDate: todayStr },
    }).catch(() => {});

    SyncService.enqueueSyncMutation({
      profileId,
      entityType: "learning_streak",
      entityId: profileId,
      operation: "upsert",
      payload: updatedStreakData,
    }).catch(() => {});

    SyncService.enqueueSyncMutation({
      profileId,
      entityType: "streak_pet_progress",
      entityId: profileId,
      operation: "upsert",
      payload: {
        highestStage: newHighestStage,
        companionId: existingPet.currentCompanionId,
      },
    }).catch(() => {});

    return {
      streakUpdated: true,
      currentStreak: newCurrentStreak,
      longestStreak: newLongestStreak,
      isNewMilestone,
      newMilestone,
      petGrew,
      newPetStage: petGrew ? newHighestStage : null,
      message: petGrew
        ? `Your companion grew into a ${PET_STAGE_DETAILS[newHighestStage].titleEn}!`
        : `Streak active: ${newCurrentStreak} day${newCurrentStreak > 1 ? "s" : ""}!`,
    };
  },

  /**
   * Retrieves current learning streak and pet progress presentation model.
   */
  async getStreakAndPet(profileId: string): Promise<{
    streak: LearningStreak;
    pet: StreakPet;
  }> {
    const [streak, petProgress] = await Promise.all([
      StreakRepository.getStreak(profileId),
      StreakRepository.getPetProgress(profileId),
    ]);

    const currentStage = (petProgress.highestStage as PetStage) || "egg";
    const details = PET_STAGE_DETAILS[currentStage];
    const { nextThreshold, progressPercent } = calculatePetProgress(
      streak.currentStreak,
      currentStage
    );

    const pet: StreakPet = {
      profileId,
      currentStage,
      highestStage: currentStage,
      companionId: petProgress.currentCompanionId,
      nextStageThreshold: nextThreshold,
      progressPercent,
      stageTitleEn: details.titleEn,
      stageTitleKm: details.titleKm,
      stageIcon: details.icon,
    };

    return { streak, pet };
  },

  /**
   * Dev helper: Reset streak and pet for a child profile.
   */
  async resetStreakForDev(profileId: string): Promise<void> {
    return StreakRepository.resetStreakForDev(profileId);
  },

  /**
   * Dev helper: Set streak for a child profile.
   */
  async setStreakForDev(
    profileId: string,
    currentStreak: number,
    longestStreak?: number,
    lastDate?: string
  ): Promise<LearningStreak> {
    return StreakRepository.setStreakForDev(profileId, currentStreak, longestStreak, lastDate);
  },

  /**
   * Dev helper: Set pet stage for a child profile.
   */
  async setPetStageForDev(profileId: string, stage: PetStage): Promise<void> {
    await StreakRepository.setPetStageForDev(profileId, stage);
  },
};
