import { 
  withSpring, 
  withTiming, 
  withSequence, 
  withRepeat, 
  Easing, 
  WithSpringConfig 
} from "react-native-reanimated";

/**
 * Reanimated Animation Primitives for Koki
 * Tuned specifically for soft 3D child-friendly interactions.
 */

export const SpringConfigs = {
  // Tactile press for chunky game buttons
  tactilePress: {
    damping: 15,
    stiffness: 220,
    mass: 0.6,
  } as WithSpringConfig,

  // Soft spring release
  tactileRelease: {
    damping: 10,
    stiffness: 170,
    mass: 0.8,
  } as WithSpringConfig,

  // Cheerful bounce for reward popups and stars
  bouncy: {
    damping: 8,
    stiffness: 130,
    mass: 0.9,
  } as WithSpringConfig,

  // Gentle pop-in for badges
  popIn: {
    damping: 12,
    stiffness: 160,
    mass: 0.7,
  } as WithSpringConfig,
};

export const Timings = {
  quick: 150,
  normal: 250,
  floatCycle: 3200,
  wiggleCycle: 1200,
  pulseCycle: 2000,
};
