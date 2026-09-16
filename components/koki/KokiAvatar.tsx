import React, { useEffect } from "react";
import { View, StyleSheet, ViewStyle, TouchableOpacity } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  Easing,
} from "react-native-reanimated";
import { Palette } from "@/constants/theme";
import { Depth } from "@/constants/depth";
import { Text } from "@/components/ui/Text";
import { KokiAppearance, DEFAULT_APPEARANCE } from "@/features/wardrobe/types";
import { COSMETIC_CATALOG_MAP } from "@/features/wardrobe/data/catalog";
import { MascotMood } from "./KokiMascot";

export type { MascotMood };

export interface KokiAvatarProps {
  appearance?: KokiAppearance | null;
  size?: number;
  mood?: MascotMood;
  emoji?: string;
  style?: ViewStyle;
  showEquippedBadges?: boolean;
  onPress?: () => void;
}

/**
 * Reusable Koki Avatar component supporting layered cosmetic customization.
 *
 * Strict layer ordering:
 * 1. Base Koki (tiger base)
 * 2. Back accessories (backpack, wings)
 * 3. Body accessories (vest, shirt)
 * 4. Neck accessories (krama, scarf, bell)
 * 5. Face accessories (sunglasses, star glasses)
 * 6. Head accessories (straw hat, crown, garland)
 * 7. Special effects (sparkles, floating lantern)
 *
 * Designed to gracefully fall back to child-friendly accessory icons/emojis
 * until full transparent PNG sprite sheets are integrated by the art team.
 */
export const KokiAvatar: React.FC<KokiAvatarProps> = ({
  appearance = DEFAULT_APPEARANCE,
  size = 120,
  mood = "idle",
  emoji = "🐯",
  style,
  showEquippedBadges = false,
  onPress,
}) => {
  const currentAppearance = appearance || DEFAULT_APPEARANCE;

  // Animation shared values
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const accessoryBounce = useSharedValue(1);

  // Trigger bounce whenever appearance changes
  useEffect(() => {
    accessoryBounce.value = withSequence(
      withSpring(1.15, { damping: 8, stiffness: 150 }),
      withSpring(1.0, { damping: 10, stiffness: 120 })
    );
  }, [
    currentAppearance.head,
    currentAppearance.face,
    currentAppearance.neck,
    currentAppearance.body,
    currentAppearance.back,
    currentAppearance.special,
    accessoryBounce,
  ]);

  useEffect(() => {
    if (mood === "idle") {
      translateY.value = withRepeat(
        withSequence(
          withTiming(-8, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else if (mood === "happy" || mood === "cheering") {
      translateY.value = withRepeat(
        withSequence(
          withTiming(-16, { duration: 380, easing: Easing.out(Easing.back(1.5)) }),
          withTiming(0, { duration: 380, easing: Easing.in(Easing.ease) })
        ),
        -1,
        true
      );
      scale.value = withRepeat(
        withSequence(
          withTiming(1.06, { duration: 380 }),
          withTiming(0.96, { duration: 380 })
        ),
        -1,
        true
      );
    }
  }, [mood, translateY, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value * accessoryBounce.value },
    ],
  }));

  const fontSize = Math.round(size * 0.52);

  // Resolved items from catalog
  const headItem = currentAppearance.head ? COSMETIC_CATALOG_MAP[currentAppearance.head] : null;
  const faceItem = currentAppearance.face ? COSMETIC_CATALOG_MAP[currentAppearance.face] : null;
  const neckItem = currentAppearance.neck ? COSMETIC_CATALOG_MAP[currentAppearance.neck] : null;
  const bodyItem = currentAppearance.body ? COSMETIC_CATALOG_MAP[currentAppearance.body] : null;
  const backItem = currentAppearance.back ? COSMETIC_CATALOG_MAP[currentAppearance.back] : null;
  const specialItem = currentAppearance.special ? COSMETIC_CATALOG_MAP[currentAppearance.special] : null;

  const equippedList = [headItem, faceItem, neckItem, bodyItem, backItem, specialItem].filter(
    (item): item is NonNullable<typeof item> => item !== null && item !== undefined
  );

  const content = (
    <View style={[styles.container, { width: size * 1.3, height: size * 1.3 }, style]}>
      {/* 3D Bottom Base Drop Shadow */}
      <View
        style={[
          styles.shadowBase,
          { width: size * 0.7, height: size * 0.18, borderRadius: size * 0.09 },
        ]}
      />

      <Animated.View
        style={[
          styles.mascotWrapper,
          { width: size, height: size },
          animatedStyle,
        ]}
      >
        {/* ============================================================ */}
        {/* LAYER 1: BACK ACCESSORY (behind base)                        */}
        {/* ============================================================ */}
        {backItem && (
          <View
            style={[
              styles.layerBack,
              {
                left: -size * 0.12,
                top: size * 0.18,
                width: size * 0.44,
                height: size * 0.44,
              },
            ]}
          >
            <Text style={{ fontSize: size * 0.32 }}>{backItem.icon}</Text>
          </View>
        )}

        {/* ============================================================ */}
        {/* LAYER 0: BASE KOKI (Mascot Circle)                           */}
        {/* ============================================================ */}
        <View
          style={[
            styles.mascotCircle,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: Math.max(3, Math.round(size * 0.04)),
            },
            Depth.styles.subtleCard,
          ]}
        >
          <Text style={{ fontSize, lineHeight: fontSize * 1.15 }} align="center">
            {emoji}
          </Text>
        </View>

        {/* ============================================================ */}
        {/* LAYER 2: BODY ACCESSORY                                      */}
        {/* ============================================================ */}
        {bodyItem && (
          <View
            style={[
              styles.layerBody,
              {
                bottom: -size * 0.04,
                width: size * 0.48,
                height: size * 0.38,
              },
            ]}
          >
            <View style={[styles.accessoryChip, { backgroundColor: "#FEF3C7" }]}>
              <Text style={{ fontSize: size * 0.28 }}>{bodyItem.icon}</Text>
            </View>
          </View>
        )}

        {/* ============================================================ */}
        {/* LAYER 3: NECK ACCESSORY                                      */}
        {/* ============================================================ */}
        {neckItem && (
          <View
            style={[
              styles.layerNeck,
              {
                bottom: size * 0.08,
                width: size * 0.46,
                height: size * 0.32,
              },
            ]}
          >
            <View style={[styles.accessoryChip, { backgroundColor: "#FEE2E2" }]}>
              <Text style={{ fontSize: size * 0.26 }}>{neckItem.icon}</Text>
            </View>
          </View>
        )}

        {/* ============================================================ */}
        {/* LAYER 4: FACE ACCESSORY                                      */}
        {/* ============================================================ */}
        {faceItem && (
          <View
            style={[
              styles.layerFace,
              {
                top: size * 0.22,
                width: size * 0.52,
                height: size * 0.32,
              },
            ]}
          >
            <View style={[styles.accessoryChip, { backgroundColor: "#E0F2FE" }]}>
              <Text style={{ fontSize: size * 0.28 }}>{faceItem.icon}</Text>
            </View>
          </View>
        )}

        {/* ============================================================ */}
        {/* LAYER 5: HEAD ACCESSORY (topmost on head)                    */}
        {/* ============================================================ */}
        {headItem && (
          <View
            style={[
              styles.layerHead,
              {
                top: -size * 0.2,
                width: size * 0.58,
                height: size * 0.42,
              },
            ]}
          >
            <View style={[styles.headAccessoryWrapper]}>
              <Text style={{ fontSize: size * 0.42 }}>{headItem.icon}</Text>
            </View>
          </View>
        )}

        {/* ============================================================ */}
        {/* LAYER 6: SPECIAL EFFECT                                      */}
        {/* ============================================================ */}
        {specialItem && (
          <View
            style={[
              styles.layerSpecial,
              {
                right: -size * 0.12,
                top: -size * 0.08,
                width: size * 0.38,
                height: size * 0.38,
              },
            ]}
          >
            <Text style={{ fontSize: size * 0.32 }}>{specialItem.icon}</Text>
          </View>
        )}
      </Animated.View>

      {/* Optional mini pill badge list below Koki */}
      {showEquippedBadges && equippedList.length > 0 && (
        <View style={styles.badgeRow}>
          {equippedList.map((item) => (
            <View key={item.id} style={styles.miniBadge}>
              <Text style={styles.miniBadgeIcon}>{item.icon}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
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
  mascotWrapper: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  mascotCircle: {
    backgroundColor: "#FFE8D6",
    borderColor: Palette.primaryOrange,
    alignItems: "center",
    justifyContent: "center",
  },

  // Layers
  layerBack: {
    position: "absolute",
    zIndex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  layerBody: {
    position: "absolute",
    zIndex: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  layerNeck: {
    position: "absolute",
    zIndex: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  layerFace: {
    position: "absolute",
    zIndex: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  layerHead: {
    position: "absolute",
    zIndex: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  layerSpecial: {
    position: "absolute",
    zIndex: 7,
    alignItems: "center",
    justifyContent: "center",
  },

  accessoryChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(42, 42, 42, 0.15)",
    ...Depth.styles.subtleCard,
  },
  headAccessoryWrapper: {
    alignItems: "center",
    justifyContent: "center",
    transform: [{ translateY: 2 }],
  },

  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 4,
    marginTop: 6,
  },
  miniBadge: {
    backgroundColor: Palette.pureWhite,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Palette.borderSubtle,
    ...Depth.styles.subtleCard,
  },
  miniBadgeIcon: {
    fontSize: 14,
  },
});
