import React, { ReactNode } from "react";
import { 
  Pressable, 
  View, 
  StyleSheet, 
  ViewStyle, 
  ActivityIndicator, 
  Platform 
} from "react-native";
import Animated from "react-native-reanimated";
import { Palette } from "@/constants/theme";
import { Radius, Spacing, TouchTarget } from "@/constants/spacing";
import { Depth } from "@/constants/depth";
import { useKokiButtonPress } from "@/hooks/useKokiAnimations";
import { Text } from "./Text";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type KokiButtonVariant = "primary" | "secondary" | "green" | "ghost";

export interface KokiButtonProps {
  title: string;
  subtitle?: string;
  onPress: () => void;
  variant?: KokiButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  compact?: boolean;
  icon?: ReactNode;
  style?: ViewStyle;
  testID?: string;
  accessibilityLabel?: string;
}

export function KokiButton({
  title,
  subtitle,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
  fullWidth = false,
  compact = false,
  icon,
  style,
  testID,
  accessibilityLabel,
}: KokiButtonProps) {
  const extrusionHeight = compact ? Depth.extrusion.compact : Depth.extrusion.normal;
  const { onPressIn, onPressOut, faceAnimatedStyle } = useKokiButtonPress(extrusionHeight);

  const getColors = () => {
    if (disabled) {
      return {
        face: Palette.disabledGray,
        extrusion: Palette.disabledDark,
        border: "transparent",
        text: Palette.secondaryText,
        subtext: Palette.secondaryText,
      };
    }

    switch (variant) {
      case "green":
        return {
          face: Palette.green,
          extrusion: Palette.darkGreen,
          border: "#4AA43B",
          text: Palette.inverseText,
          subtext: "#EAF7E6",
        };
      case "secondary":
        return {
          face: Palette.softWhite,
          extrusion: Palette.borderStrong,
          border: Palette.borderSubtle,
          text: Palette.primaryText,
          subtext: Palette.secondaryText,
        };
      case "ghost":
        return {
          face: "transparent",
          extrusion: "transparent",
          border: "transparent",
          text: Palette.primaryOrange,
          subtext: Palette.secondaryText,
        };
      case "primary":
      default:
        return {
          face: Palette.primaryOrange,
          extrusion: Palette.deepOrange,
          border: "#E56300",
          text: Palette.inverseText,
          subtext: Palette.orangeLight,
        };
    }
  };

  const colors = getColors();
  const minHeight = compact ? TouchTarget.min : TouchTarget.kid;
  const isGhost = variant === "ghost";

  return (
    <View style={[
      styles.wrapper, 
      fullWidth && styles.fullWidth, 
      { minHeight: minHeight + (isGhost ? 0 : extrusionHeight) },
      style
    ]}>
      {/* 3D Bottom Extrusion Layer (hidden for ghost buttons) */}
      {!isGhost && (
        <View
          style={[
            styles.extrusionLayer,
            {
              backgroundColor: colors.extrusion,
              borderRadius: compact ? Radius.medium : Radius.large,
              top: extrusionHeight,
            },
          ]}
        />
      )}

      {/* Interactive Button Face */}
      <AnimatedPressable
        testID={testID}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled || loading}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || title}
        accessibilityState={{ disabled: disabled || loading }}
        style={[
          styles.faceLayer,
          {
            backgroundColor: colors.face,
            borderColor: colors.border,
            borderRadius: compact ? Radius.medium : Radius.large,
            minHeight,
            paddingVertical: compact ? Spacing.xs : Spacing.sm,
            paddingHorizontal: compact ? Spacing.md : Spacing.xl,
            borderWidth: isGhost ? 0 : 1,
          },
          !isGhost && !disabled && Depth.styles.buttonDropShadow,
          faceAnimatedStyle,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={colors.text} size="small" />
        ) : (
          <View style={styles.contentRow}>
            {icon && <View style={styles.iconContainer}>{icon}</View>}
            <View style={styles.textColumn}>
              <Text 
                variant={compact ? "body" : "button"} 
                weight="700" 
                color={colors.text}
                align="center"
              >
                {title}
              </Text>
              {subtitle && (
                <Text 
                  variant="caption" 
                  color={colors.subtext} 
                  align="center"
                  style={styles.subtitle}
                >
                  {subtitle}
                </Text>
              )}
            </View>
          </View>
        )}
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
    marginVertical: Spacing.xs,
  },
  fullWidth: {
    width: "100%",
  },
  extrusionLayer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  faceLayer: {
    alignItems: "center",
    justifyContent: "center",
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    marginRight: Spacing.sm,
  },
  textColumn: {
    alignItems: "center",
    justifyContent: "center",
  },
  subtitle: {
    marginTop: 2,
  },
});
