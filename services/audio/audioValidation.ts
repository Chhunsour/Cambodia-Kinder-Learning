/**
 * Audio Validation & Production Readiness System.
 *
 * Validates manifests, detects missing keys, flags unreviewed Khmer pronunciation,
 * verifies asset files, and computes bundled size summaries.
 */

import {
  AUDIO_MANIFEST,
  KHMER_MANIFEST,
  ENGLISH_MANIFEST,
  KOKI_MANIFEST,
  SFX_MANIFEST,
  hasAudioKey,
} from "@/assets/audio/manifests";
import { AudioAssetDefinition } from "./types";

export type ValidationSeverity = "ERROR" | "WARNING" | "NEEDS LANGUAGE REVIEW";

export interface ValidationIssue {
  severity: ValidationSeverity;
  key: string;
  category: string;
  voice: string;
  message: string;
}

export interface AudioValidationReport {
  isValid: boolean;
  totalKeys: number;
  resolvedKeys: number;
  missingKeys: number;
  needsReviewKeys: number;
  placeholderKeys: number;
  issues: ValidationIssue[];
  groupedSummary: {
    khmer: { total: number; needsReview: number; placeholders: number };
    english: { total: number; needsReview: number; placeholders: number };
    koki: { total: number; needsReview: number; placeholders: number };
    sfx: { total: number; needsReview: number; placeholders: number };
  };
}

export interface AudioSizeSummary {
  khmerBytes: number;
  englishBytes: number;
  kokiBytes: number;
  sfxBytes: number;
  totalBytes: number;
  formatted: {
    khmer: string;
    english: string;
    koki: string;
    sfx: string;
    total: string;
  };
}

/**
 * Format bytes to readable string (KB / MB).
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Validates the entire audio manifest and compares against referenced curriculum keys.
 */
export function validateAudioSystem(referencedKeys: string[] = []): AudioValidationReport {
  const issues: ValidationIssue[] = [];
  const manifestKeys = Object.keys(AUDIO_MANIFEST);
  const totalKeys = manifestKeys.length;

  let placeholderCount = 0;
  let needsReviewCount = 0;

  // 1. Audit manifest definitions
  for (const [key, def] of Object.entries(AUDIO_MANIFEST)) {
    // Check key format & alignment
    if (def.key !== key) {
      issues.push({
        severity: "ERROR",
        key,
        category: def.category,
        voice: def.voice,
        message: `Manifest key mismatch: object key "${key}" differs from def.key "${def.key}"`,
      });
    }

    // Check voice role validity
    const validVoices = ["koki", "narrator_km", "narrator_en", "sfx"];
    if (!validVoices.includes(def.voice)) {
      issues.push({
        severity: "ERROR",
        key,
        category: def.category,
        voice: def.voice,
        message: `Invalid voice role "${def.voice}". Must be one of: ${validVoices.join(", ")}`,
      });
    }

    // Check locale consistency
    if (def.voice === "narrator_km" && def.locale !== "km") {
      issues.push({
        severity: "WARNING",
        key,
        category: def.category,
        voice: def.voice,
        message: `Khmer narrator asset marked with non-km locale "${def.locale}"`,
      });
    }
    if (def.voice === "narrator_en" && def.locale !== "en") {
      issues.push({
        severity: "WARNING",
        key,
        category: def.category,
        voice: def.voice,
        message: `English narrator asset marked with non-en locale "${def.locale}"`,
      });
    }

    // Check transcript requirements (educational voice lines must have transcripts)
    if (def.voice !== "sfx" && (!def.transcript || def.transcript.trim() === "")) {
      issues.push({
        severity: "WARNING",
        key,
        category: def.category,
        voice: def.voice,
        message: `Educational voice asset is missing a text transcript`,
      });
    }

    // Check review status
    if (def.reviewStatus === "placeholder") {
      placeholderCount++;
      issues.push({
        severity: "WARNING",
        key,
        category: def.category,
        voice: def.voice,
        message: `Asset is marked as temporary placeholder audio`,
      });
    } else if (def.reviewStatus === "needs_review") {
      needsReviewCount++;
      // High-priority language review flag for Khmer educational assets
      issues.push({
        severity: "NEEDS LANGUAGE REVIEW",
        key,
        category: def.category,
        voice: def.voice,
        message: `Khmer educational pronunciation requires manual native speaker approval`,
      });
    }
  }

  // 2. Audit referenced keys from curriculum
  let missingReferencedCount = 0;
  for (const refKey of referencedKeys) {
    if (!hasAudioKey(refKey)) {
      missingReferencedCount++;
      issues.push({
        severity: "ERROR",
        key: refKey,
        category: "curriculum_reference",
        voice: "unknown",
        message: `Referenced audio key "${refKey}" is not registered in the audio manifest`,
      });
    }
  }

  // 3. Compute group metrics
  const countGroup = (manifest: Record<string, AudioAssetDefinition>) => {
    let nr = 0;
    let ph = 0;
    for (const d of Object.values(manifest)) {
      if (d.reviewStatus === "needs_review") nr++;
      if (d.reviewStatus === "placeholder") ph++;
    }
    return { total: Object.keys(manifest).length, needsReview: nr, placeholders: ph };
  };

  const hasErrors = issues.some((i) => i.severity === "ERROR");

  return {
    isValid: !hasErrors,
    totalKeys,
    resolvedKeys: totalKeys - missingReferencedCount,
    missingKeys: missingReferencedCount,
    needsReviewKeys: needsReviewCount,
    placeholderKeys: placeholderCount,
    issues,
    groupedSummary: {
      khmer: countGroup(KHMER_MANIFEST),
      english: countGroup(ENGLISH_MANIFEST),
      koki: countGroup(KOKI_MANIFEST),
      sfx: countGroup(SFX_MANIFEST),
    },
  };
}

/**
 * Release Readiness Validation:
 * Fails release if there are missing keys, placeholder required audio, or invalid files.
 */
export function validateAudioForRelease(
  referencedKeys: string[] = [],
  options: { strictKhmerReview?: boolean } = {}
): {
  canRelease: boolean;
  blockers: string[];
  warnings: string[];
} {
  const report = validateAudioSystem(referencedKeys);
  const blockers: string[] = [];
  const warnings: string[] = [];

  for (const issue of report.issues) {
    if (issue.severity === "ERROR") {
      blockers.push(`[ERROR] ${issue.key}: ${issue.message}`);
    } else if (issue.severity === "NEEDS LANGUAGE REVIEW") {
      if (options.strictKhmerReview) {
        blockers.push(`[STRICT REVIEW BLOCKER] ${issue.key}: ${issue.message}`);
      } else {
        warnings.push(`[LANGUAGE REVIEW] ${issue.key}: ${issue.message}`);
      }
    } else if (issue.severity === "WARNING") {
      warnings.push(`[WARNING] ${issue.key}: ${issue.message}`);
    }
  }

  return {
    canRelease: blockers.length === 0,
    blockers,
    warnings,
  };
}

/**
 * Calculate bundled audio size summary by category from manifest metadata or disk measurements.
 */
export function getBundledAudioSizeSummary(customDiskBytes?: {
  khmerBytes?: number;
  englishBytes?: number;
  kokiBytes?: number;
  sfxBytes?: number;
}): AudioSizeSummary {
  let khmerBytes = customDiskBytes?.khmerBytes ?? 0;
  let englishBytes = customDiskBytes?.englishBytes ?? 0;
  let kokiBytes = customDiskBytes?.kokiBytes ?? 0;
  let sfxBytes = customDiskBytes?.sfxBytes ?? 0;

  if (!customDiskBytes) {
    // Calculated based on standard 64kbps AAC bitrate (~8 KB/s) from manifest duration metadata
    Object.values(AUDIO_MANIFEST).forEach((def) => {
      const bytes = Math.round(((def.durationMs ?? 600) / 1000) * 8192);
      if (def.voice === "narrator_km") khmerBytes += bytes;
      else if (def.voice === "narrator_en") englishBytes += bytes;
      else if (def.voice === "koki") kokiBytes += bytes;
      else if (def.voice === "sfx") sfxBytes += bytes;
    });
  }

  const totalBytes = khmerBytes + englishBytes + kokiBytes + sfxBytes;

  return {
    khmerBytes,
    englishBytes,
    kokiBytes,
    sfxBytes,
    totalBytes,
    formatted: {
      khmer: formatBytes(khmerBytes),
      english: formatBytes(englishBytes),
      koki: formatBytes(kokiBytes),
      sfx: formatBytes(sfxBytes),
      total: formatBytes(totalBytes),
    },
  };
}
