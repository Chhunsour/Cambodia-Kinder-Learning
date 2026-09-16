import { HeartRegenCalculation } from "../types";
import { MAX_HEARTS, HEART_REGEN_INTERVAL_MS } from "./heartConfig";

export interface CalculateRegenInput {
  currentHearts: number;
  maxHearts?: number;
  lastRegenerationAt: number;
  now?: number;
}

/**
 * Pure offline heart regeneration calculation based on timestamps.
 *
 * Guarantees:
 * 1. +1 heart every 30 minutes up to max (5).
 * 2. Capped strictly to maxHearts. Anchor resets when max hearts is reached.
 * 3. Safe against device clock moving backwards (clamps without corruption or infinite hearts).
 * 4. Deterministic and fully unit testable with injected timestamps.
 */
export function calculateRegeneratedHearts(input: CalculateRegenInput): HeartRegenCalculation {
  const maxHearts = input.maxHearts ?? MAX_HEARTS;
  const currentHearts = Math.max(0, Math.min(maxHearts, input.currentHearts));
  const now = input.now ?? Date.now();
  const lastRegenAt = input.lastRegenerationAt;

  // 1. If already at or above max hearts, no regeneration needed
  if (currentHearts >= maxHearts) {
    return {
      currentHearts: maxHearts,
      maxHearts,
      newAnchorMs: now,
      heartsEarned: 0,
      nextHeartInMs: null,
      fullRegenInMs: null,
      isFull: true,
    };
  }

  // 2. Defensive handling: Clock moved backwards (now < lastRegenAt)
  if (now < lastRegenAt) {
    const missing = maxHearts - currentHearts;
    const nextHeartInMs = HEART_REGEN_INTERVAL_MS;
    const fullRegenInMs = nextHeartInMs + (missing - 1) * HEART_REGEN_INTERVAL_MS;

    return {
      currentHearts,
      maxHearts,
      newAnchorMs: now, // Reset anchor safely to current time
      heartsEarned: 0,
      nextHeartInMs,
      fullRegenInMs,
      isFull: false,
    };
  }

  // 3. Normal time progression
  const elapsedMs = now - lastRegenAt;
  const intervals = Math.floor(elapsedMs / HEART_REGEN_INTERVAL_MS);

  if (intervals > 0) {
    const potentialHearts = currentHearts + intervals;

    if (potentialHearts >= maxHearts) {
      // Reached max hearts! Clear/reset anchor to now
      return {
        currentHearts: maxHearts,
        maxHearts,
        newAnchorMs: now,
        heartsEarned: maxHearts - currentHearts,
        nextHeartInMs: null,
        fullRegenInMs: null,
        isFull: true,
      };
    }

    // Partially regenerated
    const newHearts = potentialHearts;
    const remainderMs = elapsedMs % HEART_REGEN_INTERVAL_MS;
    const newAnchorMs = now - remainderMs;
    const nextHeartInMs = HEART_REGEN_INTERVAL_MS - remainderMs;
    const missing = maxHearts - newHearts;
    const fullRegenInMs = nextHeartInMs + (missing - 1) * HEART_REGEN_INTERVAL_MS;

    return {
      currentHearts: newHearts,
      maxHearts,
      newAnchorMs,
      heartsEarned: intervals,
      nextHeartInMs,
      fullRegenInMs,
      isFull: false,
    };
  }

  // Less than 1 interval elapsed
  const nextHeartInMs = Math.max(0, HEART_REGEN_INTERVAL_MS - elapsedMs);
  const missing = maxHearts - currentHearts;
  const fullRegenInMs = nextHeartInMs + (missing - 1) * HEART_REGEN_INTERVAL_MS;

  return {
    currentHearts,
    maxHearts,
    newAnchorMs: lastRegenAt,
    heartsEarned: 0,
    nextHeartInMs,
    fullRegenInMs,
    isFull: false,
  };
}
