import React, { useCallback, useEffect, useState } from "react";
import { View, StyleSheet, Pressable, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
} from "react-native-reanimated";
import { Text } from "@/components/ui/Text";
import { Palette } from "@/constants/theme";
import { Radius, Spacing, TouchTarget } from "@/constants/spacing";
import { Depth } from "@/constants/depth";
import { useKokiButtonPress } from "@/hooks/useKokiAnimations";
import { audioService } from "@/services/audio/audioService";
import { AudioPlaybackState } from "@/services/audio/types";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface AudioReplayButtonProps {
  audioKey: string;
  isRequired?: boolean;
  size?: "normal" | "large" | "compact";
  label?: string;
  color?: "sky" | "orange" | "cream" | "green";
  autoplay?: boolean;
  onPlaybackStateChange?: (state: AudioPlaybackState) => void;
  style?: ViewStyle;
}

/**
 * Child-Friendly Audio Replay Button.
 *
 * Implements:
 * - 4 states: loading, ready, playing, error
 * - Overlap prevention: rapid taps replace cleanly without cacophony
 * - Animated sound waves / pulse while audio is actively playing
 * - Required audio bypass support (plays even if optional narration is off)
 * - Safe error fallback (never displays technical errors to children)
 * - Large kid-friendly touch target (min 48px, default 56px, large 68px)
 */
export const AudioReplayButton: React.FC<AudioReplayButtonProps> = ({
  audioKey,
  isRequired = true,
  size = "normal",
  label,
  color = "sky",
  autoplay = false,
  onPlaybackStateChange,
  style,
}) => {
  const [playbackState, setPlaybackState] = useState<AudioPlaybackState>("ready");
  const waveScale = useSharedValue(1);

  const extrusion = Depth.extrusion.compact;
  const { onPressIn, onPressOut, faceAnimatedStyle } = useKokiButtonPress(extrusion);

  // Play audio clip
  const playSound = useCallback(async () => {
    if (!audioKey) return;

    try {
      if (isRequired) {
        await audioService.playRequiredAudio(audioKey, {
          onPlaybackStatusUpdate: (status) => {
            setPlaybackState(status);
            onPlaybackStateChange?.(status);
          },
        });
      } else {
        await audioService.playNarration(audioKey, {
          onPlaybackStatusUpdate: (status) => {
            setPlaybackState(status);
            onPlaybackStateChange?.(status);
          },
        });
      }
    } catch (e) {
      // Graceful error fallback
      setPlaybackState("ready");
      onPlaybackStateChange?.("ready");
    }
  }, [audioKey, isRequired, onPlaybackStateChange]);

  // Autoplay on mount if configured
  useEffect(() => {
    if (autoplay && audioKey) {
      // Delay slightly for smooth screen transition
      const timer = setTimeout(() => {
        playSound().catch(() => {});
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [autoplay, audioKey, playSound]);

  // Pulse animation when playing
  useEffect(() => {
    if (playbackState === "playing") {
      waveScale.value = withRepeat(
        withSequence(
          withTiming(1.14, { duration: 280 }),
          withTiming(1.0, { duration: 280 })
        ),
        -1,
        true
      );
    } else {
      waveScale.value = withSpring(1);
    }
  }, [playbackState, waveScale]);

  const animatedWaveStyle = useAnimatedStyle(() => ({
    transform: [{ scale: waveScale.value }],
  }));

  const getDimensions = () => {
    switch (size) {
      case "compact":
        return { box: TouchTarget.min, iconSize: 22 };
      case "large":
        return { box: 68, iconSize: 32 };
      case "normal":
      default:
        return { box: 56, iconSize: 26 };
    }
  };

  const { box, iconSize } = getDimensions();

  const getColorTheme = () => {
    switch (color) {
      case "orange":
        return { face: Palette.primaryOrange, extrusion: Palette.deepOrange, border: "#E56300", text: Palette.inverseText };
      case "green":
        return { face: Palette.green, extrusion: Palette.darkGreen, border: "#4AA43B", text: Palette.inverseText };
      case "cream":
        return { face: Palette.warmCream, extrusion: Palette.borderStrong, border: Palette.borderSubtle, text: Palette.primaryText };
      case "sky":
      default:
        return { face: "#E0F2FE", extrusion: "#7DD3FC", border: "#38BDF8", text: "#0369A1" };
    }
  };

  const colors = getColorTheme();
  const isPlaying = playbackState === "playing";

  return (
    <View style={[styles.container, { width: label ? undefined : box, height: box + extrusion }, style]}>
      {/* 3D Extrusion base */}
      <View
        style={[
          styles.extrusion,
          {
            backgroundColor: colors.extrusion,
            borderRadius: label ? Radius.lg : Radius.circle,
            width: label ? "100%" : box,
            height: box,
            top: extrusion,
          },
        ]}
      />

      {/* Button face */}
      <AnimatedPressable
        onPress={playSound}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole="button"
        accessibilityLabel={label || "Listen to audio / ស្តាប់សំឡេង"}
        style={[
          styles.face,
          {
            width: label ? undefined : box,
            paddingHorizontal: label ? Spacing.md : 0,
            height: box,
            borderRadius: label ? Radius.lg : Radius.circle,
            backgroundColor: isPlaying ? "#BAE6FD" : colors.face,
            borderColor: colors.border,
          },
          Depth.styles.buttonDropShadow,
          faceAnimatedStyle,
        ]}
      >
        <Animated.View style={[styles.innerContent, animatedWaveStyle]}>
          <Text style={{ fontSize: iconSize }}>
            {isPlaying ? "🔊" : playbackState === "loading" ? "⏳" : "🔊"}
          </Text>
          {Boolean(label) && (
            <Text
              variant="body"
              weight="bold"
              style={{ marginLeft: Spacing.xs, color: colors.text }}
            >
              {label}
            </Text>
          )}
        </Animated.View>
      </AnimatedPressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  extrusion: {
    position: "absolute",
    left: 0,
    bottom: 0,
  },
  face: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    flexDirection: "row",
  },
  innerContent: {
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
});
