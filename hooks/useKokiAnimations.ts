import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";
import { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withSequence, 
  withRepeat, 
  withTiming, 
  Easing 
} from "react-native-reanimated";
import { SpringConfigs, Timings } from "@/lib/animation/primitives";
import { Depth } from "@/constants/depth";

/**
 * Hook to respect user preference for reduced motion
 */
export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion);
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReducedMotion
    );
    return () => {
      subscription.remove();
    };
  }, []);

  return reducedMotion;
}

/**
 * 3D Physical Button Press Interaction
 * Face moves downward by extrusion height, scale slightly down (0.98),
 * and springs back smoothly on release.
 */
export function useKokiButtonPress(extrusionHeight = Depth.extrusion.normal) {
  const reducedMotion = useReducedMotion();
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);

  const onPressIn = () => {
    "worklet";
    if (reducedMotion) {
      scale.value = 0.98;
      return;
    }
    translateY.value = withSpring(extrusionHeight, SpringConfigs.tactilePress);
    scale.value = withSpring(0.985, SpringConfigs.tactilePress);
  };

  const onPressOut = () => {
    "worklet";
    if (reducedMotion) {
      scale.value = 1;
      return;
    }
    translateY.value = withSpring(0, SpringConfigs.tactileRelease);
    scale.value = withSpring(1, SpringConfigs.tactileRelease);
  };

  const faceAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return {
    onPressIn,
    onPressOut,
    faceAnimatedStyle,
  };
}

/**
 * Gentle floating animation for floating cards, islands, or mascots
 */
export function useGentleFloat(amplitude = 6, duration = Timings.floatCycle) {
  const reducedMotion = useReducedMotion();
  const translateY = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) return;

    translateY.value = withRepeat(
      withSequence(
        withTiming(-amplitude, { duration: duration / 2, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: duration / 2, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [reducedMotion, amplitude, duration, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return animatedStyle;
}

/**
 * Soft pulse animation for badges and highlights
 */
export function useSoftPulse(minScale = 0.97, maxScale = 1.03, duration = Timings.pulseCycle) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);

  useEffect(() => {
    if (reducedMotion) return;

    scale.value = withRepeat(
      withSequence(
        withTiming(maxScale, { duration: duration / 2, easing: Easing.inOut(Easing.ease) }),
        withTiming(minScale, { duration: duration / 2, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [reducedMotion, minScale, maxScale, duration, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return animatedStyle;
}

/**
 * Attention-grabbing subtle wiggle
 */
export function useWiggleAnimation() {
  const reducedMotion = useReducedMotion();
  const rotation = useSharedValue(0);

  const triggerWiggle = () => {
    "worklet";
    if (reducedMotion) return;

    rotation.value = withSequence(
      withTiming(-6, { duration: 60 }),
      withTiming(6, { duration: 60 }),
      withTiming(-4, { duration: 60 }),
      withTiming(4, { duration: 60 }),
      withTiming(0, { duration: 60 })
    );
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return { triggerWiggle, animatedStyle };
}
