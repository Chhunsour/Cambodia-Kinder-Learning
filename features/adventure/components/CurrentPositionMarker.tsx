import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { KokiMascot } from "@/components/koki/KokiMascot";
import { Text } from "@/components/ui/Text";
import { Palette } from "@/constants/theme";

interface CurrentPositionMarkerProps {
  x: number; // Node center X
  y: number; // Node center Y
  contentWidth: number;
  letsGoLabel?: string;
}

export const CurrentPositionMarker: React.FC<CurrentPositionMarkerProps> = ({
  x,
  y,
  contentWidth,
  letsGoLabel = "Let's go!",
}) => {
  const isRightSide = x > contentWidth / 2;
  const bounceY = useSharedValue(0);

  useEffect(() => {
    bounceY.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [bounceY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bounceY.value }],
  }));

  // Position Koki to the opposite side of the node so it doesn't clip offscreen
  const markerX = isRightSide ? x - 88 : x + 44;
  const markerY = y - 32;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.container,
        {
          left: markerX,
          top: markerY,
        },
        animatedStyle,
      ]}
    >
      {/* Koki Mascot Avatar */}
      <View style={styles.mascotWrapper}>
        <KokiMascot size={46} mood="happy" />
      </View>

      {/* Mini Speech Bubble */}
      <View style={styles.bubble}>
        <Text variant="caption" weight="800" style={styles.bubbleText}>
          {letsGoLabel} 🚀
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    alignItems: "center",
    zIndex: 10,
  },
  mascotWrapper: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
    elevation: 4,
  },
  bubble: {
    marginTop: 2,
    backgroundColor: Palette.pureWhite,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Palette.primaryOrange,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 3,
  },
  bubbleText: {
    color: Palette.primaryOrange,
    fontSize: 10,
    lineHeight: 13,
  },
});
