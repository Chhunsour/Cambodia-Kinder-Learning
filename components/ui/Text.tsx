import React from "react";
import { Text as RNText, TextProps as RNTextProps, TextStyle } from "react-native";
import { Palette } from "@/constants/theme";
import { Typography, TypographyRole, LineHeight, FontFamily } from "@/constants/typography";

export type TextVariant = 
  | TypographyRole
  | "hero"
  | "titleLarge"
  | "titleMedium"
  | "titleSmall"
  | "bodyLarge"
  | "bodyMedium";

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: string;
  align?: "left" | "center" | "right";
  weight?: TextStyle["fontWeight"];
}

const KHMER_CHAR_REGEX = /[\u1780-\u17FF]/;

export function Text({
  children,
  variant = "body",
  color = Palette.primaryText,
  align = "left",
  weight,
  style,
  ...props
}: TextProps) {
  const isKhmer = typeof children === "string" && KHMER_CHAR_REGEX.test(children);

  // Normalize legacy variants to new typography tokens
  const getNormalizedStyle = (): TextStyle => {
    switch (variant) {
      case "hero":
      case "display":
        return Typography.display;
      case "titleLarge":
      case "heading1":
        return Typography.heading1;
      case "titleMedium":
      case "heading2":
        return Typography.heading2;
      case "titleSmall":
      case "title":
        return Typography.title;
      case "bodyLarge":
      case "body":
        return Typography.body;
      case "bodyMedium":
      case "bodySmall":
        return Typography.bodySmall;
      case "button":
        return Typography.button;
      case "caption":
        return Typography.caption;
      case "gameNumber":
        return Typography.gameNumber;
      default:
        return Typography.body;
    }
  };

  const baseTypography = getNormalizedStyle();

  // Khmer characters with upper diacritics and sub-consonants need slightly more line height
  const khmerExtraLineHeight: TextStyle = isKhmer
    ? {
        lineHeight: (baseTypography.lineHeight || LineHeight.body) * 1.15,
        paddingBottom: 2,
        fontFamily: (weight === "700" || weight === "800" || weight === "bold")
          ? FontFamily.khmer.bold
          : FontFamily.khmer.regular,
      }
    : {};

  return (
    <RNText
      style={[
        baseTypography,
        { color, textAlign: align },
        weight ? { fontWeight: weight } : null,
        khmerExtraLineHeight,
        style,
      ]}
      {...props}
    >
      {children}
    </RNText>
  );
}
