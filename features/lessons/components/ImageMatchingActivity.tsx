import React, { useCallback, useMemo, useRef, useState } from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { Palette } from "@/constants/theme";
import { Radius, Spacing } from "@/constants/spacing";
import { useLocalization } from "@/hooks/useLocalization";
import { useKokiResponsive } from "@/hooks/useKokiResponsive";
import {
  ActivityLifecycleState,
  ImageMatchingActivityData,
  MatchingItem,
  MatchingPair,
} from "../types";
import { MatchingCard, PAIR_ACCENT_COLORS } from "./MatchingCard";
import {
  MatchingConnectionLines,
  MatchingLineConnection,
} from "./MatchingConnectionLines";

interface InternalMatchingItem extends MatchingItem {
  pairId: string;
}

export interface ImageMatchingActivityProps {
  activity: ImageMatchingActivityData;
  lifecycleState: ActivityLifecycleState;
  onComplete: () => void;
  onRecordAttempt?: (isCorrect: boolean, report?: any) => void;
}

export const ImageMatchingActivity: React.FC<ImageMatchingActivityProps> = ({
  activity,
  lifecycleState,
  onComplete,
  onRecordAttempt,
}) => {
  const { locale, t } = useLocalization();
  const responsive = useKokiResponsive();
  const isKm = locale === "km";

  // Left items stay in stable pair definition order
  const leftItems: InternalMatchingItem[] = useMemo(() => {
    return activity.pairs.map((pair) => ({
      ...pair.left,
      pairId: pair.id,
    }));
  }, [activity.pairs]);

  // Right items are shuffled on mount so they are not trivially aligned with left items
  const rightItems: InternalMatchingItem[] = useMemo(() => {
    const raw = activity.pairs.map((pair) => ({
      ...pair.right,
      pairId: pair.id,
    }));

    if (activity.shuffleRight === false || raw.length <= 1) {
      return raw;
    }

    const shuffled = [...raw];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Guarantee that right items are not in exact 1-to-1 parallel alignment with left
    const hasAnyOppositeDuplicate = shuffled.some(
      (item, idx) => item.pairId === leftItems[idx]?.pairId
    );
    if (hasAnyOppositeDuplicate && shuffled.length > 1) {
      const first = shuffled.shift()!;
      shuffled.push(first);
    }

    return shuffled;
  }, [activity.pairs, activity.shuffleRight, leftItems]);

  // Interactive matching state
  const [selectedLeftId, setSelectedLeftId] = useState<string | null>(null);
  const [selectedRightId, setSelectedRightId] = useState<string | null>(null);
  const [completedPairIds, setCompletedPairIds] = useState<Set<string>>(
    () => new Set<string>()
  );
  const [incorrectMatch, setIncorrectMatch] = useState<{
    leftId: string;
    rightId: string;
  } | null>(null);
  const [isDebouncing, setIsDebouncing] = useState<boolean>(false);

  // Attempt statistics
  const attemptsRef = useRef<number>(0);
  const mistakesRef = useRef<number>(0);

  // Layout coordinate tracking for drawing SVG connection lines
  const [stageDimensions, setStageDimensions] = useState<{
    width: number;
    height: number;
  }>({ width: 0, height: 0 });

  const [cardCoordinates, setCardCoordinates] = useState<{
    left: Record<string, { x: number; y: number; width: number; height: number }>;
    right: Record<string, { x: number; y: number; width: number; height: number }>;
  }>({ left: {}, right: {} });

  // Map each pair ID to a stable accent color
  const pairColorMap = useMemo(() => {
    const map = new Map<string, number>();
    activity.pairs.forEach((pair, idx) => {
      map.set(pair.id, idx);
    });
    return map;
  }, [activity.pairs]);

  // Handle stage layout measurement
  const handleStageLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setStageDimensions({ width, height });
  }, []);

  // Measure individual card layout coordinates
  const handleCardLayout = useCallback(
    (side: "left" | "right", itemId: string, e: LayoutChangeEvent) => {
      const { x, y, width, height } = e.nativeEvent.layout;
      setCardCoordinates((prev) => ({
        ...prev,
        [side]: {
          ...prev[side],
          [itemId]: { x, y, width, height },
        },
      }));
    },
    []
  );

  // Evaluate matching pair
  const evaluateMatch = useCallback(
    (leftItem: InternalMatchingItem, rightItem: InternalMatchingItem) => {
      setIsDebouncing(true);
      attemptsRef.current += 1;

      const isMatch = leftItem.pairId === rightItem.pairId;

      if (isMatch) {
        // Correct pair match
        const newCompleted = new Set(completedPairIds);
        newCompleted.add(leftItem.pairId);
        setCompletedPairIds(newCompleted);
        setSelectedLeftId(null);
        setSelectedRightId(null);
        setIsDebouncing(false);

        if (onRecordAttempt) {
          onRecordAttempt(true, {
            activityId: activity.id,
            leftItemId: leftItem.id,
            rightItemId: rightItem.id,
            isMatch: true,
            attemptNumber: attemptsRef.current,
            completedPairsCount: newCompleted.size,
            totalPairsCount: activity.pairs.length,
          });
        }

        // If all pairs are completed, finish activity!
        if (newCompleted.size === activity.pairs.length) {
          setTimeout(() => {
            onComplete();
          }, 350);
        }
      } else {
        // Incorrect pair match
        mistakesRef.current += 1;
        setIncorrectMatch({ leftId: leftItem.id, rightId: rightItem.id });

        if (onRecordAttempt) {
          onRecordAttempt(false, {
            activityId: activity.id,
            leftItemId: leftItem.id,
            rightItemId: rightItem.id,
            isMatch: false,
            attemptNumber: attemptsRef.current,
            completedPairsCount: completedPairIds.size,
            totalPairsCount: activity.pairs.length,
          });
        }

        setTimeout(() => {
          setIncorrectMatch(null);
          setSelectedLeftId(null);
          setSelectedRightId(null);
          setIsDebouncing(false);
        }, 600);
      }
    },
    [activity.id, activity.pairs.length, completedPairIds, onComplete, onRecordAttempt]
  );

  // Handle tap on a left card
  const handleLeftPress = useCallback(
    (item: InternalMatchingItem) => {
      if (completedPairIds.has(item.pairId) || isDebouncing) return;

      if (selectedRightId) {
        // Child has already picked a right card: evaluate match!
        const rightItem = rightItems.find((r) => r.id === selectedRightId);
        if (rightItem) {
          setSelectedLeftId(item.id);
          evaluateMatch(item, rightItem);
          return;
        }
      }

      // Toggle or select left card
      setSelectedLeftId(selectedLeftId === item.id ? null : item.id);
    },
    [completedPairIds, isDebouncing, rightItems, selectedLeftId, selectedRightId, evaluateMatch]
  );

  // Handle tap on a right card
  const handleRightPress = useCallback(
    (item: InternalMatchingItem) => {
      if (completedPairIds.has(item.pairId) || isDebouncing) return;

      if (selectedLeftId) {
        // Child has already picked a left card: evaluate match!
        const leftItem = leftItems.find((l) => l.id === selectedLeftId);
        if (leftItem) {
          setSelectedRightId(item.id);
          evaluateMatch(leftItem, item);
          return;
        }
      }

      // Toggle or select right card
      setSelectedRightId(selectedRightId === item.id ? null : item.id);
    },
    [completedPairIds, isDebouncing, leftItems, selectedLeftId, selectedRightId, evaluateMatch]
  );

  // Resolve localized instruction string
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
    return isKm ? "ភ្ជាប់រូបភាពដែលត្រូវគ្នា" : "Match the pairs";
  }, [activity, isKm, t]);

  // Compute completed SVG lines
  const connectionLines: MatchingLineConnection[] = useMemo(() => {
    const lines: MatchingLineConnection[] = [];
    const stageWidth = stageDimensions.width;

    if (stageWidth <= 0) return lines;

    completedPairIds.forEach((pairId) => {
      const leftItem = leftItems.find((l) => l.pairId === pairId);
      const rightItem = rightItems.find((r) => r.pairId === pairId);

      if (!leftItem || !rightItem) return;

      const leftCoord = cardCoordinates.left[leftItem.id];
      const rightCoord = cardCoordinates.right[rightItem.id];

      if (!leftCoord || !rightCoord) return;

      const colorIndex = pairColorMap.get(pairId) ?? 0;
      const color = PAIR_ACCENT_COLORS[colorIndex % PAIR_ACCENT_COLORS.length];

      lines.push({
        pairId,
        // Connect from right edge of left card to left edge of right card
        leftPoint: {
          x: leftCoord.x + leftCoord.width,
          y: leftCoord.y + leftCoord.height / 2,
        },
        rightPoint: {
          x: rightCoord.x,
          y: rightCoord.y + rightCoord.height / 2,
        },
        color,
      });
    });

    return lines;
  }, [completedPairIds, leftItems, rightItems, cardCoordinates, pairColorMap, stageDimensions.width]);

  return (
    <View
      style={[
        styles.container,
        responsive.isTablet && styles.tabletContainer,
      ]}
    >
      {/* 1. Instruction & Prompt Header */}
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

      {/* 2. Two-Column Matching Stage */}
      <View style={styles.stage} onLayout={handleStageLayout}>
        {/* SVG Bezier Connection Lines Layer */}
        <MatchingConnectionLines
          width={stageDimensions.width}
          height={stageDimensions.height}
          connections={connectionLines}
        />

        {/* Left Column */}
        <View style={styles.column}>
          {leftItems.map((item) => {
            const isCompleted = completedPairIds.has(item.pairId);
            const isSelected = selectedLeftId === item.id;
            const isIncorrect = incorrectMatch?.leftId === item.id;
            const pairColorIndex = pairColorMap.get(item.pairId) ?? 0;

            return (
              <View
                key={`left-${item.id}`}
                style={styles.cardContainer}
                onLayout={(e) => handleCardLayout("left", item.id, e)}
              >
                <MatchingCard
                  item={item}
                  side="left"
                  isSelected={isSelected}
                  isCompleted={isCompleted}
                  isIncorrect={isIncorrect}
                  pairColorIndex={pairColorIndex}
                  onPress={() => handleLeftPress(item)}
                  locale={locale}
                />
              </View>
            );
          })}
        </View>

        {/* Center Connection Channel Spacer */}
        <View style={styles.centerChannel} />

        {/* Right Column (Shuffled) */}
        <View style={styles.column}>
          {rightItems.map((item) => {
            const isCompleted = completedPairIds.has(item.pairId);
            const isSelected = selectedRightId === item.id;
            const isIncorrect = incorrectMatch?.rightId === item.id;
            const pairColorIndex = pairColorMap.get(item.pairId) ?? 0;

            return (
              <View
                key={`right-${item.id}`}
                style={styles.cardContainer}
                onLayout={(e) => handleCardLayout("right", item.id, e)}
              >
                <MatchingCard
                  item={item}
                  side="right"
                  isSelected={isSelected}
                  isCompleted={isCompleted}
                  isIncorrect={isIncorrect}
                  pairColorIndex={pairColorIndex}
                  onPress={() => handleRightPress(item)}
                  locale={locale}
                />
              </View>
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
    maxWidth: 580,
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
  stage: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    position: "relative",
  },
  column: {
    flex: 1,
    flexDirection: "column",
    gap: Spacing.md,
  },
  centerChannel: {
    width: 24,
  },
  cardContainer: {
    width: "100%",
  },
});
