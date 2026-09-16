import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { Redirect } from "expo-router";
import { ProfileService } from "@/storage/services/profileService";
import { Palette } from "@/constants/theme";
import { KokiMascot } from "@/components/koki/KokiMascot";
import { Spacing } from "@/constants/spacing";

/**
 * Root Index Dispatcher
 * Checks local SQLite database for existing child profile and completed onboarding.
 * Completely offline and local-first.
 * Renders a clean branded splash until destination route is resolved.
 */
export default function RootIndex() {
  const [targetRoute, setTargetRoute] = useState<
    "/(main)/home" | "/(onboarding)" | null
  >(null);

  useEffect(() => {
    let isMounted = true;

    async function resolveRoute() {
      try {
        const route = await ProfileService.resolveInitialRoute();
        if (isMounted) {
          setTargetRoute(route);
        }
      } catch (e) {
        if (isMounted) {
          setTargetRoute("/(onboarding)");
        }
      }
    }

    resolveRoute();

    return () => {
      isMounted = false;
    };
  }, []);

  if (!targetRoute) {
    return (
      <View style={styles.splash}>
        <KokiMascot size={100} mood="idle" />
        <View style={styles.spinnerContainer}>
          <ActivityIndicator size="small" color={Palette.primaryOrange} />
        </View>
      </View>
    );
  }

  return <Redirect href={targetRoute} />;
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: Palette.warmCream,
    alignItems: "center",
    justifyContent: "center",
  },
  spinnerContainer: {
    marginTop: Spacing.lg,
  },
});
