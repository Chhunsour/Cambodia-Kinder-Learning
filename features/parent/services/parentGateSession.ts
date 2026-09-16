/**
 * In-Memory Session Manager for Parent Gate
 *
 * Keeps the parent area unlocked during the current app session.
 * Does NOT persist to SQLite, ensuring the gate re-engages whenever
 * the app is closed, terminated, or cold-restarted.
 */

let isSessionUnlocked = false;
let lastUnlockedAt: number | null = null;

// Optional auto-lock timeout after 30 minutes of complete inactivity
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

export const ParentGateSession = {
  /**
   * Check if Parent Gate is currently unlocked for this app session.
   */
  isUnlocked(): boolean {
    if (!isSessionUnlocked) return false;

    // Check inactivity timeout if applicable
    if (lastUnlockedAt && Date.now() - lastUnlockedAt > SESSION_TIMEOUT_MS) {
      this.lock();
      return false;
    }

    return true;
  },

  /**
   * Mark the gate as unlocked for the current session.
   */
  unlock(): void {
    isSessionUnlocked = true;
    lastUnlockedAt = Date.now();
  },

  /**
   * Manually lock the gate (e.g. when parent leaves parent area).
   */
  lock(): void {
    isSessionUnlocked = false;
    lastUnlockedAt = null;
  },

  /**
   * Refresh the activity timestamp to keep the session alive.
   */
  keepAlive(): void {
    if (isSessionUnlocked) {
      lastUnlockedAt = Date.now();
    }
  },
};
