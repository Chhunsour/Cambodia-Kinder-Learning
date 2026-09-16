import { CanonicalCurriculum } from "../types";

/**
 * Canonical Curriculum for English Basics Side Quest.
 *
 * Provides a gentle, optional, highly visual English learning track.
 * Progress operates independently from the main Khmer-first Adventure Map.
 */
export const ENGLISH_BASICS_CURRICULUM: CanonicalCurriculum = {
  worldId: "english_basics",
  worldNumber: 1,
  nameKm: "ដំណើរផ្សងព្រេងភាសាអង់គ្លេស",
  nameEn: "English Adventure",
  theme: "english_sky",
  nodes: [
    {
      id: "node-en-1",
      order: 1,
      type: "lesson",
      levelNumber: 1,
      lessonId: "en_001",
      titleKm: "ការស្វាគមន៍",
      titleEn: "Greetings",
      unlockRequirement: { type: "always_unlocked" },
    },
    {
      id: "node-en-2",
      order: 2,
      type: "lesson",
      levelNumber: 2,
      lessonId: "en_002",
      titleKm: "ពណ៌ស្រស់ស្អាត",
      titleEn: "Colors",
      unlockRequirement: { type: "complete_level", levelNumber: 1 },
    },
    {
      id: "node-en-treasure-1",
      order: 3,
      type: "treasure",
      titleKm: "ប្រអប់ផ្កាយអង់គ្លេស",
      titleEn: "English Star Chest",
      descriptionKm: "អបអរសាទរ! ប្អូនបានរៀនពាក្យស្វាគមន៍ និងពណ៌យ៉ាងស្ទាត់ជំនាញ!",
      descriptionEn: "Hooray! You mastered Greetings and Colors in English!",
      unlockRequirement: { type: "complete_level", levelNumber: 2 },
    },
    {
      id: "node-en-3",
      order: 4,
      type: "lesson",
      levelNumber: 3,
      lessonId: "en_003",
      titleKm: "លេខ ១ ដល់ ៥",
      titleEn: "Numbers 1 to 5",
      unlockRequirement: { type: "complete_level", levelNumber: 2 },
    },
    {
      id: "node-en-4",
      order: 5,
      type: "lesson",
      levelNumber: 4,
      lessonId: "en_004",
      titleKm: "សត្វគួរឱ្យស្រឡាញ់",
      titleEn: "Animals",
      unlockRequirement: { type: "complete_level", levelNumber: 3 },
    },
    {
      id: "node-en-5",
      order: 6,
      type: "lesson",
      levelNumber: 5,
      lessonId: "en_005",
      titleKm: "ផ្លែឈើ និងម្ហូប",
      titleEn: "Food & Fruits",
      unlockRequirement: { type: "complete_level", levelNumber: 4 },
    },
    {
      id: "node-en-6",
      order: 7,
      type: "challenge",
      levelNumber: 6,
      lessonId: "en_006",
      titleKm: "ពិធីជប់លៀងរំលឹកមេរៀន",
      titleEn: "Review Party",
      descriptionKm: "ប្រកួតសាកល្បងពាក្យអង់គ្លេសទាំងអស់ដែលបានរៀនកន្លងមក!",
      descriptionEn: "Showcase all the fun English words you learned so far!",
      unlockRequirement: { type: "complete_level", levelNumber: 5 },
    },
  ],
};
