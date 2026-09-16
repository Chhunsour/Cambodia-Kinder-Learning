import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { KokiMascot, MascotMood } from "@/components/koki/KokiMascot";
import { SpeechBubble } from "@/components/ui/SpeechBubble";
import { KokiFeedbackMood } from "../types";
import { Spacing } from "@/constants/spacing";

export interface KokiFeedbackProps {
  mood: KokiFeedbackMood;
  message?: string;
  speakerName?: string;
  size?: number;
  style?: ViewStyle;
}

/**
 * Map lesson feedback mood to Koki mascot visual expressions.
 */
function mapMoodToMascotExpression(mood: KokiFeedbackMood): MascotMood {
  switch (mood) {
    case "correct":
      return "happy";
    case "celebration":
      return "cheering";
    case "tryAgain":
      return "thinking";
    case "encouraging":
      return "happy";
    case "neutral":
    default:
      return "idle";
  }
}

/**
 * Reusable Koki Feedback Area for Learning Activities.
 *
 * Displays Koki mascot reacting dynamically to answer states
 * alongside a child-friendly speech bubble prompt.
 */
export function KokiFeedbackArea({
  mood,
  message,
  speakerName = "Koki",
  size = 75,
  style,
}: KokiFeedbackProps) {
  const mascotMood = mapMoodToMascotExpression(mood);

  return (
    <View style={[styles.container, style]}>
      {/* Speech Bubble Feedback */}
      {message && (
        <Animated.View
          key={`${mood}-${message}`}
          entering={FadeInDown.duration(300).springify()}
          style={styles.bubbleWrapper}
        >
          <SpeechBubble
            message={message}
            speakerName={speakerName}
            tailDirection="bottom"
            style={styles.bubble}
          />
        </Animated.View>
      )}

      {/* Mascot Expression */}
      <View style={styles.mascotWrapper}>
        <KokiMascot size={size} mood={mascotMood} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: Spacing.xxs,
  },
  bubbleWrapper: {
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
    marginBottom: -6,
    zIndex: 2,
  },
  bubble: {
    maxWidth: "94%",
  },
  mascotWrapper: {
    alignItems: "center",
    zIndex: 1,
  },
});
