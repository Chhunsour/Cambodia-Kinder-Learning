import {
  CloudChild,
  CloudLessonProgress,
  CloudWallet,
  CloudCoinTransaction,
  CloudCosmeticItem,
  CloudEquippedAppearance,
  CloudLearningStreak,
  CloudStreakPetProgress,
  CloudHeartState,
  CloudStreakDay,
} from "@/lib/supabase/types";
import { LessonProgress } from "@/storage/repositories/lessonProgressRepository";
import { CoinWallet, CoinTransaction } from "@/storage/repositories/walletRepository";
import { KokiAppearance } from "@/storage/repositories/wardrobeRepository";
import { LearningStreak } from "@/storage/repositories/streakRepository";
import { HeartState } from "@/storage/repositories/heartRepository";
import { ChildProfile } from "@/types/user";
import { calculateRegeneratedHearts } from "@/features/hearts/services/heartRegenCalculator";
import {
  getPetStageForStreak,
  getMaxStage,
  PetStage,
} from "@/features/streak/services/petStageConfig";
import {
  isSameCalendarDay,
  isConsecutiveCalendarDay,
  getLocalDateString,
} from "@/features/streak/services/dateUtils";

export interface LessonProgressMergeResult {
  mergedLocal: LessonProgress[];
  toPushToCloud: CloudLessonProgress[];
}

export interface CoinMergeResult {
  reconciledBalance: number;
  toInsertLocally: CoinTransaction[];
  toPushToCloud: CloudCoinTransaction[];
}

export interface InventoryMergeResult {
  allOwnedItemIds: string[];
  toInsertLocally: string[];
  toPushToCloud: string[];
}

export interface StreakMergeResult {
  mergedStreak: LearningStreak;
  mergedPetStage: PetStage;
  allStreakDays: string[];
  daysToInsertLocally: string[];
  daysToPushToCloud: string[];
  needsCloudStreakUpdate: boolean;
}

export interface HeartMergeResult {
  mergedHeartState: HeartState;
  needsCloudHeartUpdate: boolean;
}

/**
 * Pure conflict resolution algorithms for Koki sync.
 * Implements strict, non-destructive business rules per entity.
 */
export const SyncConflictMerger = {
  /**
   * Lesson Progress: Highest progress wins.
   * best_stars = max(local, remote)
   * completion_count = max(local, remote)
   * status: 'completed' never regresses.
   */
  mergeLessonProgress(
    localList: LessonProgress[],
    remoteList: CloudLessonProgress[],
    childId: string
  ): LessonProgressMergeResult {
    const localMap = new Map<string, LessonProgress>();
    for (const item of localList) {
      localMap.set(item.lessonId, item);
    }

    const remoteMap = new Map<string, CloudLessonProgress>();
    for (const item of remoteList) {
      remoteMap.set(item.lesson_id, item);
    }

    const allLessonIds = new Set([...localMap.keys(), ...remoteMap.keys()]);
    const mergedLocal: LessonProgress[] = [];
    const toPushToCloud: CloudLessonProgress[] = [];

    for (const lessonId of allLessonIds) {
      const local = localMap.get(lessonId);
      const remote = remoteMap.get(lessonId);

      if (local && !remote) {
        // Only exists locally -> keep local, push to cloud
        mergedLocal.push(local);
        toPushToCloud.push({
          id: local.id,
          child_id: childId,
          lesson_id: local.lessonId,
          world_id: local.worldId,
          status: local.status,
          best_stars: local.bestStars,
          completion_count: local.completionCount,
          total_attempts: local.totalAttempts,
          total_mistakes: local.totalMistakes,
          first_completed_at: local.firstCompletedAt
            ? new Date(local.firstCompletedAt).toISOString()
            : null,
          last_completed_at: local.lastCompletedAt
            ? new Date(local.lastCompletedAt).toISOString()
            : null,
          created_at: new Date(local.createdAt).toISOString(),
          updated_at: new Date(local.updatedAt).toISOString(),
        });
      } else if (!local && remote) {
        // Only exists in cloud -> adopt locally
        const firstCompletedAt = remote.first_completed_at
          ? new Date(remote.first_completed_at).getTime()
          : 0;
        const lastCompletedAt = remote.last_completed_at
          ? new Date(remote.last_completed_at).getTime()
          : 0;

        mergedLocal.push({
          id: remote.id,
          profileId: childId,
          lessonId: remote.lesson_id,
          worldId: remote.world_id,
          status: remote.status as LessonProgress["status"],
          bestStars: (remote.best_stars || 1) as 1 | 2 | 3,
          completionCount: remote.completion_count || 1,
          totalAttempts: remote.total_attempts || 1,
          totalMistakes: remote.total_mistakes || 0,
          firstCompletedAt,
          lastCompletedAt,
          createdAt: new Date(remote.created_at).getTime(),
          updatedAt: new Date(remote.updated_at).getTime(),
        });
      } else if (local && remote) {
        // Exists in both -> Merge by strongest learning progress
        const isCompleted = local.status === "completed" || remote.status === "completed";
        const bestStars = Math.max(local.bestStars, remote.best_stars || 0) as 1 | 2 | 3;
        const completionCount = Math.max(local.completionCount, remote.completion_count || 0);
        const totalAttempts = Math.max(local.totalAttempts, remote.total_attempts || 0);
        const totalMistakes = Math.min(local.totalMistakes, remote.total_mistakes ?? local.totalMistakes);

        const remoteFirst = remote.first_completed_at
          ? new Date(remote.first_completed_at).getTime()
          : 0;
        const remoteLast = remote.last_completed_at
          ? new Date(remote.last_completed_at).getTime()
          : 0;

        const firstCompletedAt =
          local.firstCompletedAt > 0 && remoteFirst > 0
            ? Math.min(local.firstCompletedAt, remoteFirst)
            : local.firstCompletedAt || remoteFirst;

        const lastCompletedAt = Math.max(local.lastCompletedAt, remoteLast);
        const updatedAt = Math.max(
          local.updatedAt,
          new Date(remote.updated_at).getTime(),
          Date.now()
        );

        const mergedRecord: LessonProgress = {
          id: local.id,
          profileId: childId,
          lessonId,
          worldId: local.worldId || remote.world_id,
          status: isCompleted ? "completed" : "unlocked",
          bestStars,
          completionCount,
          totalAttempts,
          totalMistakes,
          firstCompletedAt,
          lastCompletedAt,
          createdAt: Math.min(local.createdAt, new Date(remote.created_at).getTime()),
          updatedAt,
        };

        mergedLocal.push(mergedRecord);

        // If local had stronger progress than cloud, enqueue cloud update
        if (
          local.bestStars > remote.best_stars ||
          local.completionCount > remote.completion_count ||
          (local.status === "completed" && remote.status !== "completed")
        ) {
          toPushToCloud.push({
            id: local.id,
            child_id: childId,
            lesson_id: lessonId,
            world_id: mergedRecord.worldId,
            status: mergedRecord.status,
            best_stars: mergedRecord.bestStars,
            completion_count: mergedRecord.completionCount,
            total_attempts: mergedRecord.totalAttempts,
            total_mistakes: mergedRecord.totalMistakes,
            first_completed_at: mergedRecord.firstCompletedAt
              ? new Date(mergedRecord.firstCompletedAt).toISOString()
              : null,
            last_completed_at: mergedRecord.lastCompletedAt
              ? new Date(mergedRecord.lastCompletedAt).toISOString()
              : null,
            created_at: new Date(mergedRecord.createdAt).toISOString(),
            updated_at: new Date(mergedRecord.updatedAt).toISOString(),
          });
        }
      }
    }

    return { mergedLocal, toPushToCloud };
  },

  /**
   * Wallet & Coin Transactions: Ledger is source of truth.
   * Syncs unique transactions and recalculates balance from sum of transactions.
   * Prevents duplicate milestone reward coins across devices.
   */
  mergeCoinTransactionsAndWallet(
    localTx: CoinTransaction[],
    remoteTx: CloudCoinTransaction[],
    childId: string
  ): CoinMergeResult {
    // Unique key: sourceType + ":" + sourceId
    const localMap = new Map<string, CoinTransaction>();
    for (const tx of localTx) {
      localMap.set(`${tx.sourceType}:${tx.sourceId}`, tx);
    }

    const remoteMap = new Map<string, CloudCoinTransaction>();
    for (const tx of remoteTx) {
      remoteMap.set(`${tx.source_type}:${tx.source_id}`, tx);
    }

    const allKeys = new Set([...localMap.keys(), ...remoteMap.keys()]);
    const toInsertLocally: CoinTransaction[] = [];
    const toPushToCloud: CloudCoinTransaction[] = [];
    let reconciledBalance = 0;

    for (const key of allKeys) {
      const local = localMap.get(key);
      const remote = remoteMap.get(key);

      if (local && !remote) {
        // Exists locally only -> queue to cloud
        reconciledBalance += local.amount;
        toPushToCloud.push({
          id: local.id,
          child_id: childId,
          amount: local.amount,
          type: local.type,
          source_type: local.sourceType,
          source_id: local.sourceId,
          description: local.description,
          created_at: new Date(local.createdAt).toISOString(),
        });
      } else if (!local && remote) {
        // Exists in cloud only -> insert locally
        reconciledBalance += remote.amount;
        toInsertLocally.push({
          id: remote.id,
          profileId: childId,
          amount: remote.amount,
          type: remote.type as CoinTransaction["type"],
          sourceType: remote.source_type,
          sourceId: remote.source_id,
          description: remote.description ?? null,
          createdAt: new Date(remote.created_at).getTime(),
        });
      } else if (local && remote) {
        // Exists in both -> only count once!
        reconciledBalance += local.amount;
      }
    }

    // Safety guard: balance cannot be negative
    reconciledBalance = Math.max(0, reconciledBalance);

    return {
      reconciledBalance,
      toInsertLocally,
      toPushToCloud,
    };
  },

  /**
   * Cosmetic Inventory: Union of owned item IDs.
   * If an item is owned on Device A or Device B, it is owned after merge.
   */
  mergeCosmeticInventory(
    localOwnedIds: string[],
    remoteItems: CloudCosmeticItem[]
  ): InventoryMergeResult {
    const localSet = new Set(localOwnedIds);
    const remoteSet = new Set(remoteItems.map((r) => r.item_id));

    const allOwnedItemIds = Array.from(new Set([...localOwnedIds, ...remoteSet]));
    const toInsertLocally: string[] = [];
    const toPushToCloud: string[] = [];

    for (const rItem of remoteItems) {
      if (!localSet.has(rItem.item_id)) {
        toInsertLocally.push(rItem.item_id);
      }
    }

    for (const lId of localOwnedIds) {
      if (!remoteSet.has(lId)) {
        toPushToCloud.push(lId);
      }
    }

    return {
      allOwnedItemIds,
      toInsertLocally,
      toPushToCloud,
    };
  },

  /**
   * Equipped Cosmetics: Deterministic newer timestamp winner per category.
   * Slots must be valid owned items from unioned inventory.
   */
  mergeEquippedAppearance(
    local: KokiAppearance,
    remote: CloudEquippedAppearance | null,
    localUpdatedAt: number,
    validOwnedIds: Set<string>
  ): KokiAppearance {
    if (!remote) return local;

    const remoteUpdatedAt = remote.updated_at
      ? new Date(remote.updated_at).getTime()
      : 0;

    // Newer timestamp wins
    const candidate: KokiAppearance =
      remoteUpdatedAt > localUpdatedAt
        ? {
            head: remote.head_item_id || null,
            face: remote.face_item_id || null,
            neck: remote.neck_item_id || null,
            body: remote.body_item_id || null,
            back: remote.back_item_id || null,
            special: remote.special_item_id || null,
          }
        : local;

    // Validate that equipped items are actually owned
    return {
      head: candidate.head && validOwnedIds.has(candidate.head) ? candidate.head : null,
      face: candidate.face && validOwnedIds.has(candidate.face) ? candidate.face : null,
      neck: candidate.neck && validOwnedIds.has(candidate.neck) ? candidate.neck : null,
      body: candidate.body && validOwnedIds.has(candidate.body) ? candidate.body : null,
      back: candidate.back && validOwnedIds.has(candidate.back) ? candidate.back : null,
      special: candidate.special && validOwnedIds.has(candidate.special) ? candidate.special : null,
    };
  },

  /**
   * Streaks & Streak Pet:
   * Uses union of qualifying calendar days in streak_days.
   * Recomputes consecutive longest streak and current streak deterministically.
   * Streak Pet stage never demotes.
   */
  mergeStreaksAndPet(
    localStreak: LearningStreak,
    remoteStreak: CloudLearningStreak | null,
    localDays: string[],
    remoteDays: string[],
    localPetStage: string,
    remotePetStage: string | null,
    todayStr: string = getLocalDateString(new Date())
  ): StreakMergeResult {
    // 1. Union qualifying calendar days
    const localDaySet = new Set(localDays);
    const remoteDaySet = new Set(remoteDays);
    const allDaySet = new Set([...localDays, ...remoteDays]);

    // If last_qualified_date from summary exists, include it as well
    if (localStreak.lastQualifiedDate) allDaySet.add(localStreak.lastQualifiedDate);
    if (remoteStreak?.last_qualified_date) allDaySet.add(remoteStreak.last_qualified_date);

    const allStreakDays = Array.from(allDaySet).sort(); // chronological sort YYYY-MM-DD

    const daysToInsertLocally = allStreakDays.filter((d) => !localDaySet.has(d));
    const daysToPushToCloud = allStreakDays.filter((d) => !remoteDaySet.has(d));

    // 2. Recompute consecutive longest streak across all recorded days
    let maxConsecutive = 0;
    let runningConsecutive = 0;
    let prevDate: string | null = null;

    for (const d of allStreakDays) {
      if (!prevDate) {
        runningConsecutive = 1;
      } else if (isConsecutiveCalendarDay(prevDate, d)) {
        runningConsecutive += 1;
      } else if (!isSameCalendarDay(prevDate, d)) {
        runningConsecutive = 1;
      }
      if (runningConsecutive > maxConsecutive) {
        maxConsecutive = runningConsecutive;
      }
      prevDate = d;
    }

    // Longest streak is maximum of calculated, local, and remote
    const longestStreak = Math.max(
      maxConsecutive,
      localStreak.longestStreak || 0,
      remoteStreak?.longest_streak || 0
    );

    // 3. Recompute current streak relative to today
    let currentStreak = 0;
    if (allStreakDays.length > 0) {
      const lastDate = allStreakDays[allStreakDays.length - 1];
      if (isSameCalendarDay(lastDate, todayStr)) {
        // Today qualified: count backwards
        currentStreak = 1;
        let curr = lastDate;
        for (let i = allStreakDays.length - 2; i >= 0; i--) {
          if (isConsecutiveCalendarDay(allStreakDays[i], curr)) {
            currentStreak += 1;
            curr = allStreakDays[i];
          } else {
            break;
          }
        }
      } else if (isConsecutiveCalendarDay(lastDate, todayStr)) {
        // Yesterday was last qualified: streak is alive for today
        currentStreak = 1;
        let curr = lastDate;
        for (let i = allStreakDays.length - 2; i >= 0; i--) {
          if (isConsecutiveCalendarDay(allStreakDays[i], curr)) {
            currentStreak += 1;
            curr = allStreakDays[i];
          } else {
            break;
          }
        }
      } else {
        // Missed >= 1 full day
        currentStreak = 0;
      }
    }

    const totalQualifiedDays = allStreakDays.length;
    const lastQualifiedDate =
      allStreakDays.length > 0 ? allStreakDays[allStreakDays.length - 1] : null;

    // 4. Pet Stage: never demote
    const earnedStage = getPetStageForStreak(currentStreak);
    const prevMax = getMaxStage(
      (localPetStage as PetStage) || "egg",
      (remotePetStage as PetStage) || "egg"
    );
    const mergedPetStage = getMaxStage(prevMax, earnedStage);

    const mergedStreak: LearningStreak = {
      profileId: localStreak.profileId,
      currentStreak,
      longestStreak,
      lastQualifiedDate,
      totalQualifiedDays,
      createdAt: localStreak.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    const needsCloudStreakUpdate =
      !remoteStreak ||
      mergedStreak.currentStreak !== remoteStreak.current_streak ||
      mergedStreak.longestStreak !== remoteStreak.longest_streak ||
      mergedStreak.totalQualifiedDays !== remoteStreak.total_qualified_days ||
      mergedStreak.lastQualifiedDate !== remoteStreak.last_qualified_date;

    return {
      mergedStreak,
      mergedPetStage,
      allStreakDays,
      daysToInsertLocally,
      daysToPushToCloud,
      needsCloudStreakUpdate,
    };
  },

  /**
   * Hearts: Conservative merge favoring safety.
   * Computes regenerated hearts on both sides, picks min(local, remote)
   * so heart loss on one device is not erased by another.
   */
  mergeHearts(
    local: HeartState,
    remote: CloudHeartState | null,
    now: number = Date.now()
  ): HeartMergeResult {
    if (!remote) {
      return { mergedHeartState: local, needsCloudHeartUpdate: true };
    }

    const localRegen = calculateRegeneratedHearts({
      currentHearts: local.currentHearts,
      maxHearts: local.maxHearts,
      lastRegenerationAt: local.lastRegenerationAt,
      now,
    });

    const remoteLastRegenAt = remote.last_regeneration_at
      ? new Date(remote.last_regeneration_at).getTime()
      : now;

    const remoteRegen = calculateRegeneratedHearts({
      currentHearts: remote.current_hearts,
      maxHearts: remote.max_hearts,
      lastRegenerationAt: remoteLastRegenAt,
      now,
    });

    // Conservative valid state: lower regenerated heart count wins
    const mergedCurrent = Math.min(localRegen.currentHearts, remoteRegen.currentHearts);
    const mergedMax = Math.max(local.maxHearts, remote.max_hearts);

    // Pick anchor matching the conservative count
    let mergedAnchor = localRegen.newAnchorMs;
    if (remoteRegen.currentHearts < localRegen.currentHearts) {
      mergedAnchor = remoteRegen.newAnchorMs;
    }

    const mergedHeartState: HeartState = {
      profileId: local.profileId,
      currentHearts: mergedCurrent,
      maxHearts: mergedMax,
      lastRegenerationAt: mergedAnchor,
      createdAt: local.createdAt,
      updatedAt: now,
    };

    const needsCloudHeartUpdate =
      mergedCurrent !== remote.current_hearts ||
      mergedMax !== remote.max_hearts ||
      mergedAnchor !== remoteLastRegenAt;

    return {
      mergedHeartState,
      needsCloudHeartUpdate,
    };
  },

  /**
   * Child Profile: Newer updated_at wins for nickname, avatar, age, ui_language.
   */
  mergeChildProfile(local: ChildProfile, remote: CloudChild): ChildProfile {
    const remoteUpdated = remote.updated_at ? new Date(remote.updated_at).getTime() : 0;
    if (remoteUpdated > local.updatedAt) {
      return {
        ...local,
        nickname: remote.nickname || local.nickname,
        avatarId: remote.avatar_id || local.avatarId,
        age: remote.age || local.age,
        learningBand: (remote.learning_band as ChildProfile["learningBand"]) || local.learningBand,
        uiLanguage: (remote.ui_language as ChildProfile["uiLanguage"]) || local.uiLanguage,
        updatedAt: remoteUpdated,
      };
    }
    return local;
  },
};
