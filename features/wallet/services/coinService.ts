import { WalletRepository } from "../../../storage/repositories/walletRepository";
import { CreateCoinTransactionDTO } from "../../../storage/database/types";
import {
  AwardLessonCoinsInput,
  CoinRewardResult,
  CoinTransaction,
  CoinWallet,
} from "../types";
import {
  LESSON_COIN_CONFIG,
  getEligibleMilestonesForStars,
} from "./coinRewardConfig";
import { SyncService } from "@/features/parent/services/syncService";

/**
 * High-level business service for Coin Wallet and Lesson Coin Rewards.
 * Orchestrates atomic transactions, prevents duplicates, and keeps balances strictly isolated per profile.
 */
export const CoinService = {
  /**
   * Evaluates and awards coin rewards for completing a lesson.
   *
   * Idempotency guarantee:
   * Each star milestone (star_1: 10 coins, star_2: 5 coins, star_3: 5 coins) is recorded
   * with a unique source_id `${lessonId}_${tier}`.
   * If a child replays and achieves the same or lower stars, 0 coins are awarded.
   * If a child improves stars (e.g. 1 star -> 3 stars), only the remaining unearned milestones are credited.
   */
  async awardLessonCoins(input: AwardLessonCoinsInput): Promise<CoinRewardResult> {
    const { profileId, lessonId, starsEarned } = input;

    if (!profileId || !lessonId || starsEarned <= 0) {
      const balance = profileId ? await WalletRepository.getCoinBalance(profileId) : 0;
      return {
        coinsEarned: 0,
        newBalance: balance,
        isFirstCompletion: false,
        starImprovement: false,
        previouslyEarned: 0,
        totalLessonCoins: 0,
        breakdown: { base: 0, starBonus: 0 },
      };
    }

    // 1. Check existing milestone claims for this profile & lesson
    const existingTier1 = await WalletRepository.hasTransaction(
      profileId,
      LESSON_COIN_CONFIG.SOURCE_TYPE,
      `${lessonId}_star_1`
    );
    const existingTier2 = await WalletRepository.hasTransaction(
      profileId,
      LESSON_COIN_CONFIG.SOURCE_TYPE,
      `${lessonId}_star_2`
    );
    const existingTier3 = await WalletRepository.hasTransaction(
      profileId,
      LESSON_COIN_CONFIG.SOURCE_TYPE,
      `${lessonId}_star_3`
    );

    let previouslyEarned = 0;
    if (existingTier1) previouslyEarned += 10;
    if (existingTier2) previouslyEarned += 5;
    if (existingTier3) previouslyEarned += 5;

    const isFirstCompletion = !existingTier1;

    // 2. Determine which eligible milestones are unearned
    const eligibleMilestones = getEligibleMilestonesForStars(starsEarned);
    const newTransactions: CreateCoinTransactionDTO[] = [];

    let baseEarnedThisSession = 0;
    let starBonusEarnedThisSession = 0;

    for (const milestone of eligibleMilestones) {
      const isAlreadyClaimed =
        (milestone.tier === "star_1" && existingTier1) ||
        (milestone.tier === "star_2" && existingTier2) ||
        (milestone.tier === "star_3" && existingTier3);

      if (!isAlreadyClaimed) {
        newTransactions.push({
          profileId,
          amount: milestone.coins,
          type: "earn",
          sourceType: LESSON_COIN_CONFIG.SOURCE_TYPE,
          sourceId: `${lessonId}_${milestone.tier}`,
          description: `Lesson ${lessonId} - ${milestone.description}`,
        });

        if (milestone.tier === "star_1") {
          baseEarnedThisSession += milestone.coins;
        } else {
          starBonusEarnedThisSession += milestone.coins;
        }
      }
    }

    const coinsEarned = baseEarnedThisSession + starBonusEarnedThisSession;
    const starImprovement = !isFirstCompletion && coinsEarned > 0;

    // 3. Atomically persist ledger transactions and increment wallet balance
    let newBalance: number;
    if (newTransactions.length > 0) {
      newBalance = await WalletRepository.addTransactionWithBalanceUpdate(
        profileId,
        newTransactions
      );

      // 3b. Queue background sync mutations if profile is cloud-bound
      for (const tx of newTransactions) {
        SyncService.enqueueSyncMutation({
          profileId,
          entityType: "coin_transactions",
          entityId: tx.id || `${tx.sourceType}:${tx.sourceId}`,
          operation: "upsert",
          payload: tx,
        }).catch(() => {});
      }

      SyncService.enqueueSyncMutation({
        profileId,
        entityType: "wallet",
        entityId: profileId,
        operation: "upsert",
        payload: { coin_balance: newBalance },
      }).catch(() => {});
    } else {
      newBalance = await WalletRepository.getCoinBalance(profileId);
    }

    return {
      coinsEarned,
      newBalance,
      isFirstCompletion,
      starImprovement,
      previouslyEarned,
      totalLessonCoins: previouslyEarned + coinsEarned,
      breakdown: {
        base: baseEarnedThisSession,
        starBonus: starBonusEarnedThisSession,
      },
    };
  },

  /**
   * Retrieves the current coin balance for a profile.
   */
  async getCoinBalance(profileId: string): Promise<number> {
    return WalletRepository.getCoinBalance(profileId);
  },

  /**
   * Retrieves the wallet model for a profile.
   */
  async getWallet(profileId: string): Promise<CoinWallet> {
    return WalletRepository.getWallet(profileId);
  },

  /**
   * Retrieves the audit ledger transactions for a profile.
   */
  async getCoinTransactions(profileId: string, limit = 50): Promise<CoinTransaction[]> {
    return WalletRepository.getCoinTransactions(profileId, limit);
  },

  /**
   * Dev helper: Reset wallet to 0 coins for testing.
   */
  async resetWalletForDev(profileId: string): Promise<void> {
    return WalletRepository.resetWalletForDev(profileId);
  },

  /**
   * Dev helper: Set wallet balance to arbitrary amount for testing.
   */
  async setBalanceForDev(profileId: string, balance: number): Promise<number> {
    return WalletRepository.setBalanceForDev(profileId, balance);
  },
};
