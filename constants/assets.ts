/**
 * Centralized Asset Registry for Koki
 * Provides type-safe references to images, icons, sound effects, and mascot sprites.
 */
export const AssetRegistry = {
  icons: {
    continueLearning: require("@/assets/icons/continue-learning.svg"),
  },
  images: {
    learningIsland: require("@/assets/images/learning-island.svg"),
  },
  audio: {
    // SFX keys for future audio loading
    tap: "sfx_tap",
    star: "sfx_star",
    success: "sfx_success",
    whoosh: "sfx_whoosh",
    celebration: "sfx_celebration",
  },
  koki: {
    idle: "koki_idle",
    happy: "koki_happy",
    cheer: "koki_cheer",
    thinking: "koki_thinking",
  },
} as const;
