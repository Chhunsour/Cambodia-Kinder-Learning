import React, { useCallback, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { Palette } from "@/constants/theme";
import { Radius, Spacing } from "@/constants/spacing";
import { useLocalization } from "@/hooks/useLocalization";
import { useKokiResponsive } from "@/hooks/useKokiResponsive";
import {
  ActivityLifecycleState,
  DragDropActivityData,
  DragItem,
  DropTargetData,
} from "../types";
import {
  DropTarget,
  TargetMeasuredBounds,
} from "./DropTarget";
import {
  DraggableItem,
  ItemMeasuredBounds,
} from "./DraggableItem";
import { useLessonSound } from "../hooks/useLessonSound";

export interface DragDropActivityProps {
  activity: DragDropActivityData;
  lifecycleState: ActivityLifecycleState;
  onComplete: () => void;
  onRecordAttempt?: (isCorrect: boolean, report?: any) => void;
  onDragStateChange?: (isDragging: boolean) => void;
}

// Generous 50dp proximity detection buffer so kids don't need pixel-perfect drops
const PROXIMITY_BUFFER = 50;

export const DragDropActivity: React.FC<DragDropActivityProps> = ({
  activity,
  lifecycleState,
  onComplete,
  onRecordAttempt,
  onDragStateChange,
}) => {
  const { locale, t } = useLocalization();
  const responsive = useKokiResponsive();
  const isKm = locale === "km";
  const { playCorrectSound, playIncorrectSound } = useLessonSound();

  // Placed items map: itemId -> targetId
  const [placedItems, setPlacedItems] = useState<Record<string, string>>({});

  // Reverse map: targetId -> itemId for quick lookup of which item is in which target
  const targetOccupancy = useMemo(() => {
    const map: Record<string, string> = {};
    Object.entries(placedItems).forEach(([itemId, targetId]) => {
      map[targetId] = itemId;
    });
    return map;
  }, [placedItems]);

  // Selected item via tap interaction mode (accessible fallback)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Target currently hovered during an active drag
  const [hoveredTargetId, setHoveredTargetId] = useState<string | null>(null);

  // Target currently shaking from an incorrect drop
  const [incorrectTargetId, setIncorrectTargetId] = useState<string | null>(null);

  // Measurement registries for forgiving proximity hit testing and snapping
  const targetBoundsRef = useRef<Record<string, TargetMeasuredBounds>>({});
  const itemBoundsRef = useRef<Record<string, ItemMeasuredBounds>>({});

  // Performance tracking
  const attemptsRef = useRef<number>(0);
  const mistakesRef = useRef<number>(0);

  // Measure target layout bounds
  const handleMeasureTarget = useCallback(
    (targetId: string, bounds: TargetMeasuredBounds) => {
      targetBoundsRef.current[targetId] = bounds;
    },
    []
  );

  // Measure draggable item layout bounds
  const handleMeasureItem = useCallback(
    (itemId: string, bounds: ItemMeasuredBounds) => {
      itemBoundsRef.current[itemId] = bounds;
    },
    []
  );

  // Drag start callback: locks parent scroll
  const handleDragStart = useCallback(
    (itemId: string) => {
      setSelectedItemId(null);
      onDragStateChange?.(true);
    },
    [onDragStateChange]
  );

  // Drag move callback: updates hover highlight on targets within proximity
  const handleDragMove = useCallback(
    (_itemId: string, screenX: number, screenY: number) => {
      let hovered: string | null = null;
      let minDistance = Infinity;

      Object.entries(targetBoundsRef.current).forEach(([targetId, bounds]) => {
        if (targetOccupancy[targetId]) return; // Skip occupied targets

        const inX =
          screenX >= bounds.pageX - PROXIMITY_BUFFER &&
          screenX <= bounds.pageX + bounds.width + PROXIMITY_BUFFER;
        const inY =
          screenY >= bounds.pageY - PROXIMITY_BUFFER &&
          screenY <= bounds.pageY + bounds.height + PROXIMITY_BUFFER;

        if (inX && inY) {
          const centerX = bounds.pageX + bounds.width / 2;
          const centerY = bounds.pageY + bounds.height / 2;
          const dist = Math.hypot(screenX - centerX, screenY - centerY);
          if (dist < minDistance) {
            minDistance = dist;
            hovered = targetId;
          }
        }
      });

      setHoveredTargetId(hovered);
    },
    [targetOccupancy]
  );

  // Drag release callback: performs hit testing, snap or return spring
  const handleRelease = useCallback(
    (
      itemId: string,
      screenX: number,
      screenY: number,
      resetToOrigin: () => void,
      snapTo: (dx: number, dy: number) => void
    ) => {
      // Re-enable parent scroll
      onDragStateChange?.(false);
      setHoveredTargetId(null);

      const item = activity.items.find((i) => i.id === itemId);
      if (!item) {
        resetToOrigin();
        return;
      }

      // Find all eligible unoccupied targets in proximity
      let bestTargetId: string | null = null;
      let minDistance = Infinity;

      Object.entries(targetBoundsRef.current).forEach(([targetId, bounds]) => {
        if (targetOccupancy[targetId]) return;

        const inX =
          screenX >= bounds.pageX - PROXIMITY_BUFFER &&
          screenX <= bounds.pageX + bounds.width + PROXIMITY_BUFFER;
        const inY =
          screenY >= bounds.pageY - PROXIMITY_BUFFER &&
          screenY <= bounds.pageY + bounds.height + PROXIMITY_BUFFER;

        if (inX && inY) {
          const centerX = bounds.pageX + bounds.width / 2;
          const centerY = bounds.pageY + bounds.height / 2;
          const dist = Math.hypot(screenX - centerX, screenY - centerY);
          if (dist < minDistance) {
            minDistance = dist;
            bestTargetId = targetId;
          }
        }
      });

      if (!bestTargetId) {
        // Dropped in open space -> spring back to origin
        resetToOrigin();
        return;
      }

      attemptsRef.current += 1;
      const isCorrect = item.correctTargetId === bestTargetId;

      if (isCorrect) {
        // Correct drop!
        playCorrectSound();

        const targetBounds = targetBoundsRef.current[bestTargetId];
        const itemBounds = itemBoundsRef.current[itemId];

        if (targetBounds && itemBounds) {
          const dx =
            targetBounds.pageX +
            targetBounds.width / 2 -
            (itemBounds.pageX + itemBounds.width / 2);
          const dy =
            targetBounds.pageY +
            targetBounds.height / 2 -
            (itemBounds.pageY + itemBounds.height / 2);
          snapTo(dx, dy);
        }

        // Commit placement
        setPlacedItems((prev) => {
          const next = { ...prev, [itemId]: bestTargetId! };
          const completedCount = Object.keys(next).length;

          if (onRecordAttempt) {
            onRecordAttempt(true, {
              activityId: activity.id,
              itemId,
              targetId: bestTargetId,
              isCorrect: true,
              attemptNumber: attemptsRef.current,
              completedPlacementsCount: completedCount,
              totalPlacementsCount: activity.items.length,
            });
          }

          if (completedCount === activity.items.length) {
            setTimeout(() => {
              onComplete();
            }, 350);
          }

          return next;
        });
      } else {
        // Incorrect target
        mistakesRef.current += 1;
        playIncorrectSound();
        resetToOrigin();
        setIncorrectTargetId(bestTargetId);

        if (onRecordAttempt) {
          onRecordAttempt(false, {
            activityId: activity.id,
            itemId,
            targetId: bestTargetId,
            isCorrect: false,
            attemptNumber: attemptsRef.current,
            completedPlacementsCount: Object.keys(placedItems).length,
            totalPlacementsCount: activity.items.length,
          });
        }

        setTimeout(() => {
          setIncorrectTargetId(null);
        }, 500);
      }
    },
    [
      activity.id,
      activity.items,
      onComplete,
      onDragStateChange,
      onRecordAttempt,
      placedItems,
      playCorrectSound,
      playIncorrectSound,
      targetOccupancy,
    ]
  );

  // Tap-to-select item handler (accessible / motor-friendly alternative)
  const handleItemTap = useCallback(
    (itemId: string) => {
      setSelectedItemId((prev) => (prev === itemId ? null : itemId));
    },
    []
  );

  // Target tap handler (places selected item into target)
  const handleTargetTap = useCallback(
    (target: DropTargetData) => {
      if (!selectedItemId) return;

      const item = activity.items.find((i) => i.id === selectedItemId);
      if (!item) return;

      attemptsRef.current += 1;
      const isCorrect = item.correctTargetId === target.id;

      if (isCorrect) {
        playCorrectSound();
        setSelectedItemId(null);

        setPlacedItems((prev) => {
          const next = { ...prev, [selectedItemId]: target.id };
          const completedCount = Object.keys(next).length;

          if (onRecordAttempt) {
            onRecordAttempt(true, {
              activityId: activity.id,
              itemId: selectedItemId,
              targetId: target.id,
              isCorrect: true,
              attemptNumber: attemptsRef.current,
              completedPlacementsCount: completedCount,
              totalPlacementsCount: activity.items.length,
            });
          }

          if (completedCount === activity.items.length) {
            setTimeout(() => {
              onComplete();
            }, 350);
          }

          return next;
        });
      } else {
        mistakesRef.current += 1;
        playIncorrectSound();
        setIncorrectTargetId(target.id);

        if (onRecordAttempt) {
          onRecordAttempt(false, {
            activityId: activity.id,
            itemId: selectedItemId,
            targetId: target.id,
            isCorrect: false,
            attemptNumber: attemptsRef.current,
            completedPlacementsCount: Object.keys(placedItems).length,
            totalPlacementsCount: activity.items.length,
          });
        }

        setTimeout(() => {
          setIncorrectTargetId(null);
        }, 500);
      }
    },
    [
      activity.id,
      activity.items,
      onComplete,
      onRecordAttempt,
      placedItems,
      playCorrectSound,
      playIncorrectSound,
      selectedItemId,
    ]
  );

  // Resolve localized instruction
  const instructionText = useMemo(() => {
    if (isKm) {
      if (activity.instructionKm) return activity.instructionKm;
      if (activity.instruction) return activity.instruction;
      if (activity.instructionKey) return t(activity.instructionKey as any);
    } else {
      if (activity.instructionEn) return activity.instructionEn;
      if (activity.instruction) return activity.instruction;
      if (activity.instructionKey) return t(activity.instructionKey as any);
    }
    return isKm ? "ទាញដាក់ក្នុងកន្លែងដែលត្រឹមត្រូវ" : "Drag to the correct place";
  }, [activity, isKm, t]);

  return (
    <View
      style={[
        styles.container,
        responsive.isTablet && styles.tabletContainer,
      ]}
    >
      {/* 1. Instruction Header */}
      <View style={styles.promptArea}>
        <Text
          variant="heading1"
          weight="800"
          align="center"
          color={Palette.primaryText}
          style={styles.instructionText}
        >
          {instructionText}
        </Text>

        {activity.promptIcon && (
          <View style={styles.promptIconBadge}>
            <Text style={styles.promptIconText}>{activity.promptIcon}</Text>
          </View>
        )}
      </View>

      {/* 2. Drop Target Zones (Top Area) */}
      <View style={styles.targetSection}>
        <View style={styles.sectionHeader}>
          <Text variant="caption" weight="800" style={styles.sectionTitle}>
            {isKm ? "កន្លែងដាក់" : "TARGET ZONES"}
          </Text>
        </View>

        <View style={styles.targetsContainer}>
          {activity.targets.map((target) => {
            const placedItemId = targetOccupancy[target.id];
            const placedItem = placedItemId
              ? activity.items.find((i) => i.id === placedItemId)
              : undefined;
            const isHovered = hoveredTargetId === target.id;
            const isSelectTargetActive = !!selectedItemId && !placedItem;
            const isIncorrect = incorrectTargetId === target.id;

            return (
              <DropTarget
                key={`target-${target.id}`}
                target={target}
                placedItem={placedItem}
                isHovered={isHovered}
                isSelectTargetActive={isSelectTargetActive}
                isIncorrect={isIncorrect}
                onMeasure={handleMeasureTarget}
                onPress={() => handleTargetTap(target)}
                locale={locale}
              />
            );
          })}
        </View>
      </View>

      {/* 3. Draggable Items Tray / Shelf (Bottom Area) */}
      <View style={styles.itemsSection}>
        <View style={styles.sectionHeader}>
          <Text variant="caption" weight="800" style={styles.sectionTitle}>
            {isKm ? "ជ្រើសរើស ឬទាញ" : "DRAG OR TAP ITEMS"}
          </Text>
        </View>

        <View style={styles.trayContainer}>
          {activity.items.map((item) => {
            const isPlaced = !!placedItems[item.id];
            const isSelected = selectedItemId === item.id;

            return (
              <DraggableItem
                key={`item-${item.id}`}
                item={item}
                isSelected={isSelected}
                isPlaced={isPlaced}
                onTap={handleItemTap}
                onDragStart={handleDragStart}
                onDragMove={handleDragMove}
                onRelease={handleRelease}
                onMeasure={handleMeasureItem}
                locale={locale}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignItems: "center",
  },
  tabletContainer: {
    maxWidth: 620,
    alignSelf: "center",
  },
  promptArea: {
    alignItems: "center",
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  instructionText: {
    lineHeight: 34,
    marginBottom: Spacing.xs,
  },
  promptIconBadge: {
    backgroundColor: Palette.warmCream,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Palette.cardOutline,
    marginTop: Spacing.xs,
  },
  promptIconText: {
    fontSize: 26,
    lineHeight: 34,
  },
  targetSection: {
    width: "100%",
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    marginBottom: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  sectionTitle: {
    color: Palette.secondaryText,
    letterSpacing: 0.8,
  },
  targetsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "stretch",
    gap: Spacing.sm,
    width: "100%",
  },
  itemsSection: {
    width: "100%",
    marginTop: Spacing.xs,
  },
  trayContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "stretch",
    backgroundColor: "#F4ECDF",
    padding: Spacing.sm,
    borderRadius: Radius.xl,
    borderWidth: 2,
    borderColor: Palette.borderStrong,
    minHeight: 110,
    width: "100%",
  },
});
