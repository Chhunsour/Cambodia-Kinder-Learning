import { AudioAssetDefinition } from "@/services/audio/types";
import { getAudioDefinition, hasAudioKey } from "@/assets/audio/manifests";
import { contentPackService } from "./contentPackService";

/**
 * Unified Asset Resolver for Koki.
 *
 * Provides single point of resolution for both audio and image assets.
 * Resolution hierarchy:
 * 1. Installed downloaded content pack asset
 * 2. Bundled application asset
 * 3. Safe missing-asset fallback
 */

export function resolveAudioAsset(key: string): AudioAssetDefinition | undefined {
  if (!key) return undefined;

  // 1. Check installed downloaded content packs
  const downloadedPath = contentPackService.resolveAudioPath(key);
  if (downloadedPath) {
    return {
      key,
      locale: "none",
      voice: "narrator_en",
      category: "instruction",
      file: downloadedPath, // String path handled by AudioService as { uri: path }
      reviewStatus: "approved",
      durationMs: 2000,
    };
  }

  // 2. Check bundled audio manifest
  if (hasAudioKey(key)) {
    return getAudioDefinition(key);
  }

  // 3. Missing asset fallback
  return undefined;
}

export interface ImageSourceResolved {
  uri?: string;
  isBundled?: boolean;
}

/**
 * Resolves an image asset key to either a remote/file URI or bundled resource handle.
 */
export function resolveImageAsset(key: string): any {
  if (!key) return null;

  // 1. Check installed downloaded content packs
  const downloadedPath = contentPackService.resolveImagePath(key);
  if (downloadedPath) {
    return { uri: downloadedPath };
  }

  // 2. Check bundled local assets (if registered)
  // (Future bundled images can be mapped here)

  // 3. Fallback: null
  return null;
}
