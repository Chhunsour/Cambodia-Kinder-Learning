/**
 * Audio and Narration Production System Types for Koki.
 */

export type AudioLocale = "km" | "en" | "none";

export type AudioVoiceRole = "koki" | "narrator_km" | "narrator_en" | "sfx";

export type AudioCategory =
  | "instruction"
  | "letter"
  | "word"
  | "number"
  | "feedback"
  | "dialogue"
  | "sfx";

export type AudioReviewStatus = "approved" | "needs_review" | "placeholder";

export type AudioPlaybackState = "idle" | "loading" | "ready" | "playing" | "error";

export type SoundType = "sfx" | "voiceover" | "music";

export interface AudioAssetDefinition {
  key: string;
  locale: AudioLocale;
  voice: AudioVoiceRole;
  category: AudioCategory;
  file: any;
  transcript?: string;
  reviewStatus: AudioReviewStatus;
  durationMs?: number;
  volumeMultiplier?: number;
  version?: number;
}

export interface PlayAudioOptions {
  /**
   * If true, this audio is essential to the learning task (e.g. listening prompt)
   * and must play even if optional narration is disabled in parent settings.
   */
  isRequired?: boolean;
  volume?: number;
  onPlaybackStatusUpdate?: (status: AudioPlaybackState) => void;
}

export interface AudioSettings {
  sfxMuted: boolean;
  voiceoverMuted: boolean;
  musicMuted: boolean;
  masterVolume: number;
}

export interface IAudioService {
  playNarration(key: string, options?: PlayAudioOptions): Promise<void>;
  playRequiredAudio(key: string, options?: PlayAudioOptions): Promise<void>;
  playSfx(key: string, volume?: number): Promise<void>;
  stopNarration(): Promise<void>;
  preloadAudio(keys: string[]): Promise<void>;
  unloadLessonAudio(keys?: string[]): Promise<void>;
  clearCache(): Promise<void>;
  setNarrationEnabled(enabled: boolean): void;
  setSoundEffectsEnabled(enabled: boolean): void;
  isNarrationEnabled(): boolean;
  isSoundEffectsEnabled(): boolean;
  getPlaybackState(): AudioPlaybackState;

  // Backward compatibility
  playVoiceover(uri: string): Promise<void>;
  setMuted(type: SoundType, muted: boolean): void;
  isMuted(type: SoundType): boolean;
}
