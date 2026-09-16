import { AudioAssetDefinition } from "@/services/audio/types";

/**
 * Koki Character Audio Manifest.
 *
 * Mascot voice lines for greetings, encouragement, celebration, and feedback.
 */
export const KOKI_MANIFEST: Record<string, AudioAssetDefinition> = {
  koki_great_job: {
    key: "koki_great_job",
    locale: "km",
    voice: "koki",
    category: "feedback",
    file: require("../files/koki_great_job_v1.m4a"),
    transcript: "Great job!",
    reviewStatus: "approved",
    durationMs: 750,
    version: 1,
  },
  koki_try_again: {
    key: "koki_try_again",
    locale: "km",
    voice: "koki",
    category: "feedback",
    file: require("../files/koki_try_again_v1.m4a"),
    transcript: "Try again!",
    reviewStatus: "approved",
    durationMs: 700,
    version: 1,
  },
  koki_lets_go: {
    key: "koki_lets_go",
    locale: "km",
    voice: "koki",
    category: "dialogue",
    file: require("../files/koki_lets_go_v1.m4a"),
    transcript: "Let's go!",
    reviewStatus: "approved",
    durationMs: 650,
    version: 1,
  },
  koki_you_did_it: {
    key: "koki_you_did_it",
    locale: "km",
    voice: "koki",
    category: "feedback",
    file: require("../files/koki_you_did_it_v1.m4a"),
    transcript: "You did it!",
    reviewStatus: "approved",
    durationMs: 800,
    version: 1,
  },
  koki_welcome: {
    key: "koki_welcome",
    locale: "km",
    voice: "koki",
    category: "dialogue",
    file: require("../files/koki_welcome_v1.m4a"),
    transcript: "Welcome to Koki Village!",
    reviewStatus: "approved",
    durationMs: 1200,
    version: 1,
  },
};
