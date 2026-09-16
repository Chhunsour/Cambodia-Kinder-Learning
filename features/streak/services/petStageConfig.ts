import { PetStage } from "../types";
export { PetStage };

export const PET_STAGE_RANKS: Record<PetStage, number> = {
  egg: 0,
  hatchling: 1,
  young: 2,
  grown: 3,
  special: 4,
};

export const PET_STAGE_DETAILS: Record<
  PetStage,
  {
    stage: PetStage;
    minStreak: number;
    nextThreshold: number | null;
    titleEn: string;
    titleKm: string;
    icon: string;
    descriptionEn: string;
    descriptionKm: string;
  }
> = {
  egg: {
    stage: "egg",
    minStreak: 0,
    nextThreshold: 3,
    titleEn: "Egg",
    titleKm: "ស៊ុត",
    icon: "🥚",
    descriptionEn: "Your little buddy is resting warmly inside the egg.",
    descriptionKm: "កូនសម្លាញ់របស់អ្នកកំពុងសម្រាកយ៉ាងកក់ក្តៅក្នុងស៊ុត។",
  },
  hatchling: {
    stage: "hatchling",
    minStreak: 3,
    nextThreshold: 7,
    titleEn: "Hatchling",
    titleKm: "កូនទើបញាស់",
    icon: "🐣",
    descriptionEn: "Hooray! The egg hatched into a curious little chick!",
    descriptionKm: "អបអរសាទរ! ស៊ុតបានញាស់ចេញជាកូនសត្វតូចគួរឱ្យស្រឡាញ់!",
  },
  young: {
    stage: "young",
    minStreak: 7,
    nextThreshold: 14,
    titleEn: "Young Buddy",
    titleKm: "កូនសត្វពេញវ័យ",
    icon: "🐥",
    descriptionEn: "Your companion has grown feathers and is full of energy!",
    descriptionKm: "មិត្តតូចរបស់អ្នកដុះរោមស្អាត និងពោរពេញដោយថាមពល!",
  },
  grown: {
    stage: "grown",
    minStreak: 14,
    nextThreshold: 30,
    titleEn: "Grown Companion",
    titleKm: "មិត្តធំដឹងក្តី",
    icon: "🦚",
    descriptionEn: "A magnificent, proud companion flying with Koki!",
    descriptionKm: "មិត្តដ៏អស្ចារ្យដែលហោះហើរជាមួយកូគីយ៉ាងស្រស់ស្អាត!",
  },
  special: {
    stage: "special",
    minStreak: 30,
    nextThreshold: null,
    titleEn: "Celestial Guardian",
    titleKm: "ទេវតាតូចការពារ",
    icon: "🌟",
    descriptionEn: "A magical celestial guardian shining with bright stars!",
    descriptionKm: "ទេវតាតូចដ៏អស្ចារ្យដែលចាំងពន្លឺផ្កាយភ្លឺចែងចាំង!",
  },
};

export const STREAK_MILESTONES = [3, 7, 14, 30, 50, 100] as const;

/**
 * Determine pet stage earned by a current streak number.
 */
export function getPetStageForStreak(streak: number): PetStage {
  if (streak >= 30) return "special";
  if (streak >= 14) return "grown";
  if (streak >= 7) return "young";
  if (streak >= 3) return "hatchling";
  return "egg";
}

/**
 * Compare two stages and return whichever is higher ranked.
 * Used to ensure historical pet progress NEVER demotes.
 */
export function getMaxStage(stage1: PetStage, stage2: PetStage): PetStage {
  const rank1 = PET_STAGE_RANKS[stage1] ?? 0;
  const rank2 = PET_STAGE_RANKS[stage2] ?? 0;
  return rank1 >= rank2 ? stage1 : stage2;
}

/**
 * Compute progress percentage to the next pet stage.
 */
export function calculatePetProgress(currentStreak: number, stage: PetStage): {
  nextThreshold: number | null;
  progressPercent: number;
} {
  const details = PET_STAGE_DETAILS[stage];
  const nextThreshold = details.nextThreshold;

  if (nextThreshold === null) {
    return { nextThreshold: null, progressPercent: 1 };
  }

  const range = nextThreshold - details.minStreak;
  const currentInRange = Math.max(0, currentStreak - details.minStreak);
  const progressPercent = Math.min(1, Math.max(0, currentInRange / range));

  return { nextThreshold, progressPercent };
}
