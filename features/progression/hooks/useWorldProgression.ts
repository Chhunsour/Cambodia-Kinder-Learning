import { useState, useEffect, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import { WorldDefinition } from "@/features/adventure/types";
import { WorldProgressSummary, NextLessonInfo } from "../types";
import { ProgressionService } from "../services/progressionService";

interface UseWorldProgressionReturn {
  world: WorldDefinition | null;
  summary: WorldProgressSummary | null;
  nextLesson: NextLessonInfo | null;
  totalStars: number;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

/**
 * Hook to consume active child's world progression and stats.
 * Automatically refreshes whenever screen regains focus (e.g. returning from Results).
 */
export function useWorldProgression(
  worldId = "world-1"
): UseWorldProgressionReturn {
  const { profile } = useActiveProfile();
  const [world, setWorld] = useState<WorldDefinition | null>(null);
  const [summary, setSummary] = useState<WorldProgressSummary | null>(null);
  const [nextLesson, setNextLesson] = useState<NextLessonInfo | null>(null);
  const [totalStars, setTotalStars] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const profileId = profile?.id;

  const loadProgression = useCallback(async () => {
    if (!profileId) {
      setWorld(null);
      setSummary(null);
      setNextLesson(null);
      setTotalStars(0);
      setIsLoading(false);
      return;
    }

    try {
      const [worldDef, summaryData, nextLessonData, stars] = await Promise.all([
        ProgressionService.deriveWorldDefinition(profileId, worldId),
        ProgressionService.getWorldProgressSummary(profileId, worldId),
        ProgressionService.getNextLesson(profileId, worldId),
        ProgressionService.getTotalStars(profileId),
      ]);

      setWorld(worldDef);
      setSummary(summaryData);
      setNextLesson(nextLessonData);
      setTotalStars(stars);
    } catch (err) {
      console.warn("[useWorldProgression] Error loading progression:", err);
    } finally {
      setIsLoading(false);
    }
  }, [profileId, worldId]);

  // Initial load when profile or world changes
  useEffect(() => {
    setIsLoading(true);
    loadProgression();
  }, [loadProgression]);

  // Immediate refresh when screen is focused (e.g. returning from Results to Adventure or Home)
  useFocusEffect(
    useCallback(() => {
      loadProgression();
    }, [loadProgression])
  );

  return {
    world,
    summary,
    nextLesson,
    totalStars,
    isLoading,
    refresh: loadProgression,
  };
}
