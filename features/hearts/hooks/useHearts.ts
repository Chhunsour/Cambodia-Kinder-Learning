import { useState, useEffect, useCallback, useRef } from "react";
import { useFocusEffect } from "expo-router";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import { HeartStateWithRegen, HeartService } from "../services/heartService";
import { HeartDeductionResult } from "../types";
import { DEFAULT_HEARTS, MAX_HEARTS } from "../services/heartConfig";
import { LessonMode } from "@/features/lessons/types";

export interface UseHeartsReturn {
  currentHearts: number;
  maxHearts: number;
  nextHeartInMs: number | null;
  fullRegenInMs: number | null;
  isFull: boolean;
  isLoading: boolean;
  state: HeartStateWithRegen | null;
  refresh: () => Promise<void>;
  consumeHeart: (activityId?: string, mode?: LessonMode) => Promise<HeartDeductionResult>;
}

export function useHearts(): UseHeartsReturn {
  const { profile } = useActiveProfile();
  const profileId = profile?.id;

  const [state, setState] = useState<HeartStateWithRegen | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadData = useCallback(async () => {
    if (!profileId) {
      setState(null);
      setIsLoading(false);
      return;
    }

    try {
      const data = await HeartService.getCurrentHeartState(profileId);
      setState(data);
    } catch (err) {
      console.warn("[useHearts] Failed to load heart data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    setIsLoading(true);
    loadData();
  }, [loadData]);

  // Refresh on screen focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Lightweight 30-second interval ticker when hearts are not full
  useEffect(() => {
    if (state && !state.isFull) {
      tickerRef.current = setInterval(() => {
        if (profileId) {
          HeartService.getCurrentHeartState(profileId).then(setState).catch(() => {});
        }
      }, 30000);
    }

    return () => {
      if (tickerRef.current) {
        clearInterval(tickerRef.current);
        tickerRef.current = null;
      }
    };
  }, [state?.isFull, profileId]);

  const consumeHeart = useCallback(
    async (activityId?: string, mode: LessonMode = "progress"): Promise<HeartDeductionResult> => {
      if (!profileId) {
        return {
          heartDeducted: false,
          currentHearts: 0,
          maxHearts: MAX_HEARTS,
          reachedZero: true,
          nextHeartInMs: null,
        };
      }

      const result = await HeartService.handleEligibleMistake({
        profileId,
        activityId,
        mode,
      });

      // Update local state immediately
      setState((prev) =>
        prev
          ? {
              ...prev,
              currentHearts: result.currentHearts,
              nextHeartInMs: result.nextHeartInMs,
              isFull: result.currentHearts >= prev.maxHearts,
            }
          : null
      );

      return result;
    },
    [profileId]
  );

  return {
    currentHearts: state?.currentHearts ?? DEFAULT_HEARTS,
    maxHearts: state?.maxHearts ?? MAX_HEARTS,
    nextHeartInMs: state?.nextHeartInMs ?? null,
    fullRegenInMs: state?.fullRegenInMs ?? null,
    isFull: state?.isFull ?? true,
    isLoading,
    state,
    refresh: loadData,
    consumeHeart,
  };
}
