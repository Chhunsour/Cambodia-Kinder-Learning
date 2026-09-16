import type { CoinTransactionType } from "../../storage/database/types";

export type { CoinTransactionType };

export interface CoinWallet {
  profileId: string;
  coinBalance: number;
  createdAt: number;
  updatedAt: number;
}

export interface CoinTransaction {
  id: string;
  profileId: string;
  amount: number;
  type: CoinTransactionType;
  sourceType: string;
  sourceId: string;
  description: string | null;
  createdAt: number;
}

export interface CoinRewardMilestone {
  tier: "star_1" | "star_2" | "star_3";
  coins: number;
  description: string;
}

export interface AwardLessonCoinsInput {
  profileId: string;
  lessonId: string;
  starsEarned: number;
}

export interface CoinRewardResult {
  coinsEarned: number;
  newBalance: number;
  isFirstCompletion: boolean;
  starImprovement: boolean;
  previouslyEarned: number;
  totalLessonCoins: number;
  breakdown: {
    base: number;
    starBonus: number;
  };
}
