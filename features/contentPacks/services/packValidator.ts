import {
  ContentPackManifest,
  ContentPackCurriculumData,
  ContentPackValidationResult,
} from "../types";
import { computeSha256 } from "./sha256";

export const APP_VERSION = "1.0.0";

export const ALLOWED_ACTIVITY_TYPES = new Set([
  "tap_choice",
  "listening",
  "image_matching",
  "drag_drop",
  "counting",
  "memory",
  "trace_shape",
]);

export const RESERVED_WORLD_IDS = new Set([
  "world-1",
  "koki_village",
  "english_basics",
  "side-quest-english",
]);

export const RESERVED_LESSON_IDS = new Set([
  "demo",
  "kv_001",
  "kv_002",
  "kv_003",
  "kv_004",
  "kv_005",
  "kv_006",
  "kv_007",
  "kv_008",
  "kv_009",
  "kv_010",
  "en_001",
  "en_002",
  "en_003",
]);

export const MAX_PACK_SIZE_BYTES = 150 * 1024 * 1024; // 150 MB
export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

/**
 * Validates a file path to prevent directory traversal and arbitrary writes.
 * Rejects '..', leading slashes, backslashes, colon drives, and null bytes.
 */
export function validatePathSecurity(path: string): boolean {
  if (!path || typeof path !== "string") return false;
  const normalized = path.trim();

  // Must not be empty
  if (normalized.length === 0) return false;

  // Reject path traversal ('..')
  if (normalized.includes("..")) return false;

  // Reject absolute paths or root references
  if (normalized.startsWith("/") || normalized.startsWith("\\")) return false;

  // Reject Windows drive letters / alternate data streams
  if (normalized.includes(":")) return false;

  // Reject null bytes
  if (normalized.includes("\0")) return false;

  // Allow only alphanumeric characters, underscores, hyphens, dots, and internal forward slashes
  const validPathRegex = /^[a-zA-Z0-9_\-\.\/]+$/;
  return validPathRegex.test(normalized);
}

/**
 * Validates that an external content URL strictly uses HTTPS.
 * Rejects insecure HTTP, JavaScript schemes, data URIs, and local file schemes.
 */
export function validateSecureUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim().toLowerCase();
  return trimmed.startsWith("https://");
}

/**
 * Validates semantic version comparison: appVersion >= requiredVersion.
 */
export function validateAppVersion(
  requiredVersion?: string,
  currentAppVersion: string = APP_VERSION
): boolean {
  if (!requiredVersion) return true;

  const parse = (v: string) => v.split(".").map((n) => parseInt(n, 10) || 0);
  const [reqMajor, reqMinor, reqPatch] = parse(requiredVersion);
  const [appMajor, appMinor, appPatch] = parse(currentAppVersion);

  if (appMajor !== reqMajor) return appMajor > reqMajor;
  if (appMinor !== reqMinor) return appMinor > reqMinor;
  return appPatch >= reqPatch;
}

/**
 * Validates whether an activity type is permitted under the security sandbox.
 */
export function validateActivityType(type: string): boolean {
  return ALLOWED_ACTIVITY_TYPES.has(type);
}

/**
 * Validates a ContentPackManifest against security, schema, and collision rules.
 */
export function validateManifest(
  manifest: ContentPackManifest
): ContentPackValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!manifest) {
    return { isValid: false, errors: ["Manifest is null or undefined"], warnings };
  }

  // 1. Basic ID and title checks
  if (!manifest.id || typeof manifest.id !== "string") {
    errors.push("Missing or invalid manifest id");
  } else if (!/^[a-zA-Z0-9_\-]+$/.test(manifest.id)) {
    errors.push(`Invalid manifest id format: "${manifest.id}"`);
  }

  if (typeof manifest.version !== "number" || manifest.version < 1) {
    errors.push("Invalid manifest version");
  }

  if (!manifest.title?.km || !manifest.title?.en) {
    errors.push("Manifest title must have both Khmer (km) and English (en) translations");
  }

  // 2. ID Collision Prevention
  if (manifest.worldId && RESERVED_WORLD_IDS.has(manifest.worldId)) {
    errors.push(`World ID collision with bundled curriculum: "${manifest.worldId}"`);
  }

  // 3. App Version Check
  if (manifest.requiredAppVersion && !validateAppVersion(manifest.requiredAppVersion)) {
    errors.push(
      `Requires app version ${manifest.requiredAppVersion} or higher (current: ${APP_VERSION})`
    );
  }

  // 4. Size Limits Guard
  if (manifest.estimatedSizeBytes > MAX_PACK_SIZE_BYTES) {
    errors.push(
      `Estimated pack size (${manifest.estimatedSizeBytes} bytes) exceeds safety limit of ${MAX_PACK_SIZE_BYTES} bytes`
    );
  }

  // 5. Curriculum file security check
  if (!manifest.curriculumFile) {
    errors.push("Missing curriculumFile descriptor");
  } else {
    if (!validatePathSecurity(manifest.curriculumFile.path)) {
      errors.push(`Unsafe curriculum file path: "${manifest.curriculumFile.path}"`);
    }
    if (manifest.curriculumFile.sizeBytes > MAX_FILE_SIZE_BYTES) {
      errors.push(
        `Curriculum file size (${manifest.curriculumFile.sizeBytes} bytes) exceeds safety limit`
      );
    }
    if (!manifest.curriculumFile.checksum || manifest.curriculumFile.checksum.length !== 64) {
      errors.push("Curriculum file has missing or invalid SHA-256 checksum");
    }
  }

  // 6. Assets list security and path checks
  if (!Array.isArray(manifest.assets)) {
    errors.push("Manifest assets must be an array");
  } else {
    const assetKeys = new Set<string>();
    let totalAssetsSize = 0;

    for (const asset of manifest.assets) {
      if (!asset.key || typeof asset.key !== "string") {
        errors.push("Asset missing key");
        continue;
      }
      if (assetKeys.has(asset.key)) {
        errors.push(`Duplicate asset key inside pack: "${asset.key}"`);
      }
      assetKeys.add(asset.key);

      if (!validatePathSecurity(asset.path)) {
        errors.push(`Unsafe asset path for "${asset.key}": "${asset.path}"`);
      }

      if (!["image", "audio", "data"].includes(asset.type)) {
        errors.push(`Unsupported asset type "${asset.type}" for "${asset.key}"`);
      }

      if (asset.sizeBytes > MAX_FILE_SIZE_BYTES) {
        errors.push(`Asset "${asset.key}" size exceeds max file size limit`);
      }
      totalAssetsSize += asset.sizeBytes || 0;

      if (!asset.checksum || asset.checksum.length !== 64) {
        errors.push(`Asset "${asset.key}" has missing or invalid SHA-256 checksum`);
      }
    }

    if (totalAssetsSize > MAX_PACK_SIZE_BYTES) {
      errors.push(`Total declared asset sizes (${totalAssetsSize} bytes) exceed safety limit`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates parsed curriculum JSON against activity whitelist and lesson ID collisions.
 */
export function validateCurriculumData(
  curriculum: ContentPackCurriculumData,
  manifest: ContentPackManifest
): ContentPackValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!curriculum || typeof curriculum !== "object") {
    return { isValid: false, errors: ["Invalid curriculum payload"], warnings };
  }

  if (!curriculum.lessons || typeof curriculum.lessons !== "object") {
    errors.push("Curriculum is missing lessons dictionary");
    return { isValid: false, errors, warnings };
  }

  const declaredAssetKeys = new Set(manifest.assets.map((a) => a.key));

  for (const [lessonId, lessonDef] of Object.entries(curriculum.lessons)) {
    // Check lesson ID collision
    if (RESERVED_LESSON_IDS.has(lessonId)) {
      errors.push(`Lesson ID collision with bundled lesson: "${lessonId}"`);
    }

    if (!lessonDef.activities || !Array.isArray(lessonDef.activities)) {
      errors.push(`Lesson "${lessonId}" contains no activities array`);
      continue;
    }

    for (let i = 0; i < lessonDef.activities.length; i++) {
      const activity = lessonDef.activities[i];
      if (!activity.type || !validateActivityType(activity.type)) {
        errors.push(
          `Lesson "${lessonId}" activity #${i + 1} uses unauthorized activity type: "${activity.type}"`
        );
      }

      // Check required audio references
      const anyAct = activity as any;
      if (anyAct.audioKey && !declaredAssetKeys.has(anyAct.audioKey)) {
        // If not in pack, verify if it is in bundled audio
        warnings.push(
          `Lesson "${lessonId}" activity #${i + 1} references external audioKey "${anyAct.audioKey}"`
        );
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates the SHA-256 checksum of raw file content against expected checksum.
 */
export async function validateAssetIntegrity(
  content: string,
  expectedChecksum: string
): Promise<boolean> {
  if (!content || !expectedChecksum) return false;
  const computed = await computeSha256(content);
  return computed.toLowerCase() === expectedChecksum.toLowerCase();
}
