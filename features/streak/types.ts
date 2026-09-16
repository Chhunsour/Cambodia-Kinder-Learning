import {
  LearningStreak,
  StreakPetProgress,
} from "../../storage/repositories/streakRepository";

export type { LearningStreak, StreakPetProgress };

export type PetStage = "egg" | "hatchling" | "young" | "grown" | "special";

export interface StreakPet {
  profileId: string;
  currentStage: PetStage;
  highestStage: PetStage;
  companionId: string;
  nextStageThreshold: number | null;
  progressPercent: number; // 0 to 1
  stageTitleEn: string;
  stageTitleKm: string;
  stageIcon: string;
}

export interface RecordLessonStreakInput {
  profileId: string;
  /** Optional clock/date injection for deterministic testing */
  referenceDate?: Date;
}

export interface StreakRecordResult {
  streakUpdated: boolean;
  currentStreak: number;
  longestStreak: number;
  isNewMilestone: boolean;
  newMilestone: number | null;
  petGrew: boolean;
  newPetStage: PetStage | null;
  message: string;
}
