import React, { useEffect, useRef } from "react";
import {
  AccessibilityState,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Text } from "@/components/ui/Text";
import { Palette } from "@/constants/theme";
import { Radius, Spacing, TouchTarget } from "@/constants/spacing";
import { AnimationPresets } from "@/hooks/useAnimation";
import { DragItem, DropTargetData } from "../types";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface TargetMeasuredBounds {
  pageX: number;
  pageY: number;
  width: number;
  height: number;
}

export interface DropTargetProps {
  target: DropTargetData;
  placedItem?: DragItem;
  isHovered?: boolean;
  isSelectTargetActive?: boolean; // When an item is selected via tap and ready to be placed
  isIncorrect?: boolean;
  onMeasure?: (targetId: string, bounds: TargetMeasuredBounds) => void;
  onPress?: () => void;
  locale?: string;
  style?: ViewStyle;
}

export const DropTarget: React.FC<DropTargetProps> = React.memo(({
  target,
  placedItem,
  isHovered = false,
  isSelectTargetActive = false,
  isIncorrect = false,
  onMeasure,
  onPress,
  locale = "km",
  style,
}) => {
  const containerRef = useRef<View>(null);
  const shakeX = useSharedValue(0);
  const scale = useSharedValue(1);

  // Gentle horizontal shake on incorrect drop
  useEffect(() => {
    if (isIncorrect) {
      shakeX.value = withSequence(
        withTiming(-8, { duration: 50 }),
        withTiming(8, { duration: 50 }),
        withTiming(-5, { duration: 50 }),
        withTiming(5, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
    }
  }, [isIncorrect, shakeX]);

  // Satisfying pop when an item is placed inside
  useEffect(() => {
    if (placedItem) {
      scale.value = withSequence(
        withTiming(1.12, { duration: 120 }),
        withSpring(1, AnimationPresets.bouncySpring)
      );
    } else {
      scale.value = withSpring(1);
    }
  }, [placedItem, scale]);

  // Measure window-relative position for forgiving proximity hit testing
  const handleLayout = (_event: LayoutChangeEvent) => {
    setTimeout(() => {
      containerRef.current?.measure((_x, _y, width, height, pageX, pageY) => {
        if (width > 0 && height > 0 && onMeasure) {
          onMeasure(target.id, { pageX, pageY, width, height });
        }
      });
    }, 60);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: shakeX.value },
      { scale: scale.value },
    ],
  }));

  const isKm = locale === "km";
  const displayLabel = isKm
    ? target.labelKm || target.label || ""
    : target.labelEn || target.label || "";

  const placedItemDisplayLabel = placedItem
    ? isKm
      ? placedItem.labelKm || placedItem.label || ""
      : placedItem.labelEn || placedItem.label || ""
    : "";

  const isOccupied = !!placedItem;
  const isTargetHighlight = isHovered || isSelectTargetActive;

  // Visual styling based on state
  let backgroundColor: string = Palette.softWhite;
  let borderColor: string = Palette.cardOutline;
  let borderStyle: "solid" | "dashed" = "dashed";
  let borderWidth = 2.5;

  if (isOccupied) {
    backgroundColor = "#EDF9EC"; // Soft light green
    borderColor = target.colorHex || Palette.green;
    borderStyle = "solid";
    borderWidth = 3;
  } else if (isIncorrect) {
    backgroundColor = "#FFF3EB";
    borderColor = "#FFA372";
    borderStyle = "solid";
    borderWidth = 2.5;
  } else if (isTargetHighlight) {
    backgroundColor = Palette.skyBlueSurface;
    borderColor = Palette.primaryOrange;
    borderStyle = "solid";
    borderWidth = 3;
  }

  const a11yState: AccessibilityState = {
    disabled: isOccupied,
  };

  const a11yLabel =
    target.accessibilityLabel ||
    `${displayLabel || target.icon || "Drop target"}${
      isOccupied
        ? `, filled with ${placedItemDisplayLabel || placedItem?.icon}`
        : isSelectTargetActive
        ? ", ready to place item"
        : ", empty target slot"
    }`;

  return (
    <AnimatedPressable
      ref={containerRef}
      onLayout={handleLayout}
      onPress={isOccupied ? undefined : onPress}
      disabled={isOccupied}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityState={a11yState}
      style={[styles.wrapper, animatedStyle, style]}
    >
      {/* 3D Extrusion Shadow */}
      <View
        style={[
          styles.extrusion,
          {
            backgroundColor: isOccupied
              ? Palette.darkGreen
              : isTargetHighlight
              ? Palette.deepOrange
              : Palette.borderStrong,
          },
        ]}
      />

      {/* Target Face */}
      <View
        style={[
          styles.face,
          {
            backgroundColor,
            borderColor,
            borderStyle,
            borderWidth,
          },
          isTargetHighlight && styles.faceHighlighted,
          isOccupied && styles.faceOccupied,
        ]}
      >
        {/* If occupied, show placed item details */}
        {isOccupied ? (
          <View style={styles.placedContent}>
            {placedItem?.colorHex ? (
              <View
                style={[
                  styles.colorSwatch,
                  { backgroundColor: placedItem.colorHex },
                ]}
              />
            ) : null}

            {placedItem?.icon ? (
              <Text style={styles.placedIcon}>{placedItem.icon}</Text>
            ) : null}

            {placedItemDisplayLabel ? (
              <Text
                variant="title"
                weight="800"
                align="center"
                style={styles.placedLabel}
              >
                {placedItemDisplayLabel}
              </Text>
            ) : null}

            {/* Completion Success Checkmark Badge */}
            <View style={styles.successBadge}>
              <Text style={styles.successBadgeText}>✓</Text>
            </View>
          </View>
        ) : (
          /* Empty Target Slot */
          <View style={styles.emptySlotContent}>
            {target.colorHex ? (
              <View
                style={[
                  styles.targetColorPill,
                  { backgroundColor: target.colorHex },
                ]}
              />
            ) : null}

            {target.icon ? (
              <Text
                style={[
                  styles.targetIcon,
                  isTargetHighlight && styles.targetIconHighlight,
                ]}
              >
                {target.icon}
              </Text>
            ) : null}

            {displayLabel ? (
              <Text
                variant="titleSmall"
                weight="700"
                align="center"
                style={[
                  styles.targetLabel,
                  isTargetHighlight && styles.targetLabelHighlight,
                ]}
              >
                {displayLabel}
              </Text>
            ) : null}

            {/* Guidance drop hint on active select */}
            {isSelectTargetActive && (
              <View style={styles.tapPromptPill}>
                <Text style={styles.tapPromptText}>
                  {isKm ? "ដាក់ទីនេះ" : "Place here"}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </AnimatedPressable>
  );
});

DropTarget.displayName = "DropTarget";

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
    minWidth: 100,
    minHeight: 100,
    flex: 1,
  },
  extrusion: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    top: 5,
    borderRadius: Radius.xl,
  },
  face: {
    minHeight: 100,
    borderRadius: Radius.xl,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.sm,
    position: "relative",
  },
  faceHighlighted: {
    shadowColor: Palette.primaryOrange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  faceOccupied: {
    shadowColor: Palette.green,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  emptySlotContent: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    gap: 4,
  },
  placedContent: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    gap: 4,
  },
  targetColorPill: {
    width: 28,
    height: 12,
    borderRadius: 6,
    marginBottom: 2,
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "rgba(0,0,0,0.1)",
  },
  targetIcon: {
    fontSize: 34,
    lineHeight: 40,
    opacity: 0.85,
  },
  targetIconHighlight: {
    opacity: 1,
    transform: [{ scale: 1.1 }],
  },
  placedIcon: {
    fontSize: 40,
    lineHeight: 46,
  },
  targetLabel: {
    color: Palette.secondaryText,
    fontSize: 15,
    lineHeight: 20,
  },
  targetLabelHighlight: {
    color: Palette.deepOrange,
    fontWeight: "800",
  },
  placedLabel: {
    color: Palette.darkGreen,
    fontSize: 18,
    lineHeight: 24,
  },
  successBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Palette.green,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Palette.pureWhite,
  },
  successBadgeText: {
    color: Palette.pureWhite,
    fontSize: 13,
    fontWeight: "900",
  },
  tapPromptPill: {
    marginTop: 4,
    backgroundColor: Palette.primaryOrange,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  tapPromptText: {
    color: Palette.pureWhite,
    fontSize: 11,
    fontWeight: "800",
  },
});
