import { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withRepeat, 
  withSequence, 
  withTiming, 
  Easing 
} from "react-native-reanimated";

export const AnimationPresets = {
  tactileSpring: {
    damping: 12,
    stiffness: 180,
    mass: 0.8,
  },
  bouncySpring: {
    damping: 8,
    stiffness: 140,
    mass: 0.9,
  },
  gentleFloat: {
    duration: 2500,
    easing: Easing.inOut(Easing.ease),
  },
} as const;

/**
 * Reusable press scale spring hook for child-friendly chunky buttons
 */
export function usePressAnimation() {
  const scale = useSharedValue(1);

  const onPressIn = () => {
    "worklet";
    scale.value = withSpring(0.94, AnimationPresets.tactileSpring);
  };

  const onPressOut = () => {
    "worklet";
    scale.value = withSpring(1, AnimationPresets.bouncySpring);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return {
    onPressIn,
    onPressOut,
    animatedStyle,
  };
}

/**
 * Gentle floating animation for cards, islands, or mascot elements
 */
export function useFloatAnimation(amplitude = 8, duration = 3000) {
  const translateY = useSharedValue(0);

  const startFloat = () => {
    translateY.value = withRepeat(
      withSequence(
        withTiming(-amplitude, { duration: duration / 2, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: duration / 2, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return {
    translateY,
    startFloat,
    animatedStyle,
  };
}
