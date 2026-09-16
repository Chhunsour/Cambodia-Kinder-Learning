import { MapNodeData, MapNodeType, WorldDefinition, IslandTheme } from "../adventure/types";
import { LessonProgress } from "@/storage/repositories/lessonProgressRepository";

export interface UnlockRequirement {
  type: "complete_level" | "complete_lessons" | "always_unlocked";
  levelNumber?: number;
  lessonIds?: string[];
}

export interface CanonicalNode {
  id: string;
  order: number; // 1, 2, 3... for lessons; sequence order for special nodes
  type: MapNodeType;
  levelNumber?: number;
  lessonId?: string;
  titleKm: string;
  titleEn: string;
  descriptionKm?: string;
  descriptionEn?: string;
  sideQuestTopic?: string;
  branchSide?: "left" | "right";
  unlockRequirement?: UnlockRequirement;
}

export interface CanonicalCurriculum {
  worldId: string;
  worldNumber: number;
  nameKm: string;
  nameEn: string;
  theme: IslandTheme;
  nodes: CanonicalNode[];
}

export interface WorldProgressSummary {
  worldId: string;
  completedLessons: number;
  totalLessons: number;
  starsEarned: number;
  maxStars: number;
  currentLessonId: string | null;
  currentLevelNumber: number;
}

export interface TrackProgressSummary {
  trackId: string;
  completedLessons: number;
  totalLessons: number;
  starsEarned: number;
  maxStars: number;
  currentLessonId: string | null;
  currentLevelNumber: number;
}

export interface RecordLessonCompletionInput {
  profileId: string;
  lessonId: string;
  worldId?: string;
  stars: 1 | 2 | 3;
  attempts?: number;
  mistakes?: number;
}

export interface ProgressionResult {
  progress: LessonProgress;
  isNewCompletion: boolean;
  isBestScoreImproved: boolean;
  previousBestStars: number;
  newBestStars: 1 | 2 | 3;
  unlockedNextLessonId: string | null;
}

export interface NextLessonInfo {
  lessonId: string;
  levelNumber: number;
  nodeId: string;
  titleKm: string;
  titleEn: string;
}
