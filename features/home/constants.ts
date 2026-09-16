import { HomePreviewState } from "./types";

/**
 * Centralized Home Preview State.
 *
 * NOTE: These placeholder values represent future backend, progression,
 * and lesson systems. All temporary values must remain here until replaced
 * by their real corresponding services in future prompts.
 *
 * DO NOT scatter raw numbers or unpersisted preview mock data in screen components.
 */
export const HOME_PREVIEW_STATE: HomePreviewState = {
  // TODO: Replace with real streak engine & SQLite persistence
  streak: 3,

  // TODO: Replace with real star economy & lesson completion aggregation
  stars: 24,

  // TODO: Replace with real coin wallet & reward transactions
  coins: 120,

  // TODO: Replace with active child's current chapter / level progress
  continueLevelKey: "home.continueSubtitle",
  continueRoute: "/lesson/demo",

  // Current learning card preview
  // TODO: Replace with real next lesson recommendation from syllabus engine
  currentLesson: {
    id: "khmer-lesson-01",
    subject: "khmer",
    titleKey: "home.khmerLetters",
    lessonKey: "home.learnLetter",
    letterCharacter: "ក",
    starsEarned: 2,
    totalStars: 3,
    route: "/lesson/khmer-letter-ka",
  },

  // Reward anticipation preview
  // TODO: Replace with treasure box milestone calculator
  lessonsUntilTreasure: 2,

  // Optional English side quest preview
  // TODO: Replace with optional side-quest selector
  englishQuest: {
    id: "english-animals-01",
    titleKey: "home.englishQuestTitle",
    topicKey: "home.englishQuestTopic",
    actionKey: "home.englishQuestAction",
    route: "/lesson/demo-english",
  },
};
