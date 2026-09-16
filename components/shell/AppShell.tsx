import React, { ReactNode } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LocalizationProvider } from "@/hooks/useLocalization";
import { ProfileProvider } from "@/hooks/useActiveProfile";
import { ParentAccountProvider } from "@/hooks/useParentAccount";
import { Palette } from "@/constants/theme";

/**
 * Reusable App Shell for Koki
 * Coordinates top-level infrastructure:
 * - Safe area handling
 * - Status bar configuration
 * - Global theme access
 * - Localization provider
 * - Local SQLite Profile provider
 * - Optional Parent Account & Cloud Sync provider
 */
interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <SafeAreaProvider>
      <LocalizationProvider initialLocale="km">
        <ProfileProvider>
          <ParentAccountProvider>
            <StatusBar style="dark" />
            {children}
          </ParentAccountProvider>
        </ProfileProvider>
      </LocalizationProvider>
    </SafeAreaProvider>
  );
}
