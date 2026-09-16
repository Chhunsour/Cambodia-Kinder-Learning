import { LearningBand } from "@/types/user";
import { IslandTheme } from "@/features/adventure/types";
import { CanonicalCurriculum } from "@/features/progression/types";
import { LessonDefinition } from "@/features/lessons/types";

export type ContentPackStatus =
  | "not_downloaded"
  | "downloading"
  | "installed"
  | "update_available"
  | "failed";

export interface ContentPackFile {
  path: string; // Relative path inside pack directory (e.g. "curriculum.json")
  sizeBytes: number;
  checksum: string; // SHA-256 hex string
}

export interface ContentPackAsset {
  key: string; // Unique asset key (e.g. "audio_jungle_tiger", "image_jungle_bg")
  type: "image" | "audio" | "data";
  path: string; // Relative path inside pack (e.g. "audio/tiger.m4a", "images/bg.png")
  sizeBytes: number;
  checksum: string; // SHA-256 hex string
  required?: boolean; // If true, pack cannot install without this file. Default: true
}

export interface LocalizedContent {
  km: string;
  en: string;
}

export interface ContentPackManifest {
  id: string; // Globally unique identifier (e.g. "tiny-test-adventure")
  version: number; // Pack distribution version (e.g. 1, 2)
  contentVersion: number; // Pedagogical content revision
  title: LocalizedContent;
  description?: LocalizedContent;
  worldId?: string; // Optional new world ID (e.g. "world-tiny-test")
  trackId?: string; // Optional track ID (e.g. "tiny_track")
  theme?: IslandTheme;
  ageBands: LearningBand[]; // e.g. ["explorer", "adventurer"]
  estimatedSizeBytes: number;
  curriculumFile: ContentPackFile;
  assets: ContentPackAsset[];
  checksum: string; // SHA-256 of manifest or package descriptor
  requiredAppVersion?: string; // e.g. "1.0.0"
}

export interface ContentPackCurriculumData {
  world?: CanonicalCurriculum;
  lessons: Record<string, LessonDefinition>;
}

export interface DownloadProgress {
  packId: string;
  downloadedBytes: number;
  totalBytes: number;
  percent: number; // 0 to 100 integer or float
}

export interface DownloadOptions {
  onProgress?: (progress: DownloadProgress) => void;
  signal?: AbortSignal;
}

export interface ContentPackValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}
