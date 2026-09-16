import { AppState, AppStateStatus } from "react-native";
import {
  AudioPlaybackState,
  AudioSettings,
  IAudioService,
  PlayAudioOptions,
  SoundType,
} from "./types";
import { getAudioDefinition, hasAudioKey } from "@/assets/audio/manifests";
import { resolveAudioAsset } from "@/features/contentPacks/services/assetResolver";
import { ParentSettingsService } from "@/features/parent/services/parentSettingsService";

let ExpoAVAudio: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const av = require("expo-av");
  ExpoAVAudio = av?.Audio;
} catch {
  // ExponentAV native module not present
}

let ExpoAudioModule: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ExpoAudioModule = require("expo-audio");
} catch {
  // Safe fallback
}

interface SoundInstance {
  playAsync(): Promise<void>;
  stopAsync(): Promise<void>;
  unloadAsync(): Promise<void>;
  setPositionAsync(pos: number): Promise<void>;
  setOnPlaybackStatusUpdate(callback: (status: any) => void): void;
}

async function createSoundInstance(
  source: any,
  options?: { shouldPlay?: boolean; volume?: number }
): Promise<{ sound: SoundInstance }> {
  // 1. Try modern expo-audio
  if (ExpoAudioModule?.createAudioPlayer) {
    try {
      const player = ExpoAudioModule.createAudioPlayer(source);
      if (options?.volume !== undefined && player) {
        player.volume = options.volume;
      }
      const instance: SoundInstance = {
        playAsync: async () => {
          try {
            player.play();
          } catch {}
        },
        stopAsync: async () => {
          try {
            player.pause();
          } catch {}
        },
        unloadAsync: async () => {
          try {
            player.release();
          } catch {}
        },
        setPositionAsync: async (_pos) => {
          try {
            player.seekTo(0);
          } catch {}
        },
        setOnPlaybackStatusUpdate: (cb) => {
          try {
            player.addListener("playbackStatusUpdate", (status: any) => {
              cb({
                isLoaded: true,
                isPlaying: Boolean(status?.playing),
                didJustFinish: Boolean(status?.playbackState === "ended" || status?.didJustFinish),
                error: status?.error,
              });
            });
          } catch {}
        },
      };

      if (options?.shouldPlay) {
        await instance.playAsync();
      }
      return { sound: instance };
    } catch (err) {
      console.warn("[AudioService] Failed to create expo-audio player, falling back:", err);
    }
  }

  // 2. Try legacy expo-av
  if (ExpoAVAudio?.Sound?.createAsync) {
    try {
      return await ExpoAVAudio.Sound.createAsync(source, options);
    } catch (err) {
      console.warn("[AudioService] Failed to create expo-av sound:", err);
    }
  }

  // 3. Fallback mock instance for headless/unsupported test environments
  const mockInstance: SoundInstance = {
    playAsync: async () => {},
    stopAsync: async () => {},
    unloadAsync: async () => {},
    setPositionAsync: async () => {},
    setOnPlaybackStatusUpdate: (cb) => {
      setTimeout(() => {
        cb({ isLoaded: true, didJustFinish: true, isPlaying: false });
      }, 300);
    },
  };
  return { sound: mockInstance };
}

/**
 * Production Audio & Narration Service for Koki.
 *
 * Implements:
 * - Channel separation: Narration vs. SFX vs. Required Learning Audio
 * - Rapid replay overlap prevention (clean replace & lock)
 * - Required audio bypass (listening lessons play even if narration is disabled)
 * - Parent settings integration
 * - Memory-safe preloading and unmount cleanup
 * - Safe background/foreground AppState lifecycle management
 * - Offline-first bundled asset resolution with future downloaded pack support
 */
class AudioService implements IAudioService {
  private settings: AudioSettings = {
    sfxMuted: false,
    voiceoverMuted: false, // mirrors !narrationEnabled
    musicMuted: false,
    masterVolume: 1.0,
  };

  private narrationEnabled: boolean = true;
  private soundEffectsEnabled: boolean = true;

  // Active narration channel sound instance
  private currentNarrationSound: SoundInstance | null = null;
  private currentNarrationKey: string | null = null;
  private currentNarrationLoading: boolean = false;
  private playbackState: AudioPlaybackState = "idle";
  private playbackStatusListeners: Set<(state: AudioPlaybackState) => void> = new Set();

  // Sound cache for preloaded assets: key -> SoundInstance
  private preloadedSounds: Map<string, SoundInstance> = new Map();

  // Active SFX sounds for auto-cleanup
  private activeSfxSounds: Set<SoundInstance> = new Set();

  // AppState subscription
  private appStateSubscription: any = null;

  constructor() {
    this.configureAudioMode();
    this.subscribeToAppState();
  }

  /**
   * Configure default audio mode for kids games.
   */
  private configureAudioMode(): void {
    try {
      if (ExpoAudioModule?.setAudioModeAsync) {
        ExpoAudioModule.setAudioModeAsync({
          playsInSilentMode: true,
        }).catch((err: any) => {
          console.warn("[AudioService] Failed to set initial expo-audio mode:", err);
        });
      } else if (ExpoAVAudio?.setAudioModeAsync) {
        ExpoAVAudio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        }).catch((err: any) => {
          console.warn("[AudioService] Failed to set initial expo-av mode:", err);
        });
      }
    } catch {
      // safe ignore
    }
  }

  /**
   * Pause/stop narration when app moves to background.
   */
  private subscribeToAppState(): void {
    if (this.appStateSubscription) return;
    this.appStateSubscription = AppState.addEventListener(
      "change",
      (nextAppState: AppStateStatus) => {
        if (nextAppState === "background" || nextAppState === "inactive") {
          this.stopNarration().catch(() => {});
        }
      }
    );
  }

  /**
   * Sync settings with SQLite parent preferences for active child profile.
   */
  public async syncWithParentSettings(profileId: string): Promise<void> {
    try {
      const audioPrefs = await ParentSettingsService.getAudioSettings(profileId);
      this.narrationEnabled = audioPrefs.narrationEnabled;
      this.soundEffectsEnabled = audioPrefs.soundEffectsEnabled;
      this.settings.voiceoverMuted = !audioPrefs.narrationEnabled;
      this.settings.sfxMuted = !audioPrefs.soundEffectsEnabled;
    } catch (err) {
      console.warn("[AudioService] Failed to sync parent settings:", err);
    }
  }

  private setPlaybackState(state: AudioPlaybackState): void {
    this.playbackState = state;
    this.playbackStatusListeners.forEach((listener) => {
      try {
        listener(state);
      } catch (e) {
        // safe ignore
      }
    });
  }

  public getPlaybackState(): AudioPlaybackState {
    return this.playbackState;
  }

  public addPlaybackListener(listener: (state: AudioPlaybackState) => void): () => void {
    this.playbackStatusListeners.add(listener);
    return () => this.playbackStatusListeners.delete(listener);
  }

  // ---------------------------------------------------------------------------
  // Audio Source Resolver (Bundled assets or downloaded local file paths)
  // ---------------------------------------------------------------------------
  private resolveSource(file: any): any {
    if (typeof file === "string") {
      return { uri: file };
    }
    return file; // Bundled require() asset module
  }

  // ---------------------------------------------------------------------------
  // Narration Channel
  // ---------------------------------------------------------------------------

  /**
   * Play narration audio by stable audio key.
   * Replaces any existing narration clip immediately.
   */
  public async playNarration(key: string, options?: PlayAudioOptions): Promise<void> {
    if (!key) return;

    // Check required audio bypass:
    // If not required and narration is disabled by parent, suppress
    const isRequired = options?.isRequired ?? false;
    if (!isRequired && !this.narrationEnabled) {
      return;
    }

    const definition = resolveAudioAsset(key);
    if (!definition) {
      console.warn(`[AudioService] Audio key not found in manifest: "${key}"`);
      options?.onPlaybackStatusUpdate?.("error");
      return;
    }

    // Overlap prevention: if already loading this exact key, don't trigger duplicate
    if (this.currentNarrationLoading && this.currentNarrationKey === key) {
      return;
    }

    try {
      this.currentNarrationLoading = true;
      this.setPlaybackState("loading");
      options?.onPlaybackStatusUpdate?.("loading");

      // Stop & unload previous narration
      await this.stopNarration();

      this.currentNarrationKey = key;
      let sound: SoundInstance;

      // Check if sound was preloaded
      if (this.preloadedSounds.has(key)) {
        sound = this.preloadedSounds.get(key)!;
        await sound.setPositionAsync(0);
      } else {
        const source = this.resolveSource(definition.file);
        const { sound: newSound } = await createSoundInstance(source, {
          shouldPlay: false,
          volume: (options?.volume ?? 1.0) * (definition.volumeMultiplier ?? 1.0) * this.settings.masterVolume,
        });
        sound = newSound;
      }

      this.currentNarrationSound = sound;
      this.currentNarrationLoading = false;

      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded) {
          if (status.error) {
            this.setPlaybackState("error");
            options?.onPlaybackStatusUpdate?.("error");
          }
          return;
        }

        if (status.didJustFinish) {
          this.setPlaybackState("ready");
          options?.onPlaybackStatusUpdate?.("ready");
        } else if (status.isPlaying) {
          this.setPlaybackState("playing");
          options?.onPlaybackStatusUpdate?.("playing");
        }
      });

      this.setPlaybackState("playing");
      options?.onPlaybackStatusUpdate?.("playing");
      await sound.playAsync();
    } catch (error) {
      this.currentNarrationLoading = false;
      this.setPlaybackState("error");
      options?.onPlaybackStatusUpdate?.("error");
      console.warn(`[AudioService] Error playing narration "${key}":`, error);
    }
  }

  /**
   * Play required learning audio (e.g. listening prompt "hear Ka").
   * Crucial rule: Always plays even if parent disabled optional narration.
   */
  public async playRequiredAudio(key: string, options?: PlayAudioOptions): Promise<void> {
    return this.playNarration(key, { ...options, isRequired: true });
  }

  /**
   * Stop and unload active narration channel.
   */
  public async stopNarration(): Promise<void> {
    if (this.currentNarrationSound) {
      try {
        await this.currentNarrationSound.stopAsync();
        // Only unload if it's not in the persistent preload cache
        const isPreloaded = Array.from(this.preloadedSounds.values()).includes(this.currentNarrationSound);
        if (!isPreloaded) {
          await this.currentNarrationSound.unloadAsync();
        }
      } catch (e) {
        // Safe ignore
      } finally {
        this.currentNarrationSound = null;
        this.currentNarrationKey = null;
        this.currentNarrationLoading = false;
        this.setPlaybackState("ready");
      }
    }
  }

  // ---------------------------------------------------------------------------
  // SFX Channel
  // ---------------------------------------------------------------------------

  /**
   * Play short sound effect by stable audio key.
   * Plays independently without interrupting the narration channel.
   */
  public async playSfx(key: string, volume: number = 1.0): Promise<void> {
    if (!this.soundEffectsEnabled || this.settings.sfxMuted) {
      return;
    }

    const definition = resolveAudioAsset(key);
    if (!definition) {
      console.warn(`[AudioService] SFX key not found in manifest: "${key}"`);
      return;
    }

    try {
      let sound: SoundInstance;

      if (this.preloadedSounds.has(key)) {
        sound = this.preloadedSounds.get(key)!;
        await sound.setPositionAsync(0);
        await sound.playAsync();
      } else {
        const source = this.resolveSource(definition.file);
        const { sound: newSound } = await createSoundInstance(
          source,
          {
            shouldPlay: true,
            volume: volume * (definition.volumeMultiplier ?? 1.0) * this.settings.masterVolume,
          }
        );

        this.activeSfxSounds.add(newSound);
        newSound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            newSound.unloadAsync().catch(() => {});
            this.activeSfxSounds.delete(newSound);
          }
        });
      }
    } catch (error) {
      console.warn(`[AudioService] Error playing SFX "${key}":`, error);
    }
  }

  // ---------------------------------------------------------------------------
  // Preloading & Memory Safety
  // ---------------------------------------------------------------------------

  /**
   * Preload audio keys for an upcoming lesson or activity.
   */
  public async preloadAudio(keys: string[]): Promise<void> {
    if (!keys || keys.length === 0) return;

    for (const key of keys) {
      if (this.preloadedSounds.has(key)) {
        continue;
      }

      try {
        const definition = resolveAudioAsset(key);
        if (!definition) continue;

        const source = this.resolveSource(definition.file);
        const { sound } = await createSoundInstance(source, { shouldPlay: false });
        this.preloadedSounds.set(key, sound);
      } catch (e) {
        // Safe non-blocking preload failure
        console.warn(`[AudioService] Failed to preload audio "${key}":`, e);
      }
    }
  }

  /**
   * Unload specific audio keys or clean up after lesson ends.
   */
  public async unloadLessonAudio(keys?: string[]): Promise<void> {
    await this.stopNarration();

    if (keys && keys.length > 0) {
      for (const key of keys) {
        const sound = this.preloadedSounds.get(key);
        if (sound) {
          try {
            await sound.unloadAsync();
          } catch (e) {}
          this.preloadedSounds.delete(key);
        }
      }
    } else {
      await this.clearCache();
    }
  }

  /**
   * Unload and clear all preloaded and active sounds.
   */
  public async clearCache(): Promise<void> {
    await this.stopNarration();

    for (const [key, sound] of this.preloadedSounds.entries()) {
      try {
        await sound.unloadAsync();
      } catch (e) {}
    }
    this.preloadedSounds.clear();

    for (const sound of this.activeSfxSounds) {
      try {
        await sound.unloadAsync();
      } catch (e) {}
    }
    this.activeSfxSounds.clear();
  }

  // ---------------------------------------------------------------------------
  // Settings & Toggles
  // ---------------------------------------------------------------------------

  public setNarrationEnabled(enabled: boolean): void {
    this.narrationEnabled = enabled;
    this.settings.voiceoverMuted = !enabled;
    if (!enabled) {
      this.stopNarration().catch(() => {});
    }
  }

  public setSoundEffectsEnabled(enabled: boolean): void {
    this.soundEffectsEnabled = enabled;
    this.settings.sfxMuted = !enabled;
  }

  public isNarrationEnabled(): boolean {
    return this.narrationEnabled;
  }

  public isSoundEffectsEnabled(): boolean {
    return this.soundEffectsEnabled;
  }

  // Backward compatibility
  public async playVoiceover(uri: string): Promise<void> {
    if (!this.narrationEnabled) return;
    try {
      await this.stopNarration();
      const { sound } = await createSoundInstance(
        { uri },
        { shouldPlay: true, volume: this.settings.masterVolume }
      );
      this.currentNarrationSound = sound;
    } catch (error) {
      console.warn("[AudioService] Error playing voiceover:", error);
    }
  }

  public async stopVoiceover(): Promise<void> {
    return this.stopNarration();
  }

  public setMuted(type: SoundType, muted: boolean): void {
    if (type === "sfx") this.setSoundEffectsEnabled(!muted);
    if (type === "voiceover") this.setNarrationEnabled(!muted);
    if (type === "music") this.settings.musicMuted = muted;
  }

  public isMuted(type: SoundType): boolean {
    if (type === "sfx") return !this.soundEffectsEnabled;
    if (type === "voiceover") return !this.narrationEnabled;
    if (type === "music") return this.settings.musicMuted;
    return false;
  }
}

export const audioService = new AudioService();
export { AudioService };
