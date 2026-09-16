import { AudioAssetDefinition } from "@/services/audio/types";
import { SFX_MANIFEST } from "./sfx";
import { KOKI_MANIFEST } from "./koki";
import { ENGLISH_MANIFEST } from "./english";
import { KHMER_MANIFEST } from "./khmer";

/**
 * Central Production Audio Manifest Registry for Koki.
 *
 * Provides single source of truth for all bundled and local audio assets.
 * Curriculum files reference stable keys (e.g. "khmer_letter_ka", "sfx_correct_chime")
 * rather than raw asset filenames or require() handles.
 */
export const AUDIO_MANIFEST: Record<string, AudioAssetDefinition> = {
  ...SFX_MANIFEST,
  ...KOKI_MANIFEST,
  ...ENGLISH_MANIFEST,
  ...KHMER_MANIFEST,
};

/**
 * Lookup audio asset definition by stable audio key.
 */
export function getAudioDefinition(key: string): AudioAssetDefinition | undefined {
  if (!key) return undefined;
  return AUDIO_MANIFEST[key];
}

/**
 * Check if a stable audio key exists in the manifest.
 */
export function hasAudioKey(key: string): boolean {
  if (!key) return false;
  return key in AUDIO_MANIFEST;
}

/**
 * Retrieve all registered audio keys.
 */
export function getAllAudioKeys(): string[] {
  return Object.keys(AUDIO_MANIFEST);
}

export { SFX_MANIFEST, KOKI_MANIFEST, ENGLISH_MANIFEST, KHMER_MANIFEST };
