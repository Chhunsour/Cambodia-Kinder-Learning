import { CanonicalCurriculum } from "../types";

/**
 * Canonical Curriculum for World 1: Koki Village.
 *
 * Serves as the single source of truth for level ordering, lesson metadata,
 * and future special node unlock requirements.
 */
export const KOKI_VILLAGE_CURRICULUM: CanonicalCurriculum = {
  worldId: "world-1",
  worldNumber: 1,
  nameKm: "ភូមិកូគី",
  nameEn: "Koki Village",
  theme: "koki_village",
  nodes: [
    {
      id: "node-1",
      order: 1,
      type: "lesson",
      levelNumber: 1,
      lessonId: "kv_001",
      titleKm: "ពណ៌ និងរូបរាង",
      titleEn: "Colors & Shapes",
      unlockRequirement: { type: "always_unlocked" },
    },
    {
      id: "node-2",
      order: 2,
      type: "lesson",
      levelNumber: 2,
      lessonId: "kv_002",
      titleKm: "លេខ ១ ដល់ ៥",
      titleEn: "Numbers 1 to 5",
      unlockRequirement: { type: "complete_level", levelNumber: 1 },
    },
    {
      id: "node-treasure-1",
      order: 3,
      type: "treasure",
      titleKm: "កំណប់ស្វាគមន៍",
      titleEn: "Welcome Treasure",
      descriptionKm: "អបអរសាទរ! ប្អូនបានបើកកាដូដំបូងបង្អស់នៅក្នុងភូមិកូគី!",
      descriptionEn: "Hooray! You opened your first treasure chest in Koki Village!",
      unlockRequirement: { type: "complete_level", levelNumber: 2 },
    },
    {
      id: "node-3",
      order: 4,
      type: "lesson",
      levelNumber: 3,
      lessonId: "kv_003",
      titleKm: "ស្រៈខ្មែរដំបូង",
      titleEn: "First Khmer Vowels",
      unlockRequirement: { type: "complete_level", levelNumber: 2 },
    },
    {
      id: "node-4",
      order: 5,
      type: "lesson",
      levelNumber: 4,
      lessonId: "kv_004",
      titleKm: "សត្វក្នុងភូមិ",
      titleEn: "Village Animals",
      unlockRequirement: { type: "complete_level", levelNumber: 3 },
    },
    {
      id: "node-english-1",
      order: 6,
      type: "sideQuest",
      branchSide: "left",
      titleKm: "ពណ៌ជាភាសាអង់គ្លេស",
      titleEn: "Colors in English",
      sideQuestTopic: "Colors & Greetings",
      descriptionKm: "ដំណើរផ្សងព្រេងបន្ថែមដើម្បីរៀនពាក្យអង់គ្លេសសប្បាយៗ!",
      descriptionEn: "Optional side quest exploring fun English vocabulary!",
      unlockRequirement: { type: "complete_level", levelNumber: 4 },
    },
    {
      id: "node-5",
      order: 7,
      type: "lesson",
      levelNumber: 5,
      lessonId: "kv_005",
      titleKm: "តួអក្សរ ក ខ គ",
      titleEn: "Letters Ka Kha Ko",
      unlockRequirement: { type: "complete_level", levelNumber: 4 },
    },
    {
      id: "node-challenge-1",
      order: 8,
      type: "challenge",
      titleKm: "ការប្រកួតភូមិកូគី",
      titleEn: "Koki Village Challenge",
      descriptionKm: "ប្រកួតសាកល្បងចំណេះដឹងដើម្បីឆ្លងទៅតំបន់បន្ទាប់!",
      descriptionEn: "Checkpoint challenge testing everything learned so far!",
      unlockRequirement: { type: "complete_level", levelNumber: 5 },
    },
    {
      id: "node-6",
      order: 9,
      type: "lesson",
      levelNumber: 6,
      lessonId: "kv_006",
      titleKm: "រាប់ផ្លែឈើ",
      titleEn: "Counting Fruits",
      unlockRequirement: { type: "complete_level", levelNumber: 5 },
    },
    {
      id: "node-7",
      order: 10,
      type: "lesson",
      levelNumber: 7,
      lessonId: "kv_007",
      titleKm: "គ្រួសាររបស់ខ្ញុំ",
      titleEn: "My Family",
      unlockRequirement: { type: "complete_level", levelNumber: 6 },
    },
    {
      id: "node-treasure-2",
      order: 11,
      type: "treasure",
      titleKm: "កំណប់មេឃភ្លឺ",
      titleEn: "Sunshine Treasure",
      descriptionKm: "រៀនបន្តដើម្បីបើកប្រអប់កំណប់ពិសេសនេះ!",
      descriptionEn: "Complete more lessons to unlock this special treasure!",
      unlockRequirement: { type: "complete_level", levelNumber: 7 },
    },
    {
      id: "node-8",
      order: 12,
      type: "lesson",
      levelNumber: 8,
      lessonId: "kv_008",
      titleKm: "ទំហំ ធំ និងតូច",
      titleEn: "Big & Small",
      unlockRequirement: { type: "complete_level", levelNumber: 7 },
    },
    {
      id: "node-english-2",
      order: 13,
      type: "sideQuest",
      branchSide: "right",
      titleKm: "លេខជាភាសាអង់គ្លេស",
      titleEn: "Numbers in English",
      sideQuestTopic: "Counting 1-10",
      descriptionKm: "ដំណើរផ្សងព្រេងភាសាអង់គ្លេសកម្រិត ២!",
      descriptionEn: "English Adventure side quest Part 2!",
      unlockRequirement: { type: "complete_level", levelNumber: 8 },
    },
    {
      id: "node-9",
      order: 14,
      type: "lesson",
      levelNumber: 9,
      lessonId: "kv_009",
      titleKm: "សំឡេងសត្វ",
      titleEn: "Animal Sounds",
      unlockRequirement: { type: "complete_level", levelNumber: 8 },
    },
    {
      id: "node-10",
      order: 15,
      type: "lesson",
      levelNumber: 10,
      lessonId: "kv_010",
      titleKm: "រាងធរណីមាត្រ",
      titleEn: "Geometric Shapes",
      unlockRequirement: { type: "complete_level", levelNumber: 9 },
    },
    {
      id: "node-challenge-2",
      order: 16,
      type: "challenge",
      titleKm: "ការប្រកួតកំពូលជើងឯក",
      titleEn: "Grand Champion Challenge",
      descriptionKm: "ប្រកួតធំចុងក្រោយបង្អស់ក្នុងភូមិកូគី!",
      descriptionEn: "Grand finale checkpoint before entering World 2!",
      unlockRequirement: { type: "complete_level", levelNumber: 10 },
    },
  ],
};

import { ENGLISH_BASICS_CURRICULUM } from "./englishCurriculum";

export const ALL_CURRICULA: Record<string, CanonicalCurriculum> = {
  "world-1": KOKI_VILLAGE_CURRICULUM,
  koki_village: KOKI_VILLAGE_CURRICULUM,
  english_basics: ENGLISH_BASICS_CURRICULUM,
  "side-quest-english": ENGLISH_BASICS_CURRICULUM,
};

/**
 * Normalizes lesson ID to canonical format (mapping "demo" to "kv_001").
 */
export function normalizeLessonId(lessonId: string): string {
  if (lessonId === "demo" || lessonId === "kv_001") {
    return "kv_001";
  }
  return lessonId;
}

import { contentPackService } from "@/features/contentPacks/services/contentPackService";

/**
 * Retrieve canonical curriculum definition for a given worldId or trackId.
 * Checks bundled curricula first, then dynamically registered installed content packs.
 */
export function getCurriculum(worldId: string): CanonicalCurriculum {
  if (ALL_CURRICULA[worldId]) {
    return ALL_CURRICULA[worldId];
  }
  const downloadedWorld = contentPackService.getInstalledWorld(worldId);
  if (downloadedWorld) {
    return downloadedWorld;
  }
  return KOKI_VILLAGE_CURRICULUM;
}

/**
 * Get all available worlds (bundled + downloaded).
 */
export function getAvailableWorlds(): CanonicalCurriculum[] {
  const downloadedWorlds = contentPackService.getAllInstalledWorlds();
  return [KOKI_VILLAGE_CURRICULUM, ...downloadedWorlds];
}
