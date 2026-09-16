import React, { useEffect, useRef } from "react";
import {
  AccessibilityState,
  LayoutChangeEvent,
  PanResponder,
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
import { DragItem } from "../types";

export interface ItemMeasuredBounds {
  pageX: number;
  pageY: number;
  width: number;
  height: number;
}

export interface DraggableItemProps {
  item: DragItem;
  isSelected: boolean;
  isPlaced: boolean;
  onTap: (itemId: string) => void;
  onDragStart: (itemId: string) => void;
  onDragMove: (itemId: string, screenX: number, screenY: number) => void;
  onRelease: (
    itemId: string,
    screenX: number,
    screenY: number,
    resetToOrigin: () => void,
    snapTo: (dx: number, dy: number) => void
  ) => void;
  onMeasure?: (itemId: string, bounds: ItemMeasuredBounds) => void;
  locale?: string;
  style?: ViewStyle;
}

export const DraggableItem: React.FC<DraggableItemProps> = React.memo(({
  item,
  isSelected,
  isPlaced,
  onTap,
  onDragStart,
  onDragMove,
  onRelease,
  onMeasure,
  locale = "km",
  style,
}) => {
  const containerRef = useRef<View>(null);

  // Reanimated shared values for smooth 60fps gesture response
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const zIndex = useSharedValue(1);
  const isDragging = useSharedValue(false);

  // Measure window position for accurate snap calculations
  const handleLayout = (_event: LayoutChangeEvent) => {
    setTimeout(() => {
      containerRef.current?.measure((_x, _y, width, height, pageX, pageY) => {
        if (width > 0 && height > 0 && onMeasure) {
          onMeasure(item.id, { pageX, pageY, width, height });
        }
      });
    }, 60);
  };

  // React to tap selection changes
  useEffect(() => {
    if (isPlaced) {
      scale.value = withSpring(1);
      zIndex.value = 1;
    } else if (isSelected) {
      scale.value = withSpring(1.06, AnimationPresets.bouncySpring);
      zIndex.value = 50;
    } else if (!isDragging.value) {
      scale.value = withSpring(1);
      zIndex.value = 1;
    }
  }, [isSelected, isPlaced, scale, zIndex, isDragging]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isPlaced,
      onMoveShouldSetPanResponder: (_evt, gestureState) => {
        if (isPlaced) return false;
        return Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3;
      },
      onPanResponderGrant: () => {
        isDragging.value = true;
        zIndex.value = 999;
        scale.value = withSpring(1.1, AnimationPresets.tactileSpring);
        onDragStart(item.id);
      },
      onPanResponderMove: (_evt, gestureState) => {
        translateX.value = gestureState.dx;
        translateY.value = gestureState.dy;

        const moveX = gestureState.moveX || gestureState.x0 + gestureState.dx;
        const moveY = gestureState.moveY || gestureState.y0 + gestureState.dy;
        onDragMove(item.id, moveX, moveY);
      },
      onPanResponderRelease: (_evt, gestureState) => {
        isDragging.value = false;
        const moveX = gestureState.moveX || gestureState.x0 + gestureState.dx;
        const moveY = gestureState.moveY || gestureState.y0 + gestureState.dy;
        const hasMoved =
          Math.abs(gestureState.dx) > 6 || Math.abs(gestureState.dy) > 6;

        const resetToOrigin = () => {
          translateX.value = withSpring(0, AnimationPresets.bouncySpring);
          translateY.value = withSpring(0, AnimationPresets.bouncySpring);
          scale.value = withSpring(isSelected ? 1.06 : 1, AnimationPresets.tactileSpring);
          zIndex.value = isSelected ? 50 : 1;
        };

        const snapTo = (dx: number, dy: number) => {
          translateX.value = withSpring(dx, AnimationPresets.bouncySpring);
          translateY.value = withSpring(dy, AnimationPresets.bouncySpring);
          scale.value = withSequence(
            withTiming(1.15, { duration: 100 }),
            withSpring(1, AnimationPresets.bouncySpring)
          );
          zIndex.value = 50;
        };

        if (!hasMoved) {
          // It's a tap interaction
          resetToOrigin();
          onTap(item.id);
        } else {
          onRelease(item.id, moveX, moveY, resetToOrigin, snapTo);
        }
      },
      onPanResponderTerminate: () => {
        isDragging.value = false;
        scale.value = withSpring(1);
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        zIndex.value = 1;
      },
    })
  ).current;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    zIndex: zIndex.value,
  }));

  const isKm = locale === "km";
  const displayLabel = isKm
    ? item.labelKm || item.label || ""
    : item.labelEn || item.label || "";

  const isSingleLetterOrNumber =
    displayLabel.length === 1 && !item.icon && !item.colorHex;

  // Visual appearance
  let backgroundColor: string = Palette.pureWhite;
  let borderColor: string = Palette.cardOutline;
  let extrusionColor: string = Palette.borderStrong;
  let textColor: string = Palette.primaryText;

  if (isPlaced) {
    backgroundColor = "#F5F5F3";
    borderColor = "#E0DFDB";
    extrusionColor = "#D5D4CE";
    textColor = Palette.secondaryText;
  } else if (isSelected) {
    backgroundColor = Palette.warmCream;
    borderColor = Palette.primaryOrange;
    extrusionColor = Palette.deepOrange;
    textColor = Palette.deepOrange;
  }

  const a11yState: AccessibilityState = {
    selected: isSelected,
    disabled: isPlaced,
  };

  const a11yLabel =
    item.accessibilityLabel ||
    `${displayLabel || item.icon || "Draggable item"}${
      isPlaced ? ", placed" : isSelected ? ", selected" : ", ready to drag"
    }`;

  return (
    <Animated.View
      ref={containerRef}
      onLayout={handleLayout}
      style={[styles.wrapper, animatedStyle, style]}
      {...panResponder.panHandlers}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityState={a11yState}
    >
      {/* 3D Extrusion Lip */}
      <View
        style={[
          styles.extrusion,
          { backgroundColor: extrusionColor },
          isPlaced && styles.extrusionPlaced,
        ]}
      />

      {/* Card Face */}
      <View
        style={[
          styles.face,
          {
            backgroundColor,
            borderColor,
          },
          isSelected && styles.faceSelected,
          isPlaced && styles.facePlaced,
        ]}
      >
        {isPlaced ? (
          /* Placed Ghost placeholder keeping the shelf layout stable */
          <View style={styles.placedSlotContent}>
            <View style={styles.placedGhostBadge}>
              <Text style={styles.placedGhostCheck}>✓</Text>
            </View>
            <Text style={styles.placedGhostLabel} numberOfLines={1}>
              {displayLabel || item.icon || "✓"}
            </Text>
          </View>
        ) : (
          /* Active Draggable Content */
          <View style={styles.content}>
            {item.colorHex ? (
              <View
                style={[
                  styles.colorSwatch,
                  { backgroundColor: item.colorHex },
                ]}
              />
            ) : null}

            {item.icon ? (
              <Text
                style={[
                  styles.iconText,
                  !displayLabel && styles.iconTextLarge,
                ]}
                accessibilityElementsHidden={true}
              >
                {item.icon}
              </Text>
            ) : null}

            {displayLabel ? (
              <Text
                variant={isSingleLetterOrNumber ? "heading1" : "title"}
                weight="800"
                align="center"
                style={[
                  styles.label,
                  { color: textColor },
                  isSingleLetterOrNumber && styles.singleCharLabel,
                ]}
              >
                {displayLabel}
              </Text>
            ) : null}
          </View>
        )}
      </View>
    </Animated.View>
  );
});

DraggableItem.displayName = "DraggableItem";

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
    minWidth: 80,
    minHeight: 80,
    flex: 1,
    margin: Spacing.xs,
  },
  extrusion: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    top: 5,
    borderRadius: Radius.xl,
  },
  extrusionPlaced: {
    top: 2,
  },
  face: {
    minHeight: 80,
    borderRadius: Radius.xl,
    borderWidth: 2.5,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.sm,
    position: "relative",
  },
  faceSelected: {
    borderWidth: 3,
    shadowColor: Palette.primaryOrange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  facePlaced: {
    borderWidth: 2,
    borderStyle: "dashed",
    opacity: 0.6,
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "rgba(0,0,0,0.1)",
  },
  iconText: {
    fontSize: 32,
    lineHeight: 38,
  },
  iconTextLarge: {
    fontSize: 42,
    lineHeight: 50,
  },
  label: {
    lineHeight: 28,
  },
  singleCharLabel: {
    fontSize: 34,
    lineHeight: 42,
  },
  placedSlotContent: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  placedGhostBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Palette.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  placedGhostCheck: {
    color: Palette.pureWhite,
    fontSize: 14,
    fontWeight: "800",
  },
  placedGhostLabel: {
    fontSize: 13,
    color: Palette.secondaryText,
    fontWeight: "600",
  },
});
