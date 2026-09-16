/**
 * Koki Color Palette
 * Designed specifically for Cambodian children (ages 3-9).
 * Warm, joyful, high-contrast, and culturally resonant.
 */
export const Colors = {
  // Cultural warmth: Angkor terracotta & sunflower amber
  primary: {
    base: "#D84315",
    light: "#FF7043",
    dark: "#BF360C",
    surface: "#FBE9E7",
  },
  accent: {
    sunGold: "#F59E0B",
    amberLight: "#FDE68A",
    amberSurface: "#FFFBEB",
  },
  // Nature: Mekong River blue & palm frond green
  mekong: {
    base: "#0284C7",
    light: "#38BDF8",
    dark: "#0369A1",
    surface: "#E0F2FE",
  },
  palm: {
    base: "#16A34A",
    light: "#4ADE80",
    dark: "#15803D",
    surface: "#DCFCE7",
  },
  lotus: {
    base: "#F43F5E",
    light: "#FB7185",
    dark: "#BE123C",
    surface: "#FFE4E6",
  },
  royalViolet: {
    base: "#8B5CF6",
    light: "#A78BFA",
    dark: "#6D28D9",
    surface: "#EDE9FE",
  },

  // Background surfaces
  background: {
    cream: "#FFFDF7",
    card: "#FFFFFF",
    subtle: "#F8FAFC",
    overlay: "rgba(15, 23, 42, 0.45)",
    twilight: "#090D16",
    twilightCard: "#1E293B",
  },

  // High legibility text (kid friendly, accessible contrast)
  text: {
    primary: "#0F172A",
    secondary: "#475569",
    muted: "#94A3B8",
    inverse: "#FFFFFF",
    link: "#0284C7",
  },

  // Functional & Game feedback
  game: {
    starGold: "#FACC15",
    starBorder: "#CA8A04",
    success: "#22C55E",
    successDark: "#15803D",
    heartRed: "#EF4444",
    lockGray: "#94A3B8",
    xpPurple: "#A855F7",
  },

  // UI strokes & shadows
  border: {
    subtle: "#E2E8F0",
    strong: "#CBD5E1",
    interactive: "#FFB020",
    card3D: "#C75300",
  },
} as const;

export type ColorTheme = typeof Colors;
