import React from "react";
import { View, Pressable, StyleSheet, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated from "react-native-reanimated";
import { Palette } from "@/constants/theme";
import { Radius, Spacing, TouchTarget } from "@/constants/spacing";
import { Depth } from "@/constants/depth";
import { Text } from "@/components/ui/Text";
import { useLocalization } from "@/hooks/useLocalization";
import { useKokiResponsive } from "@/hooks/useKokiResponsive";
import { useKokiButtonPress } from "@/hooks/useKokiAnimations";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface TabBarProps {
  state: {
    index: number;
    routes: Array<{ key: string; name: string }>;
  };
  descriptors: Record<string, any>;
  navigation: {
    navigate: (route: string) => void;
  };
}

interface TabItemProps {
  routeName: string;
  isFocused: boolean;
  onPress: () => void;
  isKm: boolean;
}

function TabItem({ routeName, isFocused, onPress, isKm }: TabItemProps) {
  const { onPressIn, onPressOut, faceAnimatedStyle } = useKokiButtonPress(3);

  const getTabConfig = () => {
    switch (routeName) {
      case "home/index":
      case "home":
        return {
          icon: "🏠",
          label: isKm ? "ទំព័រដើម" : "Home",
          a11yLabel: isKm ? "ទំព័រដើម" : "Home Tab",
        };
      case "adventure/index":
      case "adventure":
        return {
          icon: "🗺️",
          label: isKm ? "ផ្សងព្រេង" : "Adventure",
          a11yLabel: isKm ? "ដំណើរផ្សងព្រេង" : "Adventure Tab",
        };
      case "koki/index":
      case "koki":
        return {
          icon: "🐵",
          label: isKm ? "កូគី" : "Koki",
          a11yLabel: isKm ? "មិត្តកូគី" : "Koki Companion Tab",
        };
      case "collection/index":
      case "collection":
        return {
          icon: "🏆",
          label: isKm ? "រង្វាន់" : "Collection",
          a11yLabel: isKm ? "ការប្រមូលរង្វាន់" : "Collection Tab",
        };
      default:
        return {
          icon: "⭐",
          label: routeName,
          a11yLabel: routeName,
        };
    }
  };

  const config = getTabConfig();

  return (
    <AnimatedPressable
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={config.a11yLabel}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={[
        styles.tabButton,
        isFocused && styles.tabButtonActive,
        faceAnimatedStyle,
      ]}
    >
      {/* 3D Active Extrusion Layer */}
      {isFocused && (
        <View style={styles.activeExtrusion} />
      )}

      {/* Tab Face Surface */}
      <View style={[
        styles.tabFace,
        isFocused && styles.tabFaceActive,
      ]}>
        <Text style={[styles.tabIcon, isFocused && styles.tabIconActive]}>
          {config.icon}
        </Text>
        <Text
          variant="caption"
          weight={isFocused ? "800" : "600"}
          color={isFocused ? Palette.primaryOrange : Palette.secondaryText}
          style={styles.tabLabel}
        >
          {config.label}
        </Text>
      </View>
    </AnimatedPressable>
  );
}

export function KokiTabBar({ state, descriptors, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const { locale } = useLocalization();
  const responsive = useKokiResponsive();
  const isKm = locale === "km";

  // Filter out any auxiliary routes if they appear in the tab descriptor
  const mainTabRoutes = state.routes.filter(
    (route) => !route.name.startsWith("_") && !route.name.includes("+")
  );

  return (
    <View style={[
      styles.outerWrapper, 
      { paddingBottom: Math.max(insets.bottom, Spacing.xs) }
    ]}>
      <View style={[
        styles.dockContainer,
        responsive.isTablet && styles.tabletDock,
      ]}>
        {mainTabRoutes.map((route, index) => {
          const isFocused = state.index === index;

          const handlePress = () => {
            if (!isFocused) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TabItem
              key={route.key}
              routeName={route.name}
              isFocused={isFocused}
              onPress={handlePress}
              isKm={isKm}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    backgroundColor: "transparent",
    pointerEvents: "box-none",
  },
  dockContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    width: "94%",
    maxWidth: 540,
    backgroundColor: Palette.pureWhite,
    borderRadius: Radius.xl,
    paddingVertical: Spacing.xxs,
    paddingHorizontal: Spacing.xs,
    borderWidth: 1.5,
    borderColor: Palette.cardOutline,
    ...Depth.styles.floatingCard,
  },
  tabletDock: {
    maxWidth: 480,
    paddingVertical: Spacing.xs,
  },
  tabButton: {
    flex: 1,
    minHeight: TouchTarget.kid,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    paddingVertical: Spacing.xxs,
  },
  tabButtonActive: {
    transform: [{ scale: 1.02 }],
  },
  activeExtrusion: {
    position: "absolute",
    left: 4,
    right: 4,
    bottom: 2,
    top: 5,
    backgroundColor: Palette.borderStrong,
    borderRadius: Radius.large,
  },
  tabFace: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: Radius.large,
  },
  tabFaceActive: {
    backgroundColor: Palette.orangeLight,
    borderWidth: 1,
    borderColor: "#FFD2B2",
  },
  tabIcon: {
    fontSize: 22,
    marginBottom: 2,
  },
  tabIconActive: {
    fontSize: 24,
    transform: [{ translateY: -1 }],
  },
  tabLabel: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.2,
  },
});
