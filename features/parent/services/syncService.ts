import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/supabaseClient";
import {
  ChildLocalSnapshot,
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
  CloudLearningStarEvent,
} from "@/lib/supabase/types";
import { SyncQueueRepository } from "@/storage/repositories/syncQueueRepository";
import { StreakDaysRepository } from "@/storage/repositories/streakDaysRepository";
import { CloudBindingRepository } from "@/storage/repositories/cloudBindingRepository";
import { ChildProfileRepository } from "@/storage/repositories/childProfileRepository";
import { LessonProgressRepository } from "@/storage/repositories/lessonProgressRepository";
import { WalletRepository } from "@/storage/repositories/walletRepository";
import { WardrobeRepository } from "@/storage/repositories/wardrobeRepository";
import { StreakRepository } from "@/storage/repositories/streakRepository";
import { HeartRepository } from "@/storage/repositories/heartRepository";
import { SyncEntityType, SyncOperation, SyncQueueItem } from "@/storage/database/types";
import { SyncConflictMerger } from "./syncConflictMerger";
import { networkMonitor } from "@/lib/network/networkMonitor";
import { CloudSyncService } from "./cloudSyncService";
import { getDatabase } from "@/storage/database";
import { TABLE_WALLETS, TABLE_COIN_TRANSACTIONS } from "@/storage/database/schema";

export type SyncUIStatus =
  | "saved_locally"
  | "syncing"
  | "saved_to_account"
  | "offline_pending"
  | "needs_attention";

export interface SyncStatusResult {
  status: SyncUIStatus;
  lastSyncAt: number | null;
  pendingCount: number;
  failedCount: number;
  error?: string | null;
}

const activePushLocks = new Set<string>();
const activePullLocks = new Set<string>();
const activeSyncLocks = new Set<string>();

/**
 * Full Local ↔ Cloud Sync Service.
 *
 * Core rule:
 * Local gameplay first -> queue changes -> sync when online -> merge safely -> never block learning.
 */
export const SyncService = {
  /**
   * Enqueue a local mutation for cloud sync.
   * If the profile is not bound to a cloud account, this is a clean no-op.
   * The mutation is queued persistently in SQLite and push is triggered asynchronously.
   */
  async enqueueSyncMutation(params: {
    profileId: string;
    entityType: SyncEntityType;
    entityId: string;
    operation: SyncOperation;
    payload: any;
  }): Promise<void> {
    try {
      const isBound = await CloudBindingRepository.isProfileBound(params.profileId);
      if (!isBound) return; // Guest mode: zero overhead

      await SyncQueueRepository.enqueue({
        profileId: params.profileId,
        entityType: params.entityType,
        entityId: params.entityId,
        operation: params.operation,
        payload: params.payload,
      });

      // Asynchronous non-blocking push trigger if online
      if (networkMonitor.isOnline()) {
        setTimeout(() => {
          this.processSyncQueue(params.profileId).catch((err) => {
            console.warn("[SyncService] Background push execution note:", err);
          });
        }, 150);
      }
    } catch (error) {
      console.warn("[SyncService] Error enqueueing sync mutation:", error);
    }
  },

  /**
   * Push Phase: Drain the persistent sync_queue for a bound profile.
   * Uses exponential backoff and does not drop failed mutations.
   */
  async processSyncQueue(
    profileId: string,
    forceRetryAll = false
  ): Promise<{ processedCount: number; failedCount: number }> {
    if (activePushLocks.has(profileId)) {
      return { processedCount: 0, failedCount: 0 };
    }
    activePushLocks.add(profileId);

    let processedCount = 0;
    let failedCount = 0;

    try {
      const isBound = await CloudBindingRepository.isProfileBound(profileId);
      if (!isBound) return { processedCount: 0, failedCount: 0 };

      if (forceRetryAll) {
        await SyncQueueRepository.resetFailedItems(profileId);
      }

      const client = getSupabaseClient();
      if (!client || !isSupabaseConfigured()) {
        networkMonitor.setOnline(false);
        return { processedCount: 0, failedCount: 0 };
      }

      const eligibleItems = await SyncQueueRepository.getEligibleQueueItems(profileId);
      if (eligibleItems.length === 0) {
        return { processedCount: 0, failedCount: 0 };
      }

      for (const item of eligibleItems) {
        await SyncQueueRepository.markProcessing(item.id);

        try {
          if (item.operation === "delete") {
            await this.executeRemoteDelete(client, item);
          } else {
            await this.executeRemoteUpsert(client, item);
          }

          // Successful push
          await SyncQueueRepository.deleteItem(item.id);
          processedCount++;
          networkMonitor.onNetworkSuccess();
        } catch (err: any) {
          failedCount++;
          const nextAttempt = item.attemptCount + 1;
          await SyncQueueRepository.updateItemStatus(item.id, "failed", nextAttempt, Date.now());
          networkMonitor.onNetworkFailure(err);

          await CloudBindingRepository.updateSyncMetadata(profileId, {
            sync_status: "failed",
            sync_error: err?.message || "Sync mutation failed",
          });
        }
      }

      await CloudBindingRepository.updateSyncMetadata(profileId, {
        last_push_at: Date.now(),
      });
    } finally {
      activePushLocks.delete(profileId);
    }

    return { processedCount, failedCount };
  },

  /**
   * Pull Phase: Incremental or snapshot fetch from Supabase and safe entity merge.
   */
  async pullRemoteChanges(profileId: string): Promise<{ success: boolean; error?: string }> {
    if (activePullLocks.has(profileId)) {
      return { success: true };
    }
    activePullLocks.add(profileId);

    try {
      const binding = await CloudBindingRepository.getBindingByProfileId(profileId);
      if (!binding || !binding.cloud_child_id) return { success: true };
      const cloudChildId = binding.cloud_child_id;

      const client = getSupabaseClient();
      if (!client || !isSupabaseConfigured()) {
        networkMonitor.setOnline(false);
        return { success: false, error: "Network or Supabase offline." };
      }

      // 1. Fetch remote entities for child
      const [
        childRes,
        progressRes,
        transactionsRes,
        inventoryRes,
        appearanceRes,
        streakRes,
        petRes,
        heartsRes,
        streakDaysRes,
      ] = await Promise.all([
        client.from("children").select("*").eq("id", cloudChildId).maybeSingle(),
        client.from("lesson_progress").select("*").eq("child_id", cloudChildId),
        client.from("coin_transactions").select("*").eq("child_id", cloudChildId),
        client.from("cosmetic_inventory").select("*").eq("child_id", cloudChildId),
        client.from("equipped_cosmetics").select("*").eq("child_id", cloudChildId).maybeSingle(),
        client.from("learning_streaks").select("*").eq("child_id", cloudChildId).maybeSingle(),
        client.from("streak_pet_progress").select("*").eq("child_id", cloudChildId).maybeSingle(),
        client.from("heart_state").select("*").eq("child_id", cloudChildId).maybeSingle(),
        client.from("streak_days").select("*").eq("child_id", cloudChildId),
      ]);

      if (childRes.error) {
        networkMonitor.onNetworkFailure(childRes.error);
        return { success: false, error: childRes.error.message };
      }

      // 2. Fetch corresponding local records from SQLite
      const [
        localProfile,
        localProgress,
        localTx,
        localInventoryIds,
        localAppearance,
        localStreak,
        localPet,
        localHeartState,
        localStreakDays,
      ] = await Promise.all([
        ChildProfileRepository.getChildProfileById(profileId),
        LessonProgressRepository.getAllProgressRecords(profileId),
        WalletRepository.getCoinTransactions(profileId, 500),
        WardrobeRepository.getOwnedItemIds(profileId),
        WardrobeRepository.getAppearance(profileId),
        StreakRepository.getStreak(profileId),
        StreakRepository.getPetProgress(profileId),
        HeartRepository.getHeartState(profileId),
        StreakDaysRepository.getStreakDays(profileId),
      ]);

      if (!localProfile) {
        return { success: false, error: "Local profile not found." };
      }

      const remoteChild = childRes.data as CloudChild | null;
      const remoteProgress = (progressRes.data as CloudLessonProgress[]) || [];
      const remoteTx = (transactionsRes.data as CloudCoinTransaction[]) || [];
      const remoteInventory = (inventoryRes.data as CloudCosmeticItem[]) || [];
      const remoteAppearance = appearanceRes.data as CloudEquippedAppearance | null;
      const remoteStreak = streakRes.data as CloudLearningStreak | null;
      const remotePet = petRes.data as CloudStreakPetProgress | null;
      const remoteHearts = heartsRes.data as CloudHeartState | null;
      const remoteStreakDays = ((streakDaysRes.data as CloudStreakDay[]) || []).map((d) => d.day_date);

      // ============================================================
      // 3. RUN ENTITY-SPECIFIC MERGE ALGORITHMS
      // ============================================================

      // A. Child Profile
      if (remoteChild) {
        const mergedChild = SyncConflictMerger.mergeChildProfile(localProfile, remoteChild);
        if (mergedChild.updatedAt > localProfile.updatedAt) {
          await ChildProfileRepository.updateChildProfile(profileId, {
            nickname: mergedChild.nickname,
            age: mergedChild.age,
            learningBand: mergedChild.learningBand,
            avatarId: mergedChild.avatarId,
            uiLanguage: mergedChild.uiLanguage,
          });
        }
      }

      // B. Lesson Progress
      const progressMerge = SyncConflictMerger.mergeLessonProgress(
        localProgress,
        remoteProgress,
        cloudChildId
      );
      for (const rec of progressMerge.mergedLocal) {
        await LessonProgressRepository.upsertLessonProgress({
          id: rec.id,
          profileId,
          lessonId: rec.lessonId,
          worldId: rec.worldId,
          status: rec.status,
          bestStars: rec.bestStars,
          completionCount: rec.completionCount,
          totalAttempts: rec.totalAttempts,
          totalMistakes: rec.totalMistakes,
          firstCompletedAt: rec.firstCompletedAt,
          lastCompletedAt: rec.lastCompletedAt,
          createdAt: rec.createdAt,
          updatedAt: rec.updatedAt,
        });
      }
      if (progressMerge.toPushToCloud.length > 0) {
        await client.from("lesson_progress").upsert(progressMerge.toPushToCloud, {
          onConflict: "child_id,lesson_id",
        });
      }

      // C. Coin Ledger & Wallet Balance
      const coinMerge = SyncConflictMerger.mergeCoinTransactionsAndWallet(
        localTx,
        remoteTx,
        cloudChildId
      );
      if (coinMerge.toInsertLocally.length > 0) {
        const db = await getDatabase();
        await db.withTransactionAsync(async () => {
          for (const tx of coinMerge.toInsertLocally) {
            await db.runAsync(
              `INSERT OR IGNORE INTO ${TABLE_COIN_TRANSACTIONS} (
                id, profile_id, amount, type, source_type, source_id, description, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
              [tx.id, profileId, tx.amount, tx.type, tx.sourceType, tx.sourceId, tx.description, tx.createdAt]
            );
          }
          await db.runAsync(
            `UPDATE ${TABLE_WALLETS} SET coin_balance = ?, updated_at = ? WHERE profile_id = ?;`,
            [coinMerge.reconciledBalance, Date.now(), profileId]
          );
        });
      } else {
        const db = await getDatabase();
        await db.runAsync(
          `UPDATE ${TABLE_WALLETS} SET coin_balance = ?, updated_at = ? WHERE profile_id = ?;`,
          [coinMerge.reconciledBalance, Date.now(), profileId]
        );
      }
      if (coinMerge.toPushToCloud.length > 0) {
        await client.from("coin_transactions").upsert(coinMerge.toPushToCloud, {
          onConflict: "child_id,source_type,source_id",
        });
      }
      // Keep cloud wallet balance in sync with reconciled ledger sum
      await client.from("wallets").upsert(
        {
          child_id: cloudChildId,
          coin_balance: coinMerge.reconciledBalance,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "child_id" }
      );

      // D. Cosmetic Inventory
      const invMerge = SyncConflictMerger.mergeCosmeticInventory(
        localInventoryIds,
        remoteInventory
      );
      if (invMerge.toInsertLocally.length > 0) {
        await WardrobeRepository.batchAddCosmetics(
          profileId,
          invMerge.toInsertLocally.map((itemId) => ({ itemId }))
        );
      }
      if (invMerge.toPushToCloud.length > 0) {
        const cloudInvItems = invMerge.toPushToCloud.map((itemId) => ({
          id: `inv_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
          child_id: cloudChildId,
          item_id: itemId,
          acquired_at: new Date().toISOString(),
          source: "purchase",
        }));
        await client.from("cosmetic_inventory").upsert(cloudInvItems, {
          onConflict: "child_id,item_id",
        });
      }

      // E. Equipped Appearance
      const validOwnedIds = new Set(invMerge.allOwnedItemIds);
      const mergedAppearance = SyncConflictMerger.mergeEquippedAppearance(
        localAppearance,
        remoteAppearance,
        Date.now(),
        validOwnedIds
      );
      await WardrobeRepository.setAppearance(profileId, mergedAppearance);
      await client.from("equipped_cosmetics").upsert(
        {
          child_id: cloudChildId,
          head_item_id: mergedAppearance.head,
          face_item_id: mergedAppearance.face,
          neck_item_id: mergedAppearance.neck,
          body_item_id: mergedAppearance.body,
          back_item_id: mergedAppearance.back,
          special_item_id: mergedAppearance.special,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "child_id" }
      );

      // F. Streak & Pet Progress & Streak Days
      const streakMerge = SyncConflictMerger.mergeStreaksAndPet(
        localStreak,
        remoteStreak,
        localStreakDays,
        remoteStreakDays,
        localPet.highestStage,
        remotePet?.highest_stage || null
      );
      if (streakMerge.daysToInsertLocally.length > 0) {
        await StreakDaysRepository.batchInsertStreakDays(
          profileId,
          streakMerge.daysToInsertLocally
        );
      }
      if (streakMerge.daysToPushToCloud.length > 0) {
        const cloudDays = streakMerge.daysToPushToCloud.map((dayDate) => ({
          child_id: cloudChildId,
          day_date: dayDate,
          created_at: new Date().toISOString(),
        }));
        await client.from("streak_days").upsert(cloudDays, {
          onConflict: "child_id,day_date",
        });
      }
      await StreakRepository.saveStreakAndPet(
        streakMerge.mergedStreak,
        streakMerge.mergedPetStage,
        localPet.currentCompanionId
      );
      if (streakMerge.needsCloudStreakUpdate) {
        await client.from("learning_streaks").upsert(
          {
            child_id: cloudChildId,
            current_streak: streakMerge.mergedStreak.currentStreak,
            longest_streak: streakMerge.mergedStreak.longestStreak,
            last_qualified_date: streakMerge.mergedStreak.lastQualifiedDate,
            total_qualified_days: streakMerge.mergedStreak.totalQualifiedDays,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "child_id" }
        );
        await client.from("streak_pet_progress").upsert(
          {
            child_id: cloudChildId,
            highest_stage: streakMerge.mergedPetStage,
            current_companion_id: localPet.currentCompanionId,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "child_id" }
        );
      }

      // G. Heart State
      if (localHeartState) {
        const heartMerge = SyncConflictMerger.mergeHearts(
          localHeartState,
          remoteHearts,
          Date.now()
        );
        await HeartRepository.saveHeartState(
          profileId,
          heartMerge.mergedHeartState.currentHearts,
          heartMerge.mergedHeartState.lastRegenerationAt,
          Date.now()
        );
        if (heartMerge.needsCloudHeartUpdate) {
          await client.from("heart_state").upsert(
            {
              child_id: cloudChildId,
              current_hearts: heartMerge.mergedHeartState.currentHearts,
              max_hearts: heartMerge.mergedHeartState.maxHearts,
              last_regeneration_at: new Date(
                heartMerge.mergedHeartState.lastRegenerationAt
              ).toISOString(),
              updated_at: new Date().toISOString(),
            },
            { onConflict: "child_id" }
          );
        }
      }

      // 4. Update sync metadata
      const now = Date.now();
      await CloudBindingRepository.updateSyncMetadata(profileId, {
        last_pull_at: now,
        last_successful_sync_at: now,
        last_sync_at: now,
        sync_status: "synced",
        sync_error: null,
      });

      networkMonitor.onNetworkSuccess();
      return { success: true };
    } catch (err: any) {
      console.warn("[SyncService] Error during pullRemoteChanges:", err);
      networkMonitor.onNetworkFailure(err);
      await CloudBindingRepository.updateSyncMetadata(profileId, {
        sync_status: "failed",
        sync_error: err?.message || "Pull sync failed",
      });
      return { success: false, error: err?.message || "Pull sync failed" };
    } finally {
      activePullLocks.delete(profileId);
    }
  },

  /**
   * Complete Full Two-Way Sync for a bound profile.
   * Push pending mutations -> Pull remote changes & merge -> Update status.
   */
  async syncProfile(
    profileId: string,
    forceRetryAll = false
  ): Promise<{ success: boolean; error?: string }> {
    if (activeSyncLocks.has(profileId)) {
      return { success: true };
    }
    activeSyncLocks.add(profileId);

    try {
      const isBound = await CloudBindingRepository.isProfileBound(profileId);
      if (!isBound) return { success: true };

      await CloudBindingRepository.updateSyncMetadata(profileId, {
        sync_status: "syncing",
      });

      // 1. Push Phase
      const pushResult = await this.processSyncQueue(profileId, forceRetryAll);

      // 2. Pull & Merge Phase
      const pullResult = await this.pullRemoteChanges(profileId);

      const queueCounts = await SyncQueueRepository.getQueueCounts(profileId);
      const finalStatus =
        queueCounts.failed > 0
          ? "failed"
          : queueCounts.pending > 0
          ? "pending"
          : "synced";

      await CloudBindingRepository.updateSyncMetadata(profileId, {
        sync_status: finalStatus,
        last_sync_at: Date.now(),
        sync_error: pullResult.error || (queueCounts.failed > 0 ? "Some items failed to sync" : null),
      });

      return {
        success: pushResult.failedCount === 0 && pullResult.success,
        error: pullResult.error,
      };
    } finally {
      activeSyncLocks.delete(profileId);
    }
  },

  /**
   * Get user-facing sync status for the Parent Area.
   */
  async getSyncStatus(profileId: string): Promise<SyncStatusResult> {
    const isBound = await CloudBindingRepository.isProfileBound(profileId);
    if (!isBound) {
      return {
        status: "saved_locally",
        lastSyncAt: null,
        pendingCount: 0,
        failedCount: 0,
        error: null,
      };
    }

    const binding = await CloudBindingRepository.getBindingByProfileId(profileId);
    const queueCounts = await SyncQueueRepository.getQueueCounts(profileId);
    const isOnline = networkMonitor.isOnline();

    if (activeSyncLocks.has(profileId) || binding?.sync_status === "syncing") {
      return {
        status: "syncing",
        lastSyncAt: binding?.last_successful_sync_at ?? binding?.last_sync_at ?? null,
        pendingCount: queueCounts.pending,
        failedCount: queueCounts.failed,
        error: null,
      };
    }

    if (queueCounts.failed > 0 || binding?.sync_status === "failed") {
      return {
        status: "needs_attention",
        lastSyncAt: binding?.last_successful_sync_at ?? binding?.last_sync_at ?? null,
        pendingCount: queueCounts.pending,
        failedCount: queueCounts.failed,
        error: binding?.sync_error || "Sync needs attention",
      };
    }

    if (!isOnline && queueCounts.pending > 0) {
      return {
        status: "offline_pending",
        lastSyncAt: binding?.last_successful_sync_at ?? binding?.last_sync_at ?? null,
        pendingCount: queueCounts.pending,
        failedCount: queueCounts.failed,
        error: null,
      };
    }

    if (queueCounts.pending > 0) {
      return {
        status: "offline_pending",
        lastSyncAt: binding?.last_successful_sync_at ?? binding?.last_sync_at ?? null,
        pendingCount: queueCounts.pending,
        failedCount: queueCounts.failed,
        error: null,
      };
    }

    return {
      status: "saved_to_account",
      lastSyncAt: binding?.last_successful_sync_at ?? binding?.last_sync_at ?? null,
      pendingCount: 0,
      failedCount: 0,
      error: null,
    };
  },

  /**
   * Manual recovery: Reset failed queue items to pending and trigger immediate sync.
   */
  async retryFailedSyncItems(profileId: string): Promise<void> {
    await SyncQueueRepository.resetFailedItems(profileId);
    await this.syncProfile(profileId, true);
  },

  /**
   * Diagnostic inspector for developer tools.
   */
  async inspectSyncQueue(profileId: string): Promise<SyncQueueItem[]> {
    return SyncQueueRepository.getAllItems(profileId);
  },

  /**
   * Rebuild cloud snapshot completely from local SQLite state.
   */
  async rebuildCloudSnapshotFromLocal(profileId: string, parentId: string) {
    return CloudSyncService.uploadLocalProfileSnapshot(profileId, parentId);
  },

  // ============================================================
  // Private Remote Execution Helpers
  // ============================================================

  async executeRemoteUpsert(client: any, item: SyncQueueItem): Promise<void> {
    const { entityType, payload, profileId } = item;
    const binding = await CloudBindingRepository.getBindingByProfileId(profileId);
    const cloudChildId = binding?.cloud_child_id || profileId;

    switch (entityType) {
      case "lesson_progress": {
        const cloudProgress: CloudLessonProgress = {
          id: payload.id,
          child_id: cloudChildId,
          lesson_id: payload.lessonId,
          world_id: payload.worldId,
          status: payload.status,
          best_stars: payload.bestStars,
          completion_count: payload.completionCount,
          total_attempts: payload.totalAttempts,
          total_mistakes: payload.totalMistakes,
          first_completed_at: payload.firstCompletedAt
            ? new Date(payload.firstCompletedAt).toISOString()
            : null,
          last_completed_at: payload.lastCompletedAt
            ? new Date(payload.lastCompletedAt).toISOString()
            : null,
          created_at: new Date(payload.createdAt || Date.now()).toISOString(),
          updated_at: new Date(payload.updatedAt || Date.now()).toISOString(),
        };
        const { error } = await client.from("lesson_progress").upsert(cloudProgress, {
          onConflict: "child_id,lesson_id",
        });
        if (error) throw error;
        break;
      }

      case "coin_transactions": {
        const cloudTx: CloudCoinTransaction = {
          id: payload.id,
          child_id: cloudChildId,
          amount: payload.amount,
          type: payload.type,
          source_type: payload.sourceType,
          source_id: payload.sourceId,
          description: payload.description || null,
          created_at: new Date(payload.createdAt || Date.now()).toISOString(),
        };
        const { error } = await client.from("coin_transactions").upsert(cloudTx, {
          onConflict: "child_id,source_type,source_id",
        });
        if (error) throw error;
        break;
      }

      case "wallet": {
        const cloudWallet: CloudWallet = {
          child_id: cloudChildId,
          coin_balance: payload.coin_balance ?? payload.coinBalance ?? 0,
          created_at: new Date(payload.createdAt || Date.now()).toISOString(),
          updated_at: new Date().toISOString(),
        };
        const { error } = await client.from("wallets").upsert(cloudWallet, {
          onConflict: "child_id",
        });
        if (error) throw error;
        break;
      }

      case "cosmetic_inventory": {
        const cloudItem: CloudCosmeticItem = {
          id: payload.id || `inv_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
          child_id: cloudChildId,
          item_id: payload.itemId,
          acquired_at: new Date(payload.acquiredAt || Date.now()).toISOString(),
          source: payload.source || "purchase",
        };
        const { error } = await client.from("cosmetic_inventory").upsert(cloudItem, {
          onConflict: "child_id,item_id",
        });
        if (error) throw error;
        break;
      }

      case "equipped_cosmetics": {
        const cloudAppearance: CloudEquippedAppearance = {
          child_id: cloudChildId,
          head_item_id: payload.head ?? null,
          face_item_id: payload.face ?? null,
          neck_item_id: payload.neck ?? null,
          body_item_id: payload.body ?? null,
          back_item_id: payload.back ?? null,
          special_item_id: payload.special ?? null,
          updated_at: new Date().toISOString(),
        };
        const { error } = await client.from("equipped_cosmetics").upsert(cloudAppearance, {
          onConflict: "child_id",
        });
        if (error) throw error;
        break;
      }

      case "learning_streak": {
        const cloudStreak: CloudLearningStreak = {
          child_id: cloudChildId,
          current_streak: payload.currentStreak,
          longest_streak: payload.longestStreak,
          last_qualified_date: payload.lastQualifiedDate,
          total_qualified_days: payload.totalQualifiedDays,
          created_at: new Date(payload.createdAt || Date.now()).toISOString(),
          updated_at: new Date().toISOString(),
        };
        const { error } = await client.from("learning_streaks").upsert(cloudStreak, {
          onConflict: "child_id",
        });
        if (error) throw error;
        break;
      }

      case "streak_pet_progress": {
        const cloudPet: CloudStreakPetProgress = {
          child_id: cloudChildId,
          highest_stage: payload.highestStage || payload.currentStage || "egg",
          current_companion_id: payload.companionId || payload.currentCompanionId || "starter_pet",
          created_at: new Date(payload.createdAt || Date.now()).toISOString(),
          updated_at: new Date().toISOString(),
        };
        const { error } = await client.from("streak_pet_progress").upsert(cloudPet, {
          onConflict: "child_id",
        });
        if (error) throw error;
        break;
      }

      case "streak_days": {
        const cloudStreakDay: CloudStreakDay = {
          child_id: cloudChildId,
          day_date: payload.dayDate,
          created_at: new Date().toISOString(),
        };
        const { error } = await client.from("streak_days").upsert(cloudStreakDay, {
          onConflict: "child_id,day_date",
        });
        if (error) throw error;
        break;
      }

      case "heart_state": {
        const cloudHeart: CloudHeartState = {
          child_id: cloudChildId,
          current_hearts: payload.currentHearts,
          max_hearts: payload.maxHearts,
          last_regeneration_at: new Date(payload.lastRegenerationAt).toISOString(),
          created_at: new Date(payload.createdAt || Date.now()).toISOString(),
          updated_at: new Date().toISOString(),
        };
        const { error } = await client.from("heart_state").upsert(cloudHeart, {
          onConflict: "child_id",
        });
        if (error) throw error;
        break;
      }

      case "child_profile": {
        const cloudChild: CloudChild = {
          id: cloudChildId,
          parent_id: payload.parentId || payload.parent_id,
          local_origin_id: profileId,
          nickname: payload.nickname,
          age: payload.age,
          learning_band: payload.learningBand || payload.learning_band,
          avatar_id: payload.avatarId || payload.avatar_id,
          ui_language: payload.uiLanguage || payload.ui_language || "km",
          created_at: new Date(payload.createdAt || Date.now()).toISOString(),
          updated_at: new Date().toISOString(),
        };
        const { error } = await client.from("children").upsert(cloudChild, {
          onConflict: "id",
        });
        if (error) throw error;
        break;
      }

      case "learning_star_event": {
        const cloudEvent: CloudLearningStarEvent = {
          id: payload.id,
          child_id: cloudChildId,
          lesson_id: payload.lessonId,
          track_id: payload.trackId || "world-1",
          stars_delta: payload.starsDelta,
          source_completion_id: payload.sourceCompletionId,
          earned_at: new Date(payload.earnedAt || Date.now()).toISOString(),
          created_at: new Date(payload.createdAt || Date.now()).toISOString(),
        };
        const { error } = await client.from("learning_star_events").upsert(cloudEvent, {
          onConflict: "source_completion_id",
        });
        if (error) throw error;
        break;
      }
    }
  },

  async executeRemoteDelete(client: any, item: SyncQueueItem): Promise<void> {
    const { entityType, entityId, profileId } = item;
    if (entityType === "child_profile") {
      const binding = await CloudBindingRepository.getBindingByProfileId(profileId);
      const cloudChildId = binding?.cloud_child_id || entityId || profileId;
      const { error } = await client.from("children").delete().eq("id", cloudChildId);
      if (error) throw error;
    }
  },
};
