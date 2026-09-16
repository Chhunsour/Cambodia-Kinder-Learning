export const MAX_HEARTS = 5;
export const DEFAULT_HEARTS = 5;
export const HEART_REGEN_INTERVAL_MINUTES = 30;
export const HEART_REGEN_INTERVAL_MS = HEART_REGEN_INTERVAL_MINUTES * 60 * 1000;

/**
 * Format remaining milliseconds into child-friendly, localized minute/hour display.
 * Examples:
 * - "18 min" / "១៨ នាទី"
 * - "1h 12m" / "១ ម៉ោង ១២ នាទី"
 */
export function formatRemainingTime(ms: number | null, isKm: boolean = false): string {
  if (ms === null || ms <= 0) {
    return isKm ? "០ នាទី" : "0 min";
  }

  const totalMinutes = Math.max(1, Math.ceil(ms / 60000));
  if (totalMinutes < 60) {
    return isKm ? `${totalMinutes} នាទី` : `${totalMinutes} min`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (minutes === 0) {
    return isKm ? `${hours} ម៉ោង` : `${hours}h`;
  }

  return isKm ? `${hours} ម៉ោង ${minutes} នាទី` : `${hours}h ${minutes}m`;
}
