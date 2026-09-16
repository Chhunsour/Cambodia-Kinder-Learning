import { Locale, SyncStatus } from "./common";

export type LearningBand = "explorer" | "adventurer" | "champion";

export function deriveLearningBand(age: number): LearningBand {
  if (age <= 5) return "explorer";
  if (age <= 7) return "adventurer";
  return "champion";
}

export interface ChildProfile {
  id: string;
  nickname: string;
  age: number;
  learningBand: LearningBand;
  avatarId: string;
  uiLanguage: Locale;
  onboardingCompleted: boolean;
  isActive?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface CreateChildProfileInput {
  id?: string;
  nickname?: string;
  age: number;
  avatarId: string;
  uiLanguage: Locale;
}
