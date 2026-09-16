import { CoinRewardMilestone } from "../types";

/**
 * Global lesson coin reward rules:
 * - Base completion (1 star): 10 coins
 * - 2-star bonus: +5 coins (total 15)
 * - 3-star bonus: +5 coins (total 20)
 *
 * Replays only reward unearned milestones (e.g. going from 1 star to 3 stars awards 5 + 5 = 10 coins).
 * Replays with equal or fewer stars award 0 coins.
 */
export const LESSON_COIN_CONFIG = {
  SOURCE_TYPE: "lesson_completion",
  MILESTONES: [
    { tier: "star_1" as const, coins: 10, description: "Completed lesson (1 star)" },
    { tier: "star_2" as const, coins: 5, description: "2-Star performance bonus" },
    { tier: "star_3" as const, coins: 5, description: "3-Star mastery bonus" },
  ] as const,
  MAX_COINS_PER_LESSON: 20,
};

/**
 * Returns the milestones eligible for a given star score (1..3).
 */
export function getEligibleMilestonesForStars(stars: number): readonly CoinRewardMilestone[] {
  if (stars <= 0) return [];
  if (stars === 1) return [LESSON_COIN_CONFIG.MILESTONES[0]];
  if (stars === 2) return [LESSON_COIN_CONFIG.MILESTONES[0], LESSON_COIN_CONFIG.MILESTONES[1]];
  return LESSON_COIN_CONFIG.MILESTONES;
}

/**
 * Computes maximum possible coins for a given star rating.
 */
export function getCumulativeCoinsForStars(stars: number): number {
  if (stars <= 0) return 0;
  if (stars === 1) return 10;
  if (stars === 2) return 15;
  return 20;
}
