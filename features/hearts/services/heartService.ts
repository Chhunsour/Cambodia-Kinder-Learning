import { HeartRepository, HeartState } from "@/storage/repositories/heartRepository";
import { LessonMode } from "@/features/lessons/types";
import {
  HeartDeductionResult,
  HeartRegenCalculation,
  HeartRestoreInput,
} from "../types";
import { calculateRegeneratedHearts } from "./heartRegenCalculator";
import { MAX_HEARTS, DEFAULT_HEARTS } from "./heartConfig";
import { SyncService } from "@/features/parent/services/syncService";

export interface HeartStateWithRegen extends HeartState, HeartRegenCalculation {}

/**
 * High-Level Heart Service.
 *
 * Governs all heart mechanics:
 * 1. Offline timestamp-based regeneration (+1 heart per 30 mins).
 * 2. Atomic deductions on eligible mistakes during Progress Mode.
 * 3. Non-punitive practice mode (zero heart loss).
 * 4. Extensible restoration foundation for future rewarded ads or rewards.
 * 5. Deterministic clock injection for testing.
 */
export const HeartService = {
  /**
   * Fetch current heart state with offline regeneration applied.
   * If hearts regenerated, automatically persists the updated state to SQLite.
   */
  async getCurrentHeartState(
    profileId: string,
    now: number = Date.now()
  ): Promise<HeartStateWithRegen> {
    let state = await HeartRepository.getHeartState(profileId);
    if (!state) {
      state = await HeartRepository.initializeHeartState(
        profileId,
        DEFAULT_HEARTS,
        MAX_HEARTS,
        now
      );
    }

    // Calculate regeneration from elapsed time
    const regen = calculateRegeneratedHearts({
      currentHearts: state.currentHearts,
      maxHearts: state.maxHearts,
      lastRegenerationAt: state.lastRegenerationAt,
      now,
    });

    // If hearts were earned or anchor shifted, persist atomically
    if (regen.heartsEarned > 0 || regen.newAnchorMs !== state.lastRegenerationAt) {
      state = await HeartRepository.saveHeartState(
        profileId,
        regen.currentHearts,
        regen.newAnchorMs,
        now
      );
    }

    return {
      ...state,
      ...regen,
    };
  },

  /**
   * Handle an eligible mistake during a lesson.
   *
   * Rules:
   * - In Practice Mode: NO heart is deducted.
   * - In Progress Mode: Deducts at most 1 heart (clamped to 0).
   * - Reaching 0 hearts signals reachedZero without throwing.
   */
  async handleEligibleMistake(input: {
    profileId: string;
    activityId?: string;
    mode?: LessonMode;
    now?: number;
  }): Promise<HeartDeductionResult> {
    const { profileId, activityId, mode = "progress" } = input;
    const now = input.now ?? Date.now();

    // 1. Practice Mode bypass: never consumes hearts
    if (mode === "practice") {
      const state = await this.getCurrentHeartState(profileId, now);
      return {
        heartDeducted: false,
        currentHearts: state.currentHearts,
        maxHearts: state.maxHearts,
        reachedZero: state.currentHearts === 0,
        nextHeartInMs: state.nextHeartInMs,
        message: "Practice mode active: no hearts consumed.",
      };
    }

    // 2. Resolve regenerated state first so child gets any earned hearts
    const liveState = await this.getCurrentHeartState(profileId, now);

    if (liveState.currentHearts <= 0) {
      return {
        heartDeducted: false,
        currentHearts: 0,
        maxHearts: liveState.maxHearts,
        reachedZero: true,
        nextHeartInMs: liveState.nextHeartInMs,
        message: "Already at 0 hearts.",
      };
    }

    // 3. Atomically consume 1 heart
    const { state: updatedState } = await HeartRepository.consumeHeart(
      profileId,
      1,
      {
        delta: -1,
        sourceType: "mistake",
        sourceId: activityId,
      },
      now
    );

    // Queue sync mutation if profile is cloud-bound
    SyncService.enqueueSyncMutation({
      profileId,
      entityType: "heart_state",
      entityId: profileId,
      operation: "upsert",
      payload: updatedState,
    }).catch(() => {});

    // Calculate updated countdown
    const regen = calculateRegeneratedHearts({
      currentHearts: updatedState.currentHearts,
      maxHearts: updatedState.maxHearts,
      lastRegenerationAt: updatedState.lastRegenerationAt,
      now,
    });

    return {
      heartDeducted: true,
      currentHearts: updatedState.currentHearts,
      maxHearts: updatedState.maxHearts,
      reachedZero: updatedState.currentHearts === 0,
      nextHeartInMs: regen.nextHeartInMs,
      message:
        updatedState.currentHearts === 0
          ? "Hearts reached 0."
          : `Heart lost. ${updatedState.currentHearts} remaining.`,
    };
  },

  /**
   * Safe restoration API foundation for future rewarded ads or milestone rewards.
   * NOTE: No ad SDK is called here; this is purely domain logic.
   */
  async restoreHearts(input: HeartRestoreInput): Promise<HeartStateWithRegen> {
    const { profileId, amount, source, sourceId } = input;
    const now = input.now ?? Date.now();

    const state = await HeartRepository.restoreHearts(
      profileId,
      amount,
      {
        delta: amount,
        sourceType: source,
        sourceId,
      },
      now
    );

    // Queue sync mutation if profile is cloud-bound
    SyncService.enqueueSyncMutation({
      profileId,
      entityType: "heart_state",
      entityId: profileId,
      operation: "upsert",
      payload: state,
    }).catch(() => {});

    const regen = calculateRegeneratedHearts({
      currentHearts: state.currentHearts,
      maxHearts: state.maxHearts,
      lastRegenerationAt: state.lastRegenerationAt,
      now,
    });

    return {
      ...state,
      ...regen,
    };
  },

  // ============================================================
  // Development / Testing Utilities
  // ============================================================

  async setHeartsForDev(
    profileId: string,
    amount: number,
    now: number = Date.now()
  ): Promise<HeartStateWithRegen> {
    const state = await HeartRepository.setHeartsForDev(profileId, amount, now);
    return this.getCurrentHeartState(profileId, now);
  },

  async consumeHeartForDev(
    profileId: string,
    now: number = Date.now()
  ): Promise<HeartDeductionResult> {
    return this.handleEligibleMistake({ profileId, mode: "progress", now });
  },

  async restoreHeartForDev(
    profileId: string,
    amount: number = 1,
    now: number = Date.now()
  ): Promise<HeartStateWithRegen> {
    return this.restoreHearts({
      profileId,
      amount,
      source: "dev",
      now,
    });
  },

  async simulateHeartTimeForDev(
    profileId: string,
    minutes: number,
    now: number = Date.now()
  ): Promise<HeartStateWithRegen> {
    const simulatedNow = now + minutes * 60 * 1000;
    return this.getCurrentHeartState(profileId, simulatedNow);
  },
};
