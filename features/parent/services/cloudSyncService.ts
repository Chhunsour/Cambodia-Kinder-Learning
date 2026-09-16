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
  LocalCloudBinding,
} from "@/lib/supabase/types";
import { ChildProfileRepository } from "@/storage/repositories/childProfileRepository";
import { LessonProgressRepository } from "@/storage/repositories/lessonProgressRepository";
import { WalletRepository } from "@/storage/repositories/walletRepository";
import { WardrobeRepository } from "@/storage/repositories/wardrobeRepository";
import { StreakRepository } from "@/storage/repositories/streakRepository";
import { HeartRepository } from "@/storage/repositories/heartRepository";
import { CloudBindingRepository } from "@/storage/repositories/cloudBindingRepository";
import { AppSettingsRepository } from "@/storage/repositories/appSettingsRepository";
import { StreakDaysRepository } from "@/storage/repositories/streakDaysRepository";
import { getDatabase } from "@/storage/database";
import {
  TABLE_COSMETIC_INVENTORY,
  TABLE_COIN_TRANSACTIONS,
  TABLE_WALLETS,
  APP_SETTING_KEYS,
} from "@/storage/database/schema";

const KEY_DISMISSED_AT = "save_progress_prompt_dismissed_at";
const KEY_DISMISSED_COUNT = "save_progress_prompt_dismissed_count";
const COOLDOWN_HOURS = 24;
const COOLDOWN_LESSONS = 3;

export interface BindResult {
  success: boolean;
  existingCloudDataFound?: boolean;
  error?: string;
}

export interface SyncResult {
  success: boolean;
  error?: string;
  syncedAt?: number;
}

/**
 * Domain Service orchestrating optional cloud binding and local-to-cloud snapshot uploads.
 * Local SQLite remains the single authoritative source of truth during offline and online play.
 */
export const CloudSyncService = {
  /**
   * Check if an authenticated parent account already has cloud children/data.
   * If existing children are detected, prevents accidental silent overwrite.
   */
  async checkExistingCloudData(parentId: string): Promise<{
    hasExistingData: boolean;
    children: CloudChild[];
  }> {
    const client = getSupabaseClient();
    if (!client) {
      return { hasExistingData: false, children: [] };
    }

    try {
      const { data, error } = await client
        .from("children")
        .select("*")
        .eq("parent_id", parentId);

      if (error) {
        console.warn("[CloudSyncService] Error querying cloud children:", error);
        return { hasExistingData: false, children: [] };
      }

      const children = (data as CloudChild[]) || [];
      return {
        hasExistingData: children.length > 0,
        children,
      };
    } catch (err) {
      console.warn("[CloudSyncService] Exception checking existing cloud data:", err);
      return { hasExistingData: false, children: [] };
    }
  },

  /**
   * Compiles an unabridged, clean snapshot of the local child profile and learning state.
   */
  async compileLocalSnapshot(profileId: string, parentId: string): Promise<ChildLocalSnapshot | null> {
    const profile = await ChildProfileRepository.getChildProfileById(profileId);
    if (!profile) return null;

    const nowIso = new Date().toISOString();

    // 1. Child Record
    const cloudChild: CloudChild = {
      id: profile.id, // Stable identity preserved
      parent_id: parentId,
      local_origin_id: profile.id,
      nickname: profile.nickname,
      age: profile.age,
      learning_band: profile.learningBand,
      avatar_id: profile.avatarId,
      ui_language: profile.uiLanguage,
      created_at: new Date(profile.createdAt).toISOString(),
      updated_at: new Date(profile.updatedAt).toISOString(),
    };

    // 2. Lesson Progress
    const localProgress = await LessonProgressRepository.getAllProgressRecords(profileId);
    const cloudProgress: CloudLessonProgress[] = localProgress.map((lp) => ({
      id: lp.id,
      child_id: profile.id,
      lesson_id: lp.lessonId,
      world_id: lp.worldId,
      status: lp.status,
      best_stars: lp.bestStars,
      completion_count: lp.completionCount,
      total_attempts: lp.totalAttempts,
      total_mistakes: lp.totalMistakes,
      first_completed_at: lp.firstCompletedAt ? new Date(lp.firstCompletedAt).toISOString() : null,
      last_completed_at: lp.lastCompletedAt ? new Date(lp.lastCompletedAt).toISOString() : null,
      created_at: new Date(lp.createdAt).toISOString(),
      updated_at: new Date(lp.updatedAt).toISOString(),
    }));

    // 3. Wallet
    const wallet = await WalletRepository.getWallet(profileId);
    const cloudWallet: CloudWallet | null = wallet
      ? {
          child_id: profile.id,
          coin_balance: wallet.coinBalance,
          created_at: new Date(wallet.createdAt).toISOString(),
          updated_at: new Date(wallet.updatedAt).toISOString(),
        }
      : null;

    // 4. Coin Transactions
    const transactions = await WalletRepository.getCoinTransactions(profileId);
    const cloudTransactions: CloudCoinTransaction[] = transactions.map((t) => ({
      id: t.id,
      child_id: profile.id,
      amount: t.amount,
      type: t.type,
      source_type: t.sourceType,
      source_id: t.sourceId,
      description: t.description,
      created_at: new Date(t.createdAt).toISOString(),
    }));

    // 5. Cosmetic Inventory
    const db = await getDatabase();
    const inventoryRows = await db.getAllAsync<{
      id: string;
      item_id: string;
      acquired_at: number;
      source: string;
    }>(
      `SELECT id, item_id, acquired_at, source FROM ${TABLE_COSMETIC_INVENTORY} WHERE profile_id = ?;`,
      [profileId]
    );
    const cloudInventory: CloudCosmeticItem[] = inventoryRows.map((r) => ({
      id: r.id,
      child_id: profile.id,
      item_id: r.item_id,
      acquired_at: new Date(r.acquired_at).toISOString(),
      source: r.source,
    }));

    // 6. Equipped Appearance
    const appearance = await WardrobeRepository.getAppearance(profileId);
    const cloudAppearance: CloudEquippedAppearance = {
      child_id: profile.id,
      head_item_id: appearance.head,
      face_item_id: appearance.face,
      neck_item_id: appearance.neck,
      body_item_id: appearance.body,
      back_item_id: appearance.back,
      special_item_id: appearance.special,
      updated_at: nowIso,
    };

    // 7. Learning Streaks
    const streak = await StreakRepository.getStreak(profileId);
    const cloudStreak: CloudLearningStreak = {
      child_id: profile.id,
      current_streak: streak.currentStreak,
      longest_streak: streak.longestStreak,
      last_qualified_date: streak.lastQualifiedDate,
      total_qualified_days: streak.totalQualifiedDays,
      created_at: new Date(streak.createdAt).toISOString(),
      updated_at: new Date(streak.updatedAt).toISOString(),
    };

    // 8. Streak Pet Progress
    const pet = await StreakRepository.getPetProgress(profileId);
    const cloudPet: CloudStreakPetProgress = {
      child_id: profile.id,
      highest_stage: pet.highestStage,
      current_companion_id: pet.currentCompanionId,
      created_at: new Date(pet.createdAt).toISOString(),
      updated_at: new Date(pet.updatedAt).toISOString(),
    };

    // 9. Heart State
    const hearts = await HeartRepository.getHeartState(profileId);
    const cloudHearts: CloudHeartState | null = hearts
      ? {
          child_id: profile.id,
          current_hearts: hearts.currentHearts,
          max_hearts: hearts.maxHearts,
          last_regeneration_at: new Date(hearts.lastRegenerationAt).toISOString(),
          created_at: new Date(hearts.createdAt).toISOString(),
          updated_at: new Date(hearts.updatedAt).toISOString(),
        }
      : null;

    return {
      child: cloudChild,
      lessonProgress: cloudProgress,
      wallet: cloudWallet,
      transactions: cloudTransactions,
      inventory: cloudInventory,
      appearance: cloudAppearance,
      streak: cloudStreak,
      pet: cloudPet,
      hearts: cloudHearts,
    };
  },

  /**
   * Bind an existing local child profile to the authenticated parent account.
   * Uploads the initial local-to-cloud snapshot and marks local binding in SQLite.
   */
  async bindLocalProfileToAccount(
    profileId: string,
    parentId: string,
    allowMultipleChildren = false
  ): Promise<BindResult> {
    const client = getSupabaseClient();
    if (!client) {
      return {
        success: false,
        error: "Supabase connection is not configured. Progress will remain safely on this device.",
      };
    }

    try {
      // 1. Check if the parent already has other children in the cloud
      if (!allowMultipleChildren) {
        const cloudCheck = await this.checkExistingCloudData(parentId);
        if (cloudCheck.hasExistingData) {
          const matchesExisting = cloudCheck.children.some((c) => c.id === profileId);
          if (!matchesExisting) {
            // Account already contains different child data; pause to avoid silent overwrite
            return {
              success: false,
              existingCloudDataFound: true,
              error: "Existing saved progress was found on this account.",
            };
          }
        }
      }

      // 2. Compile full local snapshot
      const snapshot = await this.compileLocalSnapshot(profileId, parentId);
      if (!snapshot) {
        return {
          success: false,
          error: "Local child profile not found.",
        };
      }

      // 3. Upsert Parent Profile
      await client.from("profiles").upsert(
        {
          id: parentId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

      // 4. Upsert Child Record
      const { error: childErr } = await client
        .from("children")
        .upsert(snapshot.child, { onConflict: "id" });

      if (childErr) {
        console.warn("[CloudSyncService] Error upserting child:", childErr);
        return { success: false, error: childErr.message };
      }

      // 5. Upsert child-owned progress and economy data
      if (snapshot.lessonProgress.length > 0) {
        await client.from("lesson_progress").upsert(snapshot.lessonProgress, {
          onConflict: "child_id,lesson_id",
        });
      }

      if (snapshot.wallet) {
        await client.from("wallets").upsert(snapshot.wallet, { onConflict: "child_id" });
      }

      if (snapshot.transactions.length > 0) {
        await client.from("coin_transactions").upsert(snapshot.transactions, {
          onConflict: "child_id,source_type,source_id",
        });
      }

      if (snapshot.inventory.length > 0) {
        await client.from("cosmetic_inventory").upsert(snapshot.inventory, {
          onConflict: "child_id,item_id",
        });
      }

      if (snapshot.appearance) {
        await client.from("equipped_cosmetics").upsert(snapshot.appearance, {
          onConflict: "child_id",
        });
      }

      if (snapshot.streak) {
        await client.from("learning_streaks").upsert(snapshot.streak, {
          onConflict: "child_id",
        });
      }

      if (snapshot.pet) {
        await client.from("streak_pet_progress").upsert(snapshot.pet, {
          onConflict: "child_id",
        });
      }

      if (snapshot.hearts) {
        await client.from("heart_state").upsert(snapshot.hearts, {
          onConflict: "child_id",
        });
      }

      // 6. Only after cloud operations succeed, persist binding locally in SQLite
      const now = Date.now();
      const bindingRecord: LocalCloudBinding = {
        profile_id: profileId,
        cloud_child_id: snapshot.child.id,
        cloud_parent_id: parentId,
        bound_at: now,
        last_sync_at: now,
        sync_status: "synced",
      };
      await CloudBindingRepository.saveBinding(bindingRecord);

      return { success: true };
    } catch (err: any) {
      console.warn("[CloudSyncService] Error during bindLocalProfileToAccount:", err);
      return {
        success: false,
        error: err?.message || "Failed to back up progress to cloud. Your local progress is completely safe.",
      };
    }
  },

  /**
   * Uploads fresh local state to the cloud (Local -> Cloud backup).
   */
  async uploadLocalProfileSnapshot(profileId: string, parentId: string): Promise<SyncResult> {
    const client = getSupabaseClient();
    if (!client) {
      return { success: false, error: "Supabase client not configured." };
    }

    try {
      const snapshot = await this.compileLocalSnapshot(profileId, parentId);
      if (!snapshot) {
        return { success: false, error: "Profile not found." };
      }

      // Upsert all data
      await client.from("children").upsert(snapshot.child, { onConflict: "id" });

      if (snapshot.lessonProgress.length > 0) {
        await client.from("lesson_progress").upsert(snapshot.lessonProgress, {
          onConflict: "child_id,lesson_id",
        });
      }
      if (snapshot.wallet) {
        await client.from("wallets").upsert(snapshot.wallet, { onConflict: "child_id" });
      }
      if (snapshot.transactions.length > 0) {
        await client.from("coin_transactions").upsert(snapshot.transactions, {
          onConflict: "child_id,source_type,source_id",
        });
      }
      if (snapshot.inventory.length > 0) {
        await client.from("cosmetic_inventory").upsert(snapshot.inventory, {
          onConflict: "child_id,item_id",
        });
      }
      if (snapshot.appearance) {
        await client.from("equipped_cosmetics").upsert(snapshot.appearance, {
          onConflict: "child_id",
        });
      }
      if (snapshot.streak) {
        await client.from("learning_streaks").upsert(snapshot.streak, {
          onConflict: "child_id",
        });
      }
      if (snapshot.pet) {
        await client.from("streak_pet_progress").upsert(snapshot.pet, {
          onConflict: "child_id",
        });
      }
      if (snapshot.hearts) {
        await client.from("heart_state").upsert(snapshot.hearts, {
          onConflict: "child_id",
        });
      }

      const now = Date.now();
      await CloudBindingRepository.updateLastSyncAt(profileId, now);

      return { success: true, syncedAt: now };
    } catch (err: any) {
      console.warn("[CloudSyncService] Error during uploadLocalProfileSnapshot:", err);
      return { success: false, error: err?.message || "Sync failed" };
    }
  },

  /**
   * Check whether to display the optional "Keep Koki's adventure safe" prompt.
   * Evaluates completion count and dismissal cooldown.
   */
  async checkSaveProgressPromptEligibility(profileId: string): Promise<boolean> {
    try {
      // 1. If already bound to cloud, do not prompt
      const isBound = await CloudBindingRepository.isProfileBound(profileId);
      if (isBound) return false;

      // 2. Check total completed lessons
      const progressList = await LessonProgressRepository.getAllProgressRecords(profileId);
      const completedCount = progressList.filter((p) => p.status === "completed").length;
      if (completedCount < 3) return false;

      // 3. Check dismissal metadata
      const [dismissedAtRaw, dismissedCountRaw] = await Promise.all([
        AppSettingsRepository.get(`${KEY_DISMISSED_AT}_${profileId}`),
        AppSettingsRepository.get(`${KEY_DISMISSED_COUNT}_${profileId}`),
      ]);

      if (dismissedAtRaw && dismissedCountRaw) {
        const dismissedAt = parseInt(dismissedAtRaw, 10);
        const dismissedCount = parseInt(dismissedCountRaw, 10);
        const hoursSince = (Date.now() - dismissedAt) / (1000 * 60 * 60);
        const lessonsSince = completedCount - dismissedCount;

        // Suppress if less than 24h have passed AND less than 3 lessons have been played
        if (hoursSince < COOLDOWN_HOURS && lessonsSince < COOLDOWN_LESSONS) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.warn("[CloudSyncService] Error checking prompt eligibility:", error);
      return false;
    }
  },

  /**
   * Record prompt dismissal to respect parent cooldown.
   */
  async dismissSaveProgressPrompt(profileId: string): Promise<void> {
    try {
      const progressList = await LessonProgressRepository.getAllProgressRecords(profileId);
      const completedCount = progressList.filter((p) => p.status === "completed").length;

      await Promise.all([
        AppSettingsRepository.set(`${KEY_DISMISSED_AT}_${profileId}`, Date.now().toString()),
        AppSettingsRepository.set(`${KEY_DISMISSED_COUNT}_${profileId}`, completedCount.toString()),
      ]);
    } catch (error) {
      console.warn("[CloudSyncService] Error dismissing save progress prompt:", error);
    }
  },

  /**
   * Restore a remote cloud child and all associated progress into local SQLite.
   * Useful on a second device or after a fresh install.
   */
  async restoreCloudChild(
    cloudChildId: string,
    parentId: string
  ): Promise<{ success: boolean; error?: string; restoredProfileId?: string }> {
    const client = getSupabaseClient();
    if (!client) {
      return { success: false, error: "Supabase client not configured." };
    }

    try {
      const [
        childRes,
        progressRes,
        walletRes,
        txRes,
        invRes,
        appRes,
        streakRes,
        petRes,
        heartRes,
        daysRes,
      ] = await Promise.all([
        client.from("children").select("*").eq("id", cloudChildId).single(),
        client.from("lesson_progress").select("*").eq("child_id", cloudChildId),
        client.from("wallets").select("*").eq("child_id", cloudChildId).maybeSingle(),
        client.from("coin_transactions").select("*").eq("child_id", cloudChildId),
        client.from("cosmetic_inventory").select("*").eq("child_id", cloudChildId),
        client.from("equipped_cosmetics").select("*").eq("child_id", cloudChildId).maybeSingle(),
        client.from("learning_streaks").select("*").eq("child_id", cloudChildId).maybeSingle(),
        client.from("streak_pet_progress").select("*").eq("child_id", cloudChildId).maybeSingle(),
        client.from("heart_state").select("*").eq("child_id", cloudChildId).maybeSingle(),
        client.from("streak_days").select("*").eq("child_id", cloudChildId),
      ]);

      if (childRes.error || !childRes.data) {
        return { success: false, error: childRes.error?.message || "Cloud child not found." };
      }

      const cloudChild = childRes.data as CloudChild;
      const profileId = cloudChild.id;

      // 1. Profile
      const existingLocal = await ChildProfileRepository.getChildProfileById(profileId);
      if (existingLocal) {
        await ChildProfileRepository.updateChildProfile(profileId, {
          nickname: cloudChild.nickname,
          age: cloudChild.age,
          learningBand: cloudChild.learning_band as any,
          avatarId: cloudChild.avatar_id,
          uiLanguage: cloudChild.ui_language as any,
        });
      } else {
        await ChildProfileRepository.createChildProfile({
          id: profileId,
          nickname: cloudChild.nickname,
          age: cloudChild.age,
          learningBand: cloudChild.learning_band as any,
          avatarId: cloudChild.avatar_id,
          uiLanguage: cloudChild.ui_language as any,
          onboardingCompleted: true,
          createdAt: new Date(cloudChild.created_at).getTime(),
          updatedAt: new Date(cloudChild.updated_at).getTime(),
        });
      }

      // 2. Lesson Progress
      const progressList = (progressRes.data as CloudLessonProgress[]) || [];
      for (const p of progressList) {
        await LessonProgressRepository.upsertLessonProgress({
          id: p.id,
          profileId,
          lessonId: p.lesson_id,
          worldId: p.world_id,
          status: p.status as any,
          bestStars: (p.best_stars as 1 | 2 | 3) || 0,
          completionCount: p.completion_count,
          totalAttempts: p.total_attempts,
          totalMistakes: p.total_mistakes,
          firstCompletedAt: p.first_completed_at ? new Date(p.first_completed_at).getTime() : undefined,
          lastCompletedAt: p.last_completed_at ? new Date(p.last_completed_at).getTime() : undefined,
          createdAt: new Date(p.created_at).getTime(),
          updatedAt: new Date(p.updated_at).getTime(),
        });
      }

      // 3. Wallet & Ledger Transactions
      const db = await getDatabase();
      const txList = (txRes.data as CloudCoinTransaction[]) || [];
      const walletData = walletRes.data as CloudWallet | null;
      const balance = walletData ? walletData.coin_balance : 0;

      await db.withTransactionAsync(async () => {
        for (const tx of txList) {
          await db.runAsync(
            `INSERT OR REPLACE INTO ${TABLE_COIN_TRANSACTIONS} (
              id, profile_id, amount, type, source_type, source_id, description, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
            [
              tx.id,
              profileId,
              tx.amount,
              tx.type,
              tx.source_type,
              tx.source_id,
              tx.description ?? null,
              new Date(tx.created_at).getTime(),
            ]
          );
        }
        await db.runAsync(
          `INSERT INTO ${TABLE_WALLETS} (profile_id, coin_balance, created_at, updated_at)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(profile_id) DO UPDATE SET
             coin_balance = excluded.coin_balance,
             updated_at = excluded.updated_at;`,
          [profileId, balance, Date.now(), Date.now()]
        );
      });

      // 4. Cosmetic Inventory
      const invList = (invRes.data as CloudCosmeticItem[]) || [];
      if (invList.length > 0) {
        await WardrobeRepository.batchAddCosmetics(
          profileId,
          invList.map((i) => ({ itemId: i.item_id, acquiredAt: new Date(i.acquired_at).getTime() }))
        );
      }

      // 5. Equipped Appearance
      const appData = appRes.data as CloudEquippedAppearance | null;
      if (appData) {
        await WardrobeRepository.setAppearance(profileId, {
          head: appData.head_item_id ?? null,
          face: appData.face_item_id ?? null,
          neck: appData.neck_item_id ?? null,
          body: appData.body_item_id ?? null,
          back: appData.back_item_id ?? null,
          special: appData.special_item_id ?? null,
        });
      }

      // 6. Learning Streak & Pet
      const streakData = streakRes.data as CloudLearningStreak | null;
      const petData = petRes.data as CloudStreakPetProgress | null;
      if (streakData) {
        await StreakRepository.saveStreakAndPet(
          {
            profileId,
            currentStreak: streakData.current_streak,
            longestStreak: streakData.longest_streak,
            lastQualifiedDate: streakData.last_qualified_date ?? null,
            totalQualifiedDays: streakData.total_qualified_days,
            createdAt: new Date(streakData.created_at).getTime(),
            updatedAt: new Date(streakData.updated_at).getTime(),
          },
          petData?.highest_stage || "egg",
          petData?.current_companion_id || "starter_pet"
        );
      }

      // 7. Streak Days
      const daysList = (daysRes.data as CloudStreakDay[]) || [];
      if (daysList.length > 0) {
        await StreakDaysRepository.batchInsertStreakDays(
          profileId,
          daysList.map((d) => d.day_date)
        );
      }

      // 8. Hearts
      const heartData = heartRes.data as CloudHeartState | null;
      if (heartData) {
        await HeartRepository.saveHeartState(
          profileId,
          heartData.current_hearts,
          heartData.max_hearts,
          new Date(heartData.last_regeneration_at).getTime()
        );
      }

      // 9. Save cloud binding
      const now = Date.now();
      await CloudBindingRepository.saveBinding({
        profile_id: profileId,
        cloud_child_id: cloudChildId,
        cloud_parent_id: parentId,
        bound_at: now,
        last_sync_at: now,
        sync_status: "synced",
      });

      // 10. Switch active profile to restored profile
      await AppSettingsRepository.set(APP_SETTING_KEYS.ACTIVE_CHILD_PROFILE_ID, profileId);

      return { success: true, restoredProfileId: profileId };
    } catch (err: any) {
      console.warn("[CloudSyncService] Error restoring cloud child:", err);
      return { success: false, error: err?.message || "Failed to restore child profile." };
    }
  },

  /**
   * Merge local child progress with an existing cloud child profile.
   */
  async mergeLocalIntoCloudChild(
    localProfileId: string,
    cloudChildId: string,
    parentId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const now = Date.now();
      await CloudBindingRepository.saveBinding({
        profile_id: localProfileId,
        cloud_child_id: cloudChildId,
        cloud_parent_id: parentId,
        bound_at: now,
        last_sync_at: 0,
        sync_status: "pending",
      });

      const { SyncService } = await import("./syncService");
      const syncRes = await SyncService.syncProfile(localProfileId, true);
      if (!syncRes.success) {
        return { success: false, error: syncRes.error || "Sync merge failed" };
      }

      return { success: true };
    } catch (err: any) {
      console.warn("[CloudSyncService] Error merging local into cloud child:", err);
      return { success: false, error: err?.message || "Failed to merge progress." };
    }
  },
};
