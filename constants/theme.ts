/**
 * Koki Centralized Theme Tokens
 * Playful, soft 3D, child-friendly palette celebrating Cambodian warmth.
 */
export const Palette = {
  // Brand Oranges
  primaryOrange: "#FC6E00",
  deepOrange: "#D95600",
  orangeLight: "#FFE8D6",

  // Warm Surfaces
  warmCream: "#FFF7EA",
  softWhite: "#FFFDFA",
  pureWhite: "#FFFFFF",

  // Sky & Mekong
  skyBlue: "#DFF3FF",
  skyBlueDeep: "#0284C7",
  skyBlueSurface: "#F0F9FF",

  // Nature Greens
  green: "#58B947",
  darkGreen: "#24733A",
  greenLight: "#EAF7E6",

  // Rewards & Gold
  gold: "#FFC83D",
  goldDark: "#D99B00",
  goldLight: "#FFF4D4",

  // High Legibility Text
  primaryText: "#2A2A2A",
  secondaryText: "#6F6F6F",
  mutedText: "#9CA3AF",
  inverseText: "#FFFFFF",

  // Soft Friendly Red (Feedback / Hearts)
  friendlyRed: "#FF4D4D",
  friendlyRedDark: "#D93838",
  friendlyRedLight: "#FFEBEB",

  // Accents & Neutrals
  purpleAccent: "#8B5CF6",
  purpleDark: "#6D28D9",
  borderSubtle: "#E5E0D6",
  borderStrong: "#D1CABE",
  cardOutline: "#EDE7DC",
  disabledGray: "#CBD5E1",
  disabledDark: "#94A3B8",
  overlay: "rgba(42, 42, 42, 0.45)",
} as const;

export const Theme = {
  colors: {
    primary: Palette.primaryOrange,
    primaryDark: Palette.deepOrange,
    primaryLight: Palette.orangeLight,

    background: Palette.warmCream,
    surface: Palette.softWhite,
    card: Palette.pureWhite,

    sky: Palette.skyBlue,
    skyDark: Palette.skyBlueDeep,

    success: Palette.green,
    successDark: Palette.darkGreen,
    successLight: Palette.greenLight,

    gold: Palette.gold,
    goldDark: Palette.goldDark,
    goldLight: Palette.goldLight,

    text: Palette.primaryText,
    textSecondary: Palette.secondaryText,
    textMuted: Palette.mutedText,
    textInverse: Palette.inverseText,

    error: Palette.friendlyRed,
    errorDark: Palette.friendlyRedDark,
    errorLight: Palette.friendlyRedLight,

    border: Palette.borderSubtle,
    borderStrong: Palette.borderStrong,
    cardOutline: Palette.cardOutline,

    disabled: Palette.disabledGray,
    disabledDark: Palette.disabledDark,
    overlay: Palette.overlay,
  },
} as const;

export type ThemeColors = typeof Theme.colors;
