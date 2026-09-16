import React, { ReactNode } from "react";
import { View, Pressable, StyleSheet, ViewStyle } from "react-native";
import Animated from "react-native-reanimated";
import { Palette } from "@/constants/theme";
import { Radius, Spacing, TouchTarget } from "@/constants/spacing";
import { Depth } from "@/constants/depth";
import { useKokiButtonPress } from "@/hooks/useKokiAnimations";
import { Text } from "./Text";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type GameIconType = "back" | "sound" | "soundMuted" | "settings" | "close" | "replay" | "custom";
export type GameIconButtonSize = "compact" | "normal" | "large";

export interface GameIconButtonProps {
  onPress: () => void;
  type?: GameIconType;
  icon?: ReactNode;
  size?: GameIconButtonSize;
  color?: "orange" | "cream" | "green" | "sky" | "red";
  accessibilityLabel?: string;
  disabled?: boolean;
  style?: ViewStyle;
}

export function GameIconButton({
  onPress,
  type = "custom",
  icon,
  size = "normal",
  color = "cream",
  accessibilityLabel,
  disabled = false,
  style,
}: GameIconButtonProps) {
  const extrusion = Depth.extrusion.compact;
  const { onPressIn, onPressOut, faceAnimatedStyle } = useKokiButtonPress(extrusion);

  const getDimensions = () => {
    switch (size) {
      case "compact": return { box: TouchTarget.min, iconSize: 20 };
      case "large": return { box: 64, iconSize: 30 };
      case "normal":
      default: return { box: TouchTarget.kid, iconSize: 24 };
    }
  };

  const { box, iconSize } = getDimensions();

  const getColorTheme = () => {
    switch (color) {
      case "orange":
        return { face: Palette.primaryOrange, extrusion: Palette.deepOrange, border: "#E56300", text: Palette.inverseText };
      case "green":
        return { face: Palette.green, extrusion: Palette.darkGreen, border: "#4AA43B", text: Palette.inverseText };
      case "sky":
        return { face: Palette.skyBlue, extrusion: "#90CDF4", border: "#BAE6FD", text: Palette.skyBlueDeep };
      case "red":
        return { face: Palette.friendlyRed, extrusion: Palette.friendlyRedDark, border: "#E03838", text: Palette.inverseText };
      case "cream":
      default:
        return { face: Palette.softWhite, extrusion: Palette.borderStrong, border: Palette.borderSubtle, text: Palette.primaryText };
    }
  };

  const colors = getColorTheme();

  const renderIconContent = () => {
    if (icon) return icon;

    switch (type) {
      case "back": return <Text style={{ fontSize: iconSize }}>←</Text>;
      case "close": return <Text style={{ fontSize: iconSize, fontWeight: "800" }}>✕</Text>;
      case "sound": return <Text style={{ fontSize: iconSize }}>🔊</Text>;
      case "soundMuted": return <Text style={{ fontSize: iconSize }}>🔇</Text>;
      case "settings": return <Text style={{ fontSize: iconSize }}>⚙️</Text>;
      case "replay": return <Text style={{ fontSize: iconSize }}>🔄</Text>;
      default: return <Text style={{ fontSize: iconSize }}>•</Text>;
    }
  };

  const defaultA11yLabel = accessibilityLabel || type;

  return (
    <View style={[styles.container, { width: box, height: box + extrusion }, style]}>
      {/* 3D Extrusion base */}
      <View
        style={[
          styles.extrusion,
          {
            backgroundColor: colors.extrusion,
            borderRadius: Radius.circle,
            width: box,
            height: box,
            top: extrusion,
          },
        ]}
      />

      {/* Button face */}
      <AnimatedPressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={defaultA11yLabel}
        style={[
          styles.face,
          {
            width: box,
            height: box,
            borderRadius: Radius.circle,
            backgroundColor: colors.face,
            borderColor: colors.border,
          },
          Depth.styles.buttonDropShadow,
          faceAnimatedStyle,
        ]}
      >
        {renderIconContent()}
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  extrusion: {
    position: "absolute",
    left: 0,
    bottom: 0,
  },
  face: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
});
