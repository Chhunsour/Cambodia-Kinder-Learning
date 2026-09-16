import { TextStyle, Platform } from "react-native";
import { Palette } from "./theme";

export const FontFamily = {
  khmer: {
    regular: Platform.select({ ios: "KantumruyPro_400Regular", android: "KantumruyPro_400Regular", default: "System" }),
    medium: Platform.select({ ios: "KantumruyPro_500Medium", android: "KantumruyPro_500Medium", default: "System" }),
    semiBold: Platform.select({ ios: "KantumruyPro_600SemiBold", android: "KantumruyPro_600SemiBold", default: "System" }),
    bold: Platform.select({ ios: "KantumruyPro_700Bold", android: "KantumruyPro_700Bold", default: "System" }),
  },
  systemRounded: Platform.select({ ios: "System", android: "sans-serif-medium", default: "System" }),
} as const;

export const FontSize = {
  caption: 13,
  bodySmall: 15,
  body: 17,
  button: 18,
  title: 20,
  heading2: 24,
  heading1: 28,
  display: 34,
  gameNumber: 22,
} as const;

export const LineHeight = {
  caption: 18,
  bodySmall: 22,
  body: 26,
  button: 24,
  title: 28,
  heading2: 32,
  heading1: 36,
  display: 42,
  gameNumber: 26,
} as const;

export type TypographyRole =
  | "display"
  | "heading1"
  | "heading2"
  | "title"
  | "body"
  | "bodySmall"
  | "button"
  | "caption"
  | "gameNumber";

export const Typography: Record<TypographyRole, TextStyle> = {
  display: {
    fontSize: FontSize.display,
    lineHeight: LineHeight.display,
    fontWeight: "800",
    color: Palette.primaryText,
  },
  heading1: {
    fontSize: FontSize.heading1,
    lineHeight: LineHeight.heading1,
    fontWeight: "800",
    color: Palette.primaryText,
  },
  heading2: {
    fontSize: FontSize.heading2,
    lineHeight: LineHeight.heading2,
    fontWeight: "700",
    color: Palette.primaryText,
  },
  title: {
    fontSize: FontSize.title,
    lineHeight: LineHeight.title,
    fontWeight: "700",
    color: Palette.primaryText,
  },
  body: {
    fontSize: FontSize.body,
    lineHeight: LineHeight.body,
    fontWeight: "500",
    color: Palette.primaryText,
  },
  bodySmall: {
    fontSize: FontSize.bodySmall,
    lineHeight: LineHeight.bodySmall,
    fontWeight: "400",
    color: Palette.secondaryText,
  },
  button: {
    fontSize: FontSize.button,
    lineHeight: LineHeight.button,
    fontWeight: "700",
    color: Palette.inverseText,
  },
  caption: {
    fontSize: FontSize.caption,
    lineHeight: LineHeight.caption,
    fontWeight: "500",
    color: Palette.secondaryText,
  },
  gameNumber: {
    fontSize: FontSize.gameNumber,
    lineHeight: LineHeight.gameNumber,
    fontWeight: "900",
    color: Palette.primaryText,
  },
};
