import React, { useEffect, useMemo } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Text } from "@/components/ui/Text";
import { Palette } from "@/constants/theme";
import { Radius, Spacing } from "@/constants/spacing";
import { AnimationPresets } from "@/hooks/useAnimation";
import { useKokiResponsive } from "@/hooks/useKokiResponsive";

export interface CountingBoardProps {
  activityId: string;
  count: number;
  objectIcon?: string;
  objectLabel?: string;
  layout?: "rows" | "scattered" | "grouped";
  showHint?: boolean;
  isCorrect?: boolean;
  style?: ViewStyle;
}

/**
 * Deterministic pseudo-random offset generator.
 * Guarantees objects in "scattered" mode never jump or shift between renders.
 */
function getDeterministicScatterOffset(seedId: string, index: number) {
  let hash = 0;
  const key = `${seedId}_item_${index}`;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }

  const randX = Math.abs((Math.sin(hash + 1) * 10000) % 1);
  const randY = Math.abs((Math.cos(hash + 2) * 10000) % 1);
  const randR = Math.abs((Math.sin(hash + 3) * 10000) % 1);

  return {
    dx: (randX - 0.5) * 14,
    dy: (randY - 0.5) * 12,
    rotation: `${Math.round((randR - 0.5) * 16)}deg`,
  };
}

export const CountingBoard: React.FC<CountingBoardProps> = React.memo(({
  activityId,
  count,
  objectIcon = "🍎",
  objectLabel,
  layout = "rows",
  showHint = false,
  isCorrect = false,
  style,
}) => {
  const responsive = useKokiResponsive();
  const boardScale = useSharedValue(1);

  // Joyful celebratory bounce on correct answer
  useEffect(() => {
    if (isCorrect) {
      boardScale.value = withSequence(
        withTiming(1.06, { duration: 120 }),
        withSpring(1, AnimationPresets.bouncySpring)
      );
    } else {
      boardScale.value = withSpring(1);
    }
  }, [isCorrect, boardScale]);

  const animatedBoardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: boardScale.value }],
  }));

  // Generate array of object indices [1, 2, ..., count]
  const items = useMemo(() => {
    return Array.from({ length: Math.max(1, count) }, (_, i) => i + 1);
  }, [count]);

  // Precompute deterministic scatter offsets
  const scatterOffsets = useMemo(() => {
    return items.map((idx) => getDeterministicScatterOffset(activityId, idx));
  }, [activityId, items]);

  // Determine row grouping for "rows" layout:
  // <= 5 items: 1 row
  // 6-10 items: 2 balanced rows
  const rowsData = useMemo(() => {
    if (count <= 5) {
      return [items];
    }
    const mid = Math.ceil(count / 2);
    return [items.slice(0, mid), items.slice(mid)];
  }, [count, items]);

  // Determine clusters for "grouped" layout:
  // e.g. 7 items -> [4, 3], 8 items -> [4, 4], 9 items -> [5, 4]
  const groupsData = useMemo(() => {
    if (count <= 4) {
      return [items];
    }
    const group1Size = Math.ceil(count / 2);
    return [items.slice(0, group1Size), items.slice(group1Size)];
  }, [count, items]);

  // Render individual countable object
  const renderItem = (itemNum: number) => {
    const itemIndex = itemNum - 1;
    const scatter = layout === "scattered" ? scatterOffsets[itemIndex] : null;

    const itemTransform = scatter
      ? [
          { translateX: scatter.dx },
          { translateY: scatter.dy },
          { rotate: scatter.rotation },
        ]
      : undefined;

    return (
      <View
        key={`count-item-${itemNum}`}
        style={[
          styles.itemWrapper,
          itemTransform ? { transform: itemTransform } : undefined,
          responsive.isTablet && styles.itemWrapperTablet,
        ]}
        accessibilityElementsHidden={true}
      >
        {/* Counted Object Emoji / Icon */}
        <Text
          style={[
            styles.objectIconText,
            count > 6 && styles.objectIconTextDense,
            responsive.isTablet && styles.objectIconTextTablet,
          ]}
        >
          {objectIcon}
        </Text>

        {/* Optional Progressive Counting Hint Badge (e.g. 1, 2, 3...) */}
        {showHint && (
          <View style={styles.hintBadge}>
            <Text style={styles.hintBadgeText}>{itemNum}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <Animated.View
      style={[
        styles.boardOuter,
        responsive.isTablet && styles.boardOuterTablet,
        animatedBoardStyle,
        style,
      ]}
      accessibilityRole="image"
      accessibilityLabel={`Counting board with ${count} ${objectLabel || "objects"}`}
    >
      {/* 3D Extrusion Lip */}
      <View style={styles.extrusion} />

      {/* Board Stage Face */}
      <View
        style={[
          styles.face,
          isCorrect && styles.faceCorrect,
        ]}
      >
        {/* Correct Celebration Sparkle Badge */}
        {isCorrect && (
          <View style={styles.celebrationBadge}>
            <Text style={styles.celebrationBadgeText}>✨</Text>
          </View>
        )}

        {/* Content Layouts */}
        {layout === "rows" && (
          <View style={styles.rowsContainer}>
            {rowsData.map((row, rIdx) => (
              <View key={`row-${rIdx}`} style={styles.row}>
                {row.map((itemNum) => renderItem(itemNum))}
              </View>
            ))}
          </View>
        )}

        {layout === "grouped" && (
          <View style={styles.groupsContainer}>
            {groupsData.map((group, gIdx) => (
              <View key={`group-${gIdx}`} style={styles.groupCluster}>
                <View style={styles.groupInner}>
                  {group.map((itemNum) => renderItem(itemNum))}
                </View>
              </View>
            ))}
          </View>
        )}

        {layout === "scattered" && (
          <View style={styles.scatterContainer}>
            {items.map((itemNum) => renderItem(itemNum))}
          </View>
        )}
      </View>
    </Animated.View>
  );
});

CountingBoard.displayName = "CountingBoard";

const styles = StyleSheet.create({
  boardOuter: {
    position: "relative",
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    marginVertical: Spacing.sm,
  },
  boardOuterTablet: {
    maxWidth: 560,
  },
  extrusion: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    top: 6,
    borderRadius: Radius.xl,
    backgroundColor: Palette.borderStrong,
  },
  face: {
    backgroundColor: Palette.softWhite,
    borderRadius: Radius.xl,
    borderWidth: 2.5,
    borderColor: Palette.cardOutline,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    minHeight: 160,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  faceCorrect: {
    backgroundColor: "#F4FCF3",
    borderColor: Palette.green,
  },
  rowsContainer: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  groupsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.lg,
    width: "100%",
    flexWrap: "wrap",
  },
  groupCluster: {
    backgroundColor: "#F7EFE1",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Palette.borderSubtle,
  },
  groupInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  scatterContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.sm,
    gap: Spacing.md,
  },
  itemWrapper: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    margin: 2,
  },
  itemWrapperTablet: {
    margin: 4,
  },
  objectIconText: {
    fontSize: 44,
    lineHeight: 52,
  },
  objectIconTextDense: {
    fontSize: 38,
    lineHeight: 46,
  },
  objectIconTextTablet: {
    fontSize: 52,
    lineHeight: 60,
  },
  hintBadge: {
    position: "absolute",
    top: -6,
    right: -8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Palette.primaryOrange,
    borderWidth: 1.5,
    borderColor: Palette.pureWhite,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  hintBadgeText: {
    color: Palette.pureWhite,
    fontSize: 11,
    fontWeight: "900",
    lineHeight: 13,
  },
  celebrationBadge: {
    position: "absolute",
    top: -12,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Palette.gold,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Palette.pureWhite,
  },
  celebrationBadgeText: {
    fontSize: 18,
    lineHeight: 22,
  },
});
