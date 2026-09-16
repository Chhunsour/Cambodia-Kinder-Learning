import { useState, useEffect, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import { LearningStreak, StreakPet, PetStage, StreakRecordResult } from "../types";
import { StreakService } from "../services/streakService";

export interface UseStreakReturn {
  streak: LearningStreak | null;
  currentStreak: number;
  longestStreak: number;
  pet: StreakPet | null;
  petStage: PetStage;
  isLoading: boolean;
  refresh: () => Promise<void>;
  recordLessonStreak: (referenceDate?: Date) => Promise<StreakRecordResult>;
}

export function useStreak(): UseStreakReturn {
  const { profile } = useActiveProfile();
  const profileId = profile?.id;

  const [streak, setStreak] = useState<LearningStreak | null>(null);
  const [pet, setPet] = useState<StreakPet | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadData = useCallback(async () => {
    if (!profileId) {
      setStreak(null);
      setPet(null);
      setIsLoading(false);
      return;
    }

    try {
      const data = await StreakService.getStreakAndPet(profileId);
      setStreak(data.streak);
      setPet(data.pet);
    } catch (err) {
      console.warn("[useStreak] Failed to load streak data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    setIsLoading(true);
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const recordLessonStreak = useCallback(
    async (referenceDate?: Date): Promise<StreakRecordResult> => {
      if (!profileId) {
        return {
          streakUpdated: false,
          currentStreak: 0,
          longestStreak: 0,
          isNewMilestone: false,
          newMilestone: null,
          petGrew: false,
          newPetStage: null,
          message: "No active profile",
        };
      }

      const result = await StreakService.recordLessonStreak({
        profileId,
        referenceDate,
      });

      // Reload fresh state immediately
      await loadData();
      return result;
    },
    [profileId, loadData]
  );

  return {
    streak,
    currentStreak: streak?.currentStreak ?? 0,
    longestStreak: streak?.longestStreak ?? 0,
    pet,
    petStage: pet?.currentStage ?? "egg",
    isLoading,
    refresh: loadData,
    recordLessonStreak,
  };
}
