/**
 * Types for Koki Lesson Session engine, activities, and feedback lifecycle.
 */

export type LessonSubject =
  | "khmer_alphabet"
  | "numbers"
  | "colors_shapes"
  | "everyday_words"
  | "english";

export type ActivityLifecycleState =
  | "presenting"  // Ready for child interaction
  | "correct"     // Child picked correct answer, locked, positive feedback, Continue active
  | "incorrect"   // Child picked wrong answer, gentle feedback, retry enabled
  | "completed";  // All activities in lesson completed

export type KokiFeedbackMood =
  | "neutral"
  | "encouraging"
  | "correct"
  | "tryAgain"
  | "celebration";

export type TapChoiceLayout = "auto" | "text" | "image" | "image_label";

export interface TapChoiceOption {
  id: string;
  label?: string;            // Text label e.g. "ក" or "Red"
  labelText?: string;        // Backward compatible alias
  labelKm?: string;          // Explicit localized Khmer label
  labelEn?: string;          // Explicit localized English label
  labelKey?: string;         // Localization key fallback
  helperKm?: string;         // Subtle Khmer helper support e.g. "ផ្លែប៉ោម"
  helperText?: string;       // Secondary helper text
  imageKey?: string;         // Bundled local image asset key
  icon?: string;             // Emoji / icon placeholder e.g. "🔴", "🐘"
  colorHex?: string;         // Color hex for color swatch cards
  isCorrect?: boolean;       // Optional inline flag
  audioKey?: string;         // Optional audio key played on tap
  accessibilityLabel?: string;
}

export interface TapChoiceActivityData {
  id: string;
  type: "tap_choice" | "choice" | "listening";
  instruction?: string;      // Fallback instruction text
  instructionKm?: string;    // Explicit localized Khmer instruction
  instructionEn?: string;    // Explicit localized English instruction
  instructionKey?: string;   // Localization translation key
  instructionAudioKey?: string; // Spoken instruction narration key
  promptText?: string;       // Optional large prompt text / character e.g. "ក"
  promptImageKey?: string;   // Optional prompt image key
  promptIcon?: string;       // Optional prompt icon e.g. "🍎🍎🍎"
  promptKey?: string;        // Legacy promptKey support
  promptParams?: Record<string, string | number>;
  characterVisual?: string;  // Legacy characterVisual support
  audioKey?: string;         // Required prompt audio key for listening activities e.g. "khmer_letter_ka"
  autoplayAudio?: boolean;   // Attempt autoplay on mount (default true for listening)
  options: TapChoiceOption[];
  correctOptionId: string;
  layout?: TapChoiceLayout;
  columns?: 1 | 2 | 3;
}

export type ChoiceOption = TapChoiceOption;

export interface MatchingItem {
  id: string;
  label?: string;            // Text label
  labelKm?: string;          // Localized Khmer label
  labelEn?: string;          // Localized English label
  labelKey?: string;         // Localization key fallback
  helperKm?: string;         // Subtle Khmer helper support
  imageKey?: string;         // Bundled local image asset key
  icon?: string;             // Emoji / symbol placeholder e.g. "🐘", "🐕"
  colorHex?: string;         // Color swatch hex
  audioKey?: string;         // Optional audio key readiness
  accessibilityLabel?: string;
}

export interface MatchingPair {
  id: string;
  left: MatchingItem;
  right: MatchingItem;
}

export interface ImageMatchingActivityData {
  id: string;
  type: "image_matching";
  instruction?: string;      // Fallback instruction text
  instructionKm?: string;    // Localized Khmer instruction
  instructionEn?: string;    // Localized English instruction
  instructionKey?: string;   // Localization translation key
  instructionAudioKey?: string;
  audioKey?: string;
  promptText?: string;
  promptIcon?: string;
  pairs: MatchingPair[];
  shuffleRight?: boolean;
}

export interface DragItem {
  id: string;
  label?: string;            // Text label
  labelKm?: string;          // Localized Khmer label
  labelEn?: string;          // Localized English label
  labelKey?: string;         // Localization key fallback
  imageKey?: string;         // Bundled local image asset key
  icon?: string;             // Emoji / symbol placeholder e.g. "🍎", "ក"
  colorHex?: string;         // Color swatch hex
  audioKey?: string;         // Optional audio key played on interaction
  correctTargetId: string;   // ID of the target this item belongs to
  accessibilityLabel?: string;
}

export interface DropZoneTarget {
  id: string;
  label?: string;            // Target label e.g. "Basket A"
  labelKm?: string;
  labelEn?: string;
  labelKey?: string;
  icon?: string;             // Target icon e.g. "🧺"
  colorHex?: string;         // Background accent
  acceptsItemIds?: string[]; // Valid item IDs that belong in this zone
  accessibilityLabel?: string;
}

export type DropTargetData = DropZoneTarget;

export interface DragDropActivityData {
  id: string;
  type: "drag_drop";
  instruction?: string;
  instructionKm?: string;
  instructionEn?: string;
  instructionKey?: string;
  instructionAudioKey?: string;
  audioKey?: string;
  promptText?: string;
  promptIcon?: string;
  items: DragItem[];
  targets: DropTargetData[];
  layout?: "vertical" | "horizontal" | "slots";
}

export interface DragDropPlacement {
  itemId: string;
  targetId: string;
}

export interface DragDropAttemptReport {
  activityId: string;
  itemId: string;
  targetId: string;
  isCorrect: boolean;
  attemptNumber: number;
  completedPlacementsCount: number;
  totalPlacementsCount: number;
}

export interface DragDropCompletionResult {
  activityId: string;
  correct: boolean;
  attempts: number;
  mistakes: number;
  completedPlacements: number;
}

export interface CountingActivityData {
  id: string;
  type: "counting";
  instruction?: string;      // Fallback instruction text
  instructionKm?: string;    // Localized Khmer instruction
  instructionEn?: string;    // Localized English instruction
  instructionKey?: string;   // Localization translation key
  instructionAudioKey?: string;
  audioKey?: string;
  count: number;             // Expected correct count (1-10)
  targetCount?: number;
  objectIcon?: string;       // Emoji / icon for the counted object e.g. "🍎", "⭐", "🐟", "🌸"
  itemIcon?: string;
  objectImageKey?: string;   // Optional bundled image key
  itemImageKey?: string;
  objectLabelKm?: string;    // Object label e.g. "ផ្លែប៉ោម"
  itemLabelKm?: string;
  objectLabelEn?: string;    // Object label e.g. "apples"
  itemLabelEn?: string;
  options: number[];         // 2-4 numeric choices e.g. [2, 3, 4]
  layout?: "rows" | "scattered" | "grouped" | "grid";
  enableHintAfterAttempts?: number; // Default 2
}

export interface MemoryCardContent {
  id: string;
  label?: string;            // Text label e.g. "Apple", "ក"
  labelKm?: string;          // Localized Khmer label
  labelEn?: string;          // Localized English label
  labelKey?: string;         // Localization key fallback
  icon?: string;             // Emoji / icon e.g. "🐘", "🍎"
  imageKey?: string;         // Bundled image asset key
  colorHex?: string;         // Color swatch hex
  audioKey?: string;         // Optional audio key played when card is flipped
  accessibilityLabel?: string;
}

export interface MemoryPair {
  id: string;
  matchKey?: string;
  first: MemoryCardContent;
  second: MemoryCardContent;
}

export interface MemoryActivityData {
  id: string;
  type: "memory";
  instruction?: string;      // Fallback instruction text
  instructionKm?: string;    // Localized Khmer instruction
  instructionEn?: string;    // Localized English instruction
  instructionKey?: string;   // Localization translation key
  instructionAudioKey?: string;
  audioKey?: string;
  pairs: MemoryPair[];
  shuffle?: boolean;         // Default true
  revealDurationMs?: number; // Default 1000ms
}

export type LessonActivity =
  | TapChoiceActivityData
  | ImageMatchingActivityData
  | DragDropActivityData
  | CountingActivityData
  | MemoryActivityData;

export interface LessonDefinition {
  id: string;
  titleKey: string;
  titleKm?: string;
  titleEn?: string;
  subject: LessonSubject;
  trackId?: string;
  learningBands?: ("explorer" | "adventurer" | "champion")[];
  unitId?: string;
  unitTitleKm?: string;
  unitTitleEn?: string;
  activities: LessonActivity[];
}

export type LessonMode = "progress" | "practice";

export interface LessonSessionState {
  currentActivityIndex: number;
  totalActivities: number;
  lifecycleState: ActivityLifecycleState;
  selectedOptionId: string | null;
  attemptsCount: number;
  isCompleted: boolean;
  mode?: LessonMode;
  hearts?: number;
}

export interface AttemptReport {
  activityId: string;
  selectedOptionId: string;
  correct: boolean;
  attemptNumber: number;
  heartEligible?: boolean;
}

export interface MatchingAttemptReport {
  activityId: string;
  leftItemId: string;
  rightItemId: string;
  isMatch: boolean;
  attemptNumber: number;
  completedPairsCount: number;
  totalPairsCount: number;
  heartEligible?: boolean;
}

export interface MatchingCompletionResult {
  activityId: string;
  correct: boolean;
  attempts: number;
  mistakes: number;
  completedPairs: number;
}

export interface ActivityResult {
  activityId: string;
  attempts: number;
  isCorrect: boolean;
  timeSpentMs?: number;
}

export interface CountingAttemptReport {
  activityId: string;
  expectedCount: number;
  selectedAnswer: number;
  isCorrect: boolean;
  attemptNumber: number;
  mistakesCount: number;
}

export interface CountingCompletionResult {
  activityId: string;
  correct: boolean;
  attempts: number;
  mistakes: number;
  expectedCount: number;
  selectedAnswer: number;
}

export interface MemoryAttemptReport {
  activityId: string;
  firstCardId: string;
  secondCardId: string;
  isMatch: boolean;
  attemptNumber: number;
  pairsMatchedCount: number;
  totalPairsCount: number;
}

export interface MemoryCompletionResult {
  activityId: string;
  correct: boolean;
  attempts: number;
  mistakes: number;
  pairsMatched: number;
}

export interface LessonResult {
  lessonId: string;
  totalActivities: number;
  completedActivities: number;
  totalAttempts: number;
  mistakes: number;
  starsEarned: 1 | 2 | 3;
  completedAt?: number;
}


