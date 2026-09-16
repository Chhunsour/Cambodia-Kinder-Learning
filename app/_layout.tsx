import React from "react";
import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import {
  KantumruyPro_400Regular,
  KantumruyPro_500Medium,
  KantumruyPro_600SemiBold,
  KantumruyPro_700Bold,
} from "@expo-google-fonts/kantumruy-pro";
import { AppShell } from "@/components/shell/AppShell";
import { Palette } from "@/constants/theme";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import { reminderService } from "@/features/notifications";

function NotificationNavigationHandler() {
  const router = useRouter();
  const { profile, isLoading } = useActiveProfile();

  React.useEffect(() => {
    // 1. Listen for notification tap responses while app is active or in background
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response?.notification?.request?.content?.data;
      if (data?.type === "learning_reminder") {
        router.replace("/(main)/home" as any);
      }
    });

    // 2. Check if app was cold-started from notification tap
    if (!isLoading) {
      Notifications.getLastNotificationResponseAsync().then((response) => {
        if (!response) return;
        const data = response?.notification?.request?.content?.data;
        if (data?.type === "learning_reminder") {
          router.replace("/(main)/home" as any);
        }
      }).catch(() => {});
    }

    return () => {
      subscription.remove();
    };
  }, [router, isLoading]);

  // 3. Verify & repair reminder schedule for active child profile on startup
  React.useEffect(() => {
    if (!isLoading && profile?.id) {
      reminderService.verifyAndRepairSchedule(
        profile.id,
        profile.nickname,
        profile.uiLanguage as any
      );
    }
  }, [isLoading, profile?.id, profile?.nickname, profile?.uiLanguage]);

  return null;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    KantumruyPro_400Regular,
    KantumruyPro_500Medium,
    KantumruyPro_600SemiBold,
    KantumruyPro_700Bold,
  });

  return (
    <AppShell>
      <NotificationNavigationHandler />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Palette.warmCream },
          animation: "fade",
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(onboarding)" options={{ animation: "fade" }} />
        <Stack.Screen name="(main)" options={{ animation: "fade" }} />
        <Stack.Screen
          name="lesson/[lessonId]"
          options={{
            animation: "slide_from_right",
            gestureEnabled: false, // Prevent accidental swipe-back during lesson games
          }}
        />
        <Stack.Screen
          name="result/[lessonId]"
          options={{
            animation: "fade",
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="reward/index"
          options={{
            presentation: "modal",
            animation: "fade_from_bottom",
          }}
        />
        <Stack.Screen
          name="side-quest/english"
          options={{
            animation: "slide_from_right",
          }}
        />
        <Stack.Screen
          name="parent"
          options={{
            animation: "slide_from_bottom",
          }}
        />
        <Stack.Screen
          name="modal"
          options={{
            presentation: "modal",
          }}
        />
        <Stack.Screen
          name="design-system"
          options={{
            animation: "slide_from_right",
          }}
        />
        <Stack.Screen name="+not-found" options={{ title: "404" }} />
      </Stack>
    </AppShell>
  );
}
