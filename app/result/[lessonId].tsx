import React, { useMemo, useEffect, useRef, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { KokiScreen } from "@/components/ui/KokiScreen";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import { Palette } from "@/constants/theme";
import { lessonResultStore } from "@/features/lessons/services/lessonResultService";
import { LessonResult } from "@/features/lessons/types";
import { LessonResultView } from "@/features/lessons/components/LessonResultView";
import { ProgressionService } from "@/features/progression/services/progressionService";
import { CoinService, CoinRewardResult } from "@/features/wallet";
import { StreakService, StreakRecordResult } from "@/features/streak";

export default function LessonResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    lessonId: string;
    stars?: string;
    activities?: string;
    mistakes?: string;
    mode?: string;
    trackId?: string;
    origin?: string;
  }>();

  const { profile } = useActiveProfile();
  const hasSavedRef = useRef<boolean>(false);
  const [rewardResult, setRewardResult] = useState<CoinRewardResult | null>(null);
  const [streakResult, setStreakResult] = useState<StreakRecordResult | null>(null);

  const cleanId = useMemo(() => {
    if (Array.isArray(params.lessonId)) {
      return params.lessonId[0];
    }
    return params.lessonId || "demo";
  }, [params.lessonId]);

  const isPractice = params.mode === "practice";
  const targetWorldId =
    params.trackId || (cleanId.startsWith("en_") ? "english_basics" : "world-1");

  // Retrieve stored lesson result, or construct safe fallback from route params
  const result: LessonResult = useMemo(() => {
    const stored = lessonResultStore.get(cleanId);
    if (stored) {
      return stored;
    }

    // Safe fallback if navigated directly or after page refresh
    const parsedStars = params.stars ? parseInt(params.stars, 10) : 3;
    const safeStars: 1 | 2 | 3 =
      parsedStars >= 3 ? 3 : parsedStars === 2 ? 2 : 1;
    const activitiesCount = params.activities
      ? Math.max(1, parseInt(params.activities, 10))
      : 5;
    const mistakesCount = params.mistakes
      ? Math.max(0, parseInt(params.mistakes, 10))
      : 0;

    return {
      lessonId: cleanId,
      totalActivities: activitiesCount,
      completedActivities: activitiesCount,
      totalAttempts: activitiesCount + mistakesCount,
      mistakes: mistakesCount,
      starsEarned: safeStars,
      completedAt: Date.now(),
    };
  }, [cleanId, params.stars, params.activities, params.mistakes]);

  // Persist progression & award coins to SQLite on mount
  useEffect(() => {
    if (!profile?.id || hasSavedRef.current) return;
    hasSavedRef.current = true;

    // Practice mode does NOT unlock progression nodes or farm milestone coins
    if (isPractice) {
      // Record daily learning streak & companion pet progression
      StreakService.recordLessonStreak({
        profileId: profile.id,
      })
        .then((streak) => {
          setStreakResult(streak);
        })
        .catch((err) => {
          console.warn(
            `[LessonResultScreen] Failed to record streak for profile "${profile.id}":`,
            err
          );
        });
      return;
    }

    // 1. Record lesson progression & star milestones
    ProgressionService.recordCompletedLesson({
      profileId: profile.id,
      lessonId: cleanId,
      worldId: targetWorldId,
      stars: result.starsEarned,
      attempts: result.totalAttempts,
      mistakes: result.mistakes,
    }).catch((err) => {
      console.warn(
        `[LessonResultScreen] Failed to persist progress for lesson "${cleanId}":`,
        err
      );
    });

    // 2. Award lesson coins (safe against duplicate rewards via unique milestone records)
    CoinService.awardLessonCoins({
      profileId: profile.id,
      lessonId: cleanId,
      starsEarned: result.starsEarned,
    })
      .then((reward) => {
        setRewardResult(reward);
      })
      .catch((err) => {
        console.warn(
          `[LessonResultScreen] Failed to award coins for lesson "${cleanId}":`,
          err
        );
      });

    // 3. Record daily learning streak & companion pet progression
    StreakService.recordLessonStreak({
      profileId: profile.id,
    })
      .then((streak) => {
        setStreakResult(streak);
      })
      .catch((err) => {
        console.warn(
          `[LessonResultScreen] Failed to record streak for profile "${profile.id}":`,
          err
        );
      });
  }, [
    profile?.id,
    cleanId,
    targetWorldId,
    result.starsEarned,
    result.totalAttempts,
    result.mistakes,
    isPractice,
  ]);

  const handleContinue = () => {
    if (params.origin === "english_side_quest" || cleanId.startsWith("en_")) {
      router.replace("/side-quest/english");
      return;
    }
    // Return child to Adventure Map where updated progress displays immediately
    router.replace("/(main)/adventure");
  };

  const handlePlayAgain = () => {
    // Replay current lesson with fresh state and preserved context
    const queryParts: string[] = [];
    if (isPractice) queryParts.push("mode=practice");
    if (params.trackId) queryParts.push(`trackId=${encodeURIComponent(params.trackId)}`);
    if (params.origin) queryParts.push(`origin=${encodeURIComponent(params.origin)}`);
    const qs = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";
    router.replace(`/lesson/${cleanId}${qs}`);
  };

  return (
    <KokiScreen scrollable={false} backgroundColor={Palette.warmCream}>
      <LessonResultView
        lessonId={cleanId}
        result={result}
        childNickname={profile?.nickname}
        profileId={profile?.id}
        rewardResult={rewardResult}
        streakResult={streakResult}
        onContinue={handleContinue}
        onPlayAgain={handlePlayAgain}
        onSaveProgress={() => router.push("/parent")}
      />
    </KokiScreen>
  );
}
