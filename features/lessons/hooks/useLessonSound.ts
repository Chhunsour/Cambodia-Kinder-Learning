import { useCallback } from "react";
import { audioService } from "@/services/audio/audioService";

/**
 * Lesson Sound Hook.
 *
 * Connects lesson events to the centralized production audio service:
 * - Playful celebratory chime on correct answer ("sfx_correct_chime")
 * - Soft, gentle bounce tone on incorrect attempt ("sfx_incorrect_gentle")
 * - Spoken question prompt / instruction playback via narration channel
 * - Koki mascot voice line reactions
 */
export function useLessonSound() {
  const playCorrectSound = useCallback(async () => {
    await audioService.playSfx("sfx_correct_chime");
  }, []);

  const playIncorrectSound = useCallback(async () => {
    await audioService.playSfx("sfx_incorrect_gentle");
  }, []);

  const playInstructionAudio = useCallback(async (audioKey?: string) => {
    if (!audioKey) return;
    await audioService.playNarration(audioKey);
  }, []);

  const playKokiVoice = useCallback(async (mood: string) => {
    let key: string | null = null;
    switch (mood) {
      case "correct":
      case "celebration":
        key = "koki_great_job";
        break;
      case "tryAgain":
      case "incorrect":
        key = "koki_try_again";
        break;
      case "encouraging":
        key = "koki_lets_go";
        break;
      default:
        break;
    }
    if (key) {
      await audioService.playNarration(key);
    }
  }, []);

  return {
    playCorrectSound,
    playIncorrectSound,
    playInstructionAudio,
    playKokiVoice,
  };
}
