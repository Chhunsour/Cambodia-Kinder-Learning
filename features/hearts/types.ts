import { HeartState, HeartEventSourceType } from "@/storage/repositories/heartRepository";
import { LessonMode } from "@/features/lessons/types";

export type { HeartState, HeartEventSourceType };

export interface HeartRegenCalculation {
  currentHearts: number;
  maxHearts: number;
  newAnchorMs: number;
  heartsEarned: number;
  nextHeartInMs: number | null;
  fullRegenInMs: number | null;
  isFull: boolean;
}

export interface HeartDeductionResult {
  heartDeducted: boolean;
  currentHearts: number;
  maxHearts: number;
  reachedZero: boolean;
  nextHeartInMs: number | null;
  message?: string;
}

export interface HeartRestoreInput {
  profileId: string;
  amount: number;
  source: HeartEventSourceType;
  sourceId?: string;
  now?: number;
}
