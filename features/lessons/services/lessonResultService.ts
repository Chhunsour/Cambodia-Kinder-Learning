import type { LessonResult } from "../types";

export interface StarCalculationInput {
  totalActivities: number;
  totalAttempts?: number;
  mistakes: number;
}

/**
 * Pure calculation function for lesson stars.
 *
 * Friendly, deterministic, and child-centric:
 * - Completed lesson ALWAYS receives at least 1 star. Never 0 stars.
 * - 3 stars: 0 mistakes, or low mistake ratio (<= 15%).
 * - 2 stars: moderate mistakes (<= 45% mistake ratio).
 * - 1 star: completed even with many mistakes/help.
 */
export function calculateLessonStars(input: StarCalculationInput): 1 | 2 | 3 {
  const { totalActivities, mistakes } = input;

  if (totalActivities <= 0) {
    return 1;
  }

  // Safe against division by zero
  const mistakeRatio = mistakes / Math.max(1, totalActivities);

  // 3 stars: flawless or nearly flawless
  if (mistakes === 0 || mistakeRatio <= 0.15) {
    return 3;
  }

  // 2 stars: several retries, completed with effort
  if (mistakeRatio <= 0.45) {
    return 2;
  }

  // 1 star: finished the lesson with lots of tries
  return 1;
}

/**
 * In-memory temporary lesson result store.
 * Allows passing clean structured results between LessonSession and the Result route
 * without bloated URL query parameters or premature database writes.
 */
class LessonResultStore {
  private results = new Map<string, LessonResult>();

  public save(result: LessonResult): void {
    this.results.set(result.lessonId, result);
  }

  public get(lessonId: string): LessonResult | null {
    return this.results.get(lessonId) || null;
  }

  public clear(lessonId: string): void {
    this.results.delete(lessonId);
  }

  public clearAll(): void {
    this.results.clear();
  }
}

export const lessonResultStore = new LessonResultStore();
