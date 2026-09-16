import { StyleSheet, ViewStyle } from "react-native";
import { Palette } from "./theme";

/**
 * Dimensional Game-Like Depth Tokens
 * Designed to feel physically raised, tactile, and pressable.
 */
export const Depth = {
  // Extrusion height for physical 3D buttons
  extrusion: {
    compact: 3,
    normal: 5,
    large: 7,
  },

  // Pressed travel distance
  pressedTravel: 4,

  // Styles
  styles: StyleSheet.create({
    subtleCard: {
      shadowColor: Palette.primaryText,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 2,
    },
    elevatedCard: {
      shadowColor: Palette.primaryText,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.09,
      shadowRadius: 12,
      elevation: 4,
    },
    floatingCard: {
      shadowColor: Palette.primaryText,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.12,
      shadowRadius: 18,
      elevation: 7,
    },
    buttonDropShadow: {
      shadowColor: Palette.primaryText,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 6,
      elevation: 3,
    },
  }),
};
