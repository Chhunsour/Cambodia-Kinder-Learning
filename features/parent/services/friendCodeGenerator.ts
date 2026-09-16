/**
 * Friend Code Generator and Validator for Koki.
 *
 * Rules:
 * - Prefix: KOKI-
 * - Length: 6 random characters from unambiguous alphabet
 * - Case-insensitive
 * - Excludes confusing characters: 0, O, 1, I
 */

export const FRIEND_CODE_PREFIX = "KOKI-";
export const FRIEND_CODE_CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const FRIEND_CODE_SUFFIX_LENGTH = 6;

/**
 * Generate a cryptographically pseudo-random, child-safe friend code.
 * Example: KOKI-7F4Q2P
 */
export function generateFriendCode(): string {
  let suffix = "";
  for (let i = 0; i < FRIEND_CODE_SUFFIX_LENGTH; i++) {
    const idx = Math.floor(Math.random() * FRIEND_CODE_CHARACTERS.length);
    suffix += FRIEND_CODE_CHARACTERS[idx];
  }
  return `${FRIEND_CODE_PREFIX}${suffix}`;
}

/**
 * Normalize an entered code by stripping whitespace, converting to uppercase,
 * and ensuring the KOKI- prefix is intact.
 * e.g.: "7f4q2p" -> "KOKI-7F4Q2P"
 *       "koki-7f4q2p" -> "KOKI-7F4Q2P"
 *       "koki 7f4q2p" -> "KOKI-7F4Q2P"
 */
export function normalizeFriendCode(input: string): string {
  if (!input) return "";
  let clean = input.trim().toUpperCase().replace(/\s+/g, "");

  if (clean.startsWith("KOKI-")) {
    clean = clean.substring(5);
  } else if (clean.startsWith("KOKI")) {
    clean = clean.substring(4);
  }

  // Remove any stray leading dashes
  clean = clean.replace(/^-+/, "");

  return `${FRIEND_CODE_PREFIX}${clean}`;
}

/**
 * Check whether a code conforms to standard KOKI-XXXXXX format.
 */
export function isValidFriendCodeFormat(input: string): boolean {
  const normalized = normalizeFriendCode(input);
  if (!normalized.startsWith(FRIEND_CODE_PREFIX)) return false;

  const suffix = normalized.substring(FRIEND_CODE_PREFIX.length);
  if (suffix.length !== FRIEND_CODE_SUFFIX_LENGTH) return false;

  for (const char of suffix) {
    if (!FRIEND_CODE_CHARACTERS.includes(char)) {
      return false;
    }
  }

  return true;
}
