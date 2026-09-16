import React, { useEffect } from "react";
import { View, StyleSheet, ViewStyle, TouchableOpacity } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { Palette } from "@/constants/theme";
import { Radius, Spacing } from "@/constants/spacing";
import { Depth } from "@/constants/depth";
import { Text } from "@/components/ui/Text";
import { PetStage } from "@/features/streak/types";
import { PET_STAGE_DETAILS } from "@/features/streak/services/petStageConfig";
import { useLocalization } from "@/hooks/useLocalization";

export interface StreakPetProps {
  stage?: PetStage;
  size?: number;
  style?: ViewStyle;
  showBadge?: boolean;
  onPress?: () => void;
}

/**
 * Reusable visual companion component for Daily Streak Pet.
 * Animated stages:
 * - egg (0–2 days)
 * - hatchling (3–6 days)
 * - young (7–13 days)
 * - grown (14–29 days)
 * - special (30+ days)
 */
export const StreakPet: React.FC<StreakPetProps> = ({
  stage = "egg",
  size = 80,
  style,
  showBadge = true,
  onPress,
}) => {
  const { locale } = useLocalization();
  const isKm = locale === "km";

  const details = PET_STAGE_DETAILS[stage] || PET_STAGE_DETAILS.egg;
  const stageTitle = isKm ? details.titleKm : details.titleEn;

  // Gentle breathing / floating motion
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    translateY.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    scale.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.98, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [translateY, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const fontSize = Math.round(size * 0.52);

  const content = (
    <View
      style={[styles.container, { width: size * 1.2, minHeight: size * 1.2 }, style]}
      accessible={true}
      accessibilityRole="image"
      accessibilityLabel={`Streak pet companion, stage: ${stageTitle}`}
    >
      {/* 3D drop shadow base */}
      <View
        style={[
          styles.shadowBase,
          { width: size * 0.7, height: size * 0.16, borderRadius: size * 0.08 },
        ]}
      />

      {/* Animated companion bubble */}
      <Animated.View
        style={[
          styles.petCircle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: Math.max(2.5, Math.round(size * 0.035)),
          },
          stage === "special" && styles.petCircleSpecial,
          Depth.styles.subtleCard,
          animatedStyle,
        ]}
      >
        <Text style={{ fontSize, lineHeight: fontSize * 1.15 }} align="center">
          {details.icon}
        </Text>
      </Animated.View>

      {/* Optional stage badge pill */}
      {showBadge && (
        <View style={styles.stageBadge}>
          <Text
            variant="caption"
            weight="800"
            color={Palette.primaryText}
            style={styles.stageText}
          >
            {stageTitle}
          </Text>
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.82} onPress={onPress}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  shadowBase: {
    position: "absolute",
    bottom: 2,
    backgroundColor: "rgba(42, 42, 42, 0.12)",
  },
  petCircle: {
    backgroundColor: "#FEF9C3", // Warm golden egg background
    borderColor: "#FACC15",
    alignItems: "center",
    justifyContent: "center",
  },
  petCircleSpecial: {
    backgroundColor: "#FDF4FF",
    borderColor: "#C084FC",
    shadowColor: "#A855F7",
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  stageBadge: {
    marginTop: 4,
    backgroundColor: Palette.pureWhite,
    borderWidth: 1.5,
    borderColor: Palette.borderSubtle,
    borderRadius: Radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    ...Depth.styles.subtleCard,
  },
  stageText: {
    fontSize: 11,
    lineHeight: 14,
  },
});
