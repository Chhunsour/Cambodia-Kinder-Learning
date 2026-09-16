/**
 * Types for Koki Home Screen state and preview data.
 */

export interface CurrentLessonPreview {
  id: string;
  subject: "khmer" | "english" | "math";
  titleKey: string;
  lessonKey: string;
  letterCharacter?: string;
  starsEarned: number;
  totalStars: number;
  route: string;
}

export interface EnglishQuestPreview {
  id: string;
  titleKey: string;
  topicKey: string;
  actionKey: string;
  route: string;
}

export interface HomePreviewState {
  streak: number;
  stars: number;
  coins: number;
  continueLevelKey: string;
  continueRoute: string;
  currentLesson: CurrentLessonPreview;
  lessonsUntilTreasure: number;
  englishQuest: EnglishQuestPreview;
}
