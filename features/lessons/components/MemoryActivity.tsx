import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { Palette } from "@/constants/theme";
import { Radius, Spacing } from "@/constants/spacing";
import { useLocalization } from "@/hooks/useLocalization";
import { useKokiResponsive } from "@/hooks/useKokiResponsive";
import {
  ActivityLifecycleState,
  MemoryActivityData,
  MemoryCardContent,
} from "../types";
import { MemoryCard } from "./MemoryCard";
import { useLessonSound } from "../hooks/useLessonSound";

export interface MemoryActivityProps {
  activity: MemoryActivityData;
  lifecycleState: ActivityLifecycleState;
  onComplete: () => void;
  onRecordAttempt?: (isCorrect: boolean, report?: any) => void;
}

interface DeckCard {
  instanceId: string;
  pairId: string;
  content: MemoryCardContent;
}

export const MemoryActivity: React.FC<MemoryActivityProps> = ({
  activity,
  lifecycleState,
  onComplete,
  onRecordAttempt,
}) => {
  const { locale, t } = useLocalization();
  const responsive = useKokiResponsive();
  const isKm = locale === "km";
  const { playCorrectSound, playIncorrectSound } = useLessonSound();

  // Create and stably shuffle deck once per activity ID
  const deck: DeckCard[] = useMemo(() => {
    const rawCards: DeckCard[] = [];
    activity.pairs.forEach((pair) => {
      rawCards.push({
        instanceId: `${pair.id}_a`,
        pairId: pair.id,
        content: pair.first,
      });
      rawCards.push({
        instanceId: `${pair.id}_b`,
        pairId: pair.id,
        content: pair.second,
      });
    });

    if (activity.shuffle === false || rawCards.length <= 1) {
      return rawCards;
    }

    // Fisher-Yates stable shuffle
    const shuffled = [...rawCards];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, [activity.id, activity.pairs, activity.shuffle]);

  // Game state
  const [flippedCardIds, setFlippedCardIds] = useState<string[]>([]);
  const [matchedPairIds, setMatchedPairIds] = useState<Set<string>>(
    () => new Set<string>()
  );
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const [wigglingCardIds, setWigglingCardIds] = useState<string[]>([]);

  // Performance tracking
  const attemptsRef = useRef<number>(0);
  const mistakesRef = useRef<number>(0);

  // Active comparison timeout reference for clean unmounting
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Card tap handler
  const handleCardPress = useCallback(
    (card: DeckCard) => {
      // Ignore if currently comparing, or already flipped/matched
      if (
        isComparing ||
        flippedCardIds.includes(card.instanceId) ||
        matchedPairIds.has(card.pairId)
      ) {
        return;
      }

      if (flippedCardIds.length === 0) {
        // First card revealed
        setFlippedCardIds([card.instanceId]);
        return;
      }

      if (flippedCardIds.length === 1) {
        // Second card revealed: lock interaction and compare
        const firstCardId = flippedCardIds[0];
        const firstCard = deck.find((c) => c.instanceId === firstCardId)!;
        const secondCard = card;

        setFlippedCardIds([firstCardId, secondCard.instanceId]);
        setIsComparing(true);
        attemptsRef.current += 1;

        const isMatch = firstCard.pairId === secondCard.pairId;

        if (isMatch) {
          // Correct Match!
          playCorrectSound();
          const newMatched = new Set(matchedPairIds);
          newMatched.add(firstCard.pairId);
          setMatchedPairIds(newMatched);

          if (onRecordAttempt) {
            onRecordAttempt(true, {
              activityId: activity.id,
              firstCardId: firstCard.instanceId,
              secondCardId: secondCard.instanceId,
              isMatch: true,
              attemptNumber: attemptsRef.current,
              pairsMatchedCount: newMatched.size,
              totalPairsCount: activity.pairs.length,
            });
          }

          setFlippedCardIds([]);
          setIsComparing(false);

          // If all pairs matched, finish lesson activity
          if (newMatched.size === activity.pairs.length) {
            setTimeout(() => {
              onComplete();
            }, 450);
          }
        } else {
          // Mismatch!
          mistakesRef.current += 1;
          playIncorrectSound();

          if (onRecordAttempt) {
            onRecordAttempt(false, {
              activityId: activity.id,
              firstCardId: firstCard.instanceId,
              secondCardId: secondCard.instanceId,
              isMatch: false,
              attemptNumber: attemptsRef.current,
              pairsMatchedCount: matchedPairIds.size,
              totalPairsCount: activity.pairs.length,
            });
          }

          // Trigger gentle horizontal wiggle on mismatched cards
          setWigglingCardIds([firstCard.instanceId, secondCard.instanceId]);

          // Keep both visible for child-friendly duration before flipping back
          const revealDuration = activity.revealDurationMs ?? 1000;
          timeoutRef.current = setTimeout(() => {
            setWigglingCardIds([]);
            setFlippedCardIds([]);
            setIsComparing(false);
          }, revealDuration);
        }
      }
    },
    [
      activity.id,
      activity.pairs.length,
      activity.revealDurationMs,
      deck,
      flippedCardIds,
      isComparing,
      matchedPairIds,
      onComplete,
      onRecordAttempt,
      playCorrectSound,
      playIncorrectSound,
    ]
  );

  // Responsive column count based on deck size
  const totalCards = deck.length;
  let columns = 3;
  if (totalCards <= 4) {
    columns = 2;
  } else if (totalCards === 6) {
    columns = 3;
  } else if (totalCards === 8) {
    columns = 4;
  } else if (totalCards >= 12) {
    columns = 4;
  }

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
    return isKm
      ? "ផ្គូផ្គងសន្លឹកបៀដែលដូចគ្នា"
      : "Find the matching pairs";
  }, [activity, isKm, t]);

  return (
    <View
      style={[
        styles.container,
        responsive.isTablet && styles.tabletContainer,
      ]}
    >
      {/* 1. Instruction Title */}
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
      </View>

      {/* 2. Responsive Card Grid */}
      <View style={styles.gridWrapper}>
        <View style={styles.grid}>
          {deck.map((card, index) => {
            const isRevealed = flippedCardIds.includes(card.instanceId);
            const isMatched = matchedPairIds.has(card.pairId);
            const isWiggling = wigglingCardIds.includes(card.instanceId);

            // Compute item width percentage based on columns
            const itemWidthPercent = `${Math.floor(100 / columns)}%` as any;

            return (
              <View
                key={card.instanceId}
                style={[
                  styles.cardSlot,
                  { width: itemWidthPercent },
                  columns === 2 && styles.cardSlotTwoCol,
                  columns === 4 && styles.cardSlotFourCol,
                ]}
              >
                <MemoryCard
                  content={card.content}
                  isRevealed={isRevealed}
                  isMatched={isMatched}
                  isWiggling={isWiggling}
                  cardIndex={index}
                  totalCards={totalCards}
                  onPress={() => handleCardPress(card)}
                  disabled={isComparing}
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
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  instructionText: {
    lineHeight: 34,
  },
  gridWrapper: {
    width: "100%",
    alignItems: "center",
    marginTop: Spacing.xs,
  },
  grid: {
    width: "100%",
    maxWidth: 540,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
  },
  cardSlot: {
    padding: 3,
    alignItems: "stretch",
  },
  cardSlotTwoCol: {
    padding: 6,
    maxWidth: 160,
  },
  cardSlotFourCol: {
    padding: 2,
    maxWidth: 125,
  },
});
