/**
 * Date utilities for calendar-day streak tracking.
 * Uses local calendar date semantics rather than 24-hour elapsed windows.
 * Parsing via Date.UTC avoids daylight saving time (DST) shifts and timezone drift.
 */

/**
 * Format a Date object as a local calendar date string "YYYY-MM-DD".
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Calculates the number of calendar days between two "YYYY-MM-DD" date strings.
 * Result = (dateStr2 - dateStr1) in integer days.
 * E.g.:
 * ("2026-09-15", "2026-09-16") -> 1 (consecutive)
 * ("2026-09-16", "2026-09-16") -> 0 (same day)
 * ("2026-09-14", "2026-09-16") -> 2 (missed 1 day)
 * ("2026-01-31", "2026-02-01") -> 1 (month boundary)
 * ("2025-12-31", "2026-01-01") -> 1 (year boundary)
 */
export function getDayDifference(dateStr1: string, dateStr2: string): number {
  if (dateStr1 === dateStr2) return 0;

  const [y1, m1, d1] = dateStr1.split("-").map(Number);
  const [y2, m2, d2] = dateStr2.split("-").map(Number);

  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);

  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  return Math.round((utc2 - utc1) / MS_PER_DAY);
}

/**
 * Check if two dates represent the exact same calendar day.
 */
export function isSameCalendarDay(dateStr1: string | null, dateStr2: string): boolean {
  if (!dateStr1) return false;
  return dateStr1 === dateStr2;
}

/**
 * Check if dateStr2 is the immediately following calendar day after dateStr1 (difference = 1).
 */
export function isConsecutiveCalendarDay(
  previousDateStr: string | null,
  currentDateStr: string
): boolean {
  if (!previousDateStr) return false;
  return getDayDifference(previousDateStr, currentDateStr) === 1;
}
