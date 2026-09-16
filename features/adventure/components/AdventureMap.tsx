import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui/Text";
import { Palette } from "@/constants/theme";
import { Spacing } from "@/constants/spacing";
import { useLocalization } from "@/hooks/useLocalization";
import { MapNodeData, WorldDefinition } from "../types";
import { calculateMapLayout } from "../utils/mapGeometry";
import { MapBackground } from "./MapBackground";
import { MapPath } from "./MapPath";
import { LevelNode } from "./LevelNode";
import { TreasureNode } from "./TreasureNode";
import { ChallengeNode } from "./ChallengeNode";
import { SideQuestNode } from "./SideQuestNode";
import { CurrentPositionMarker } from "./CurrentPositionMarker";
import { WorldHeader } from "./WorldHeader";
import { SpecialNodeModal } from "./SpecialNodeModal";
import { useHearts, HeartRecoveryModal } from "@/features/hearts";
import { useWorldProgression } from "@/features/progression";

interface AdventureMapProps {
  world: WorldDefinition;
}

export const AdventureMap: React.FC<AdventureMapProps> = ({ world }) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { locale, t } = useLocalization();
  const isKm = locale === "km";

  // Dynamic English side-quest progress for badge display
  const { summary: englishSummary } = useWorldProgression("english_basics");

  // Dynamic SQLite hearts & recovery state for active child profile
  const { currentHearts, nextHeartInMs, fullRegenInMs } = useHearts();
  const [heartModalVisible, setHeartModalVisible] = useState(false);
  const [pendingLessonId, setPendingLessonId] = useState<string | null>(null);

  // Tablet responsiveness: clamp map width to comfortable child reach
  const mapContentWidth = Math.min(screenWidth, 560);
  const horizontalMargin = Math.max(0, (screenWidth - mapContentWidth) / 2);

  const scrollViewRef = useRef<ScrollView>(null);
  const [hasAutoScrolled, setHasAutoScrolled] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  // Modal state for special nodes
  const [selectedSpecialNode, setSelectedSpecialNode] = useState<MapNodeData | null>(null);

  // Calculate layout geometry
  const layout = useMemo(() => {
    return calculateMapLayout(world.nodes, mapContentWidth, {
      yStart: 80,
      spacing: 120,
    });
  }, [world.nodes, mapContentWidth]);

  // Safely auto-scroll near current level without layout jumping
  useEffect(() => {
    if (!hasAutoScrolled && layout.currentLevelPosition) {
      const currentY = layout.currentLevelPosition.y;
      const targetY = Math.max(0, currentY - screenHeight * 0.35);

      const timer = setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: targetY, animated: true });
        setHasAutoScrolled(true);
      }, 150);

      return () => clearTimeout(timer);
    }
  }, [hasAutoScrolled, layout.currentLevelPosition, screenHeight]);

  const scrollToCurrentLevel = useCallback(() => {
    if (layout.currentLevelPosition) {
      const targetY = Math.max(0, layout.currentLevelPosition.y - screenHeight * 0.35);
      scrollViewRef.current?.scrollTo({ y: targetY, animated: true });
    }
  }, [layout.currentLevelPosition, screenHeight]);

  // Node interaction handlers
  const handleNodePress = useCallback(
    (node: MapNodeData) => {
      if (node.status === "locked") {
        return;
      }

      const targetId = node.lessonId || "demo";

      if (node.type === "sideQuest") {
        router.push("/side-quest/english");
        return;
      }

      if (node.type === "lesson") {
        if (node.status === "completed") {
          // Replaying completed lesson: if out of hearts, default to practice mode smoothly
          router.push(
            `/lesson/${targetId}?mode=${currentHearts > 0 ? "progress" : "practice"}`
          );
          return;
        }

        // Progression lesson:
        if (currentHearts > 0) {
          router.push(`/lesson/${targetId}?mode=progress`);
        } else {
          setPendingLessonId(targetId);
          setHeartModalVisible(true);
        }
      } else {
        // Special nodes show informative popup modal
        setSelectedSpecialNode(node);
      }
    },
    [router, currentHearts]
  );

  const handleModalAction = useCallback(
    (node: MapNodeData) => {
      setSelectedSpecialNode(null);
      if (node.type === "sideQuest") {
        router.push("/side-quest/english");
        return;
      }
      if (node.type === "challenge") {
        const targetId = node.lessonId || "demo";
        if (currentHearts > 0) {
          router.push(`/lesson/${targetId}?mode=progress`);
        } else {
          setPendingLessonId(targetId);
          setHeartModalVisible(true);
        }
      }
    },
    [router, currentHearts]
  );

  // Floating "Go to Koki" button when scrolled far from current level
  const currentY = layout.currentLevelPosition?.y ?? 0;
  const isFarFromCurrent =
    Math.abs(scrollY - (currentY - screenHeight * 0.35)) > screenHeight * 0.7;

  return (
    <View style={styles.root}>
      {/* Sticky Top World Header */}
      <View style={[styles.stickyHeaderWrapper, { paddingTop: insets.top }]}>
        <WorldHeader
          world={world}
          isKm={isKm}
          hearts={currentHearts}
          onHeartsPress={() => setHeartModalVisible(true)}
        />
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: insets.bottom + 120, // Extra clearance for floating KokiTabBar
          },
        ]}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={32}
        onScroll={(e) => setScrollY(e.nativeEvent.contentOffset.y)}
      >
        <View
          style={[
            styles.mapStage,
            {
              width: mapContentWidth,
              height: layout.totalHeight,
              marginHorizontal: horizontalMargin,
            },
          ]}
        >
          {/* Background Scenery & Rolling Hills */}
          <MapBackground width={mapContentWidth} height={layout.totalHeight} />

          {/* SVG Winding Progression & Branch Paths */}
          <MapPath
            width={mapContentWidth}
            height={layout.totalHeight}
            mainPoints={layout.mainPathPoints}
            branchConnections={layout.branchConnections}
          />

          {/* Active Level Focal Character Marker */}
          {layout.currentLevelPosition && (
            <CurrentPositionMarker
              x={layout.currentLevelPosition.x}
              y={layout.currentLevelPosition.y}
              contentWidth={mapContentWidth}
              letsGoLabel={isKm ? "តោះទៅ!" : "Let's go!"}
            />
          )}

          {/* Render All Map Nodes */}
          {layout.positionedNodes.map((pos) => {
            const { node, x, y } = pos;
            const nodeKey = `node-${node.id}`;

            return (
              <View
                key={nodeKey}
                style={[
                  styles.nodeAbsoluteWrapper,
                  {
                    left: x - 45,
                    top: y - 45,
                  },
                ]}
              >
                {node.type === "lesson" && (
                  <LevelNode
                    node={node}
                    onPress={handleNodePress}
                    playLabel={isKm ? "លេង" : "Play"}
                  />
                )}

                {node.type === "treasure" && (
                  <TreasureNode node={node} onPress={handleNodePress} />
                )}

                {node.type === "challenge" && (
                  <ChallengeNode
                    node={node}
                    onPress={handleNodePress}
                    label={isKm ? "ការប្រកួត" : "Challenge"}
                  />
                )}

                {node.type === "sideQuest" && (
                  <SideQuestNode
                    node={node}
                    onPress={handleNodePress}
                    label={isKm ? "អង់គ្លេស" : "English"}
                    progressText={
                      englishSummary
                        ? `${englishSummary.completedLessons}/${englishSummary.totalLessons}`
                        : "ABC"
                    }
                  />
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Quick Snap to Koki Floating Button */}
      {isFarFromCurrent && (
        <Pressable
          onPress={scrollToCurrentLevel}
          style={[styles.floatingJumpButton, { bottom: insets.bottom + 90 }]}
          accessibilityRole="button"
          accessibilityLabel="Scroll to current level"
        >
          <Text variant="caption" weight="800" style={styles.floatingJumpText}>
            📍 {isKm ? "ទៅកាន់កូគី" : "Go to Koki"}
          </Text>
        </Pressable>
      )}

      {/* Special Node Modal (Treasure, Challenge, English Side Quest) */}
      <SpecialNodeModal
        visible={!!selectedSpecialNode}
        node={selectedSpecialNode}
        isKm={isKm}
        onClose={() => setSelectedSpecialNode(null)}
        onAction={handleModalAction}
      />

      {/* Heart Recovery & Practice Mode Modal */}
      <HeartRecoveryModal
        visible={heartModalVisible}
        currentHearts={currentHearts}
        nextHeartInMs={nextHeartInMs}
        fullRegenInMs={fullRegenInMs}
        showPracticeButton={true}
        onPractice={() => {
          setHeartModalVisible(false);
          const target = pendingLessonId || "demo";
          setPendingLessonId(null);
          router.push(`/lesson/${target}?mode=practice`);
        }}
        onClose={() => {
          setHeartModalVisible(false);
          setPendingLessonId(null);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Palette.warmCream,
  },
  stickyHeaderWrapper: {
    zIndex: 30,
    backgroundColor: "transparent",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  mapStage: {
    position: "relative",
    overflow: "hidden",
  },
  nodeAbsoluteWrapper: {
    position: "absolute",
    width: 90,
    height: 90,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
  },
  floatingJumpButton: {
    position: "absolute",
    alignSelf: "center",
    backgroundColor: Palette.primaryOrange,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Palette.gold,
    borderBottomWidth: 4,
    borderBottomColor: Palette.deepOrange,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
    zIndex: 40,
  },
  floatingJumpText: {
    color: Palette.pureWhite,
    fontSize: 12,
  },
});
