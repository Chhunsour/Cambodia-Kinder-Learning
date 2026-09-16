import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { KokiScreen } from "@/components/ui/KokiScreen";
import { Text } from "@/components/ui/Text";
import { KokiButton } from "@/components/ui/KokiButton";
import { GameIconButton } from "@/components/ui/GameIconButton";
import { useLocalization } from "@/hooks/useLocalization";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import { useKokiResponsive } from "@/hooks/useKokiResponsive";
import {
  ParentGate,
  ParentGateSession,
  ParentOverviewTab,
  ParentProfileTab,
  ParentFriendsTab,
  ParentSettingsTab,
} from "@/features/parent";
import { Palette } from "@/constants/theme";
import { Spacing, Radius } from "@/constants/spacing";

type ParentTab = "overview" | "profile" | "friends" | "settings";

/**
 * Parent Corner Screen
 *
 * Protected area for parents/guardians with a two-step Parent Gate.
 * Features:
 * - Real child learning overview (stars, streaks, hearts, progress in Khmer & English)
 * - Profile editing (nickname, age recalculating learning band, avatar)
 * - App language switcher
 * - Audio narration & SFX toggles
 * - Privacy explanations & safe child profile deletion
 */
export default function ParentScreen() {
  const router = useRouter();
  const { locale, t } = useLocalization();
  const responsive = useKokiResponsive();
  const { profile, refreshProfile } = useActiveProfile();
  const isKm = locale === "km";

  // Gate unlock state lives in-memory for the current session
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() =>
    ParentGateSession.isUnlocked()
  );
  const [activeTab, setActiveTab] = useState<ParentTab>("overview");

  // Keep session alive while parent navigates within parent area
  useEffect(() => {
    if (isUnlocked) {
      ParentGateSession.keepAlive();
    }
  }, [isUnlocked, activeTab]);

  const handleReturnToHome = () => {
    router.replace("/(main)/home");
  };

  const handleLockGate = () => {
    ParentGateSession.lock();
    setIsUnlocked(false);
  };

  // If locked, present the two-step Parent Gate
  if (!isUnlocked) {
    return (
      <KokiScreen scrollable={true} backgroundColor={Palette.warmCream}>
        <ParentGate
          onUnlock={() => setIsUnlocked(true)}
          onCancel={handleReturnToHome}
        />
      </KokiScreen>
    );
  }

  // If unlocked, render the calm Parent Dashboard
  return (
    <KokiScreen scrollable={true} backgroundColor={Palette.warmCream}>
      <View
        style={[
          styles.container,
          responsive.isTablet && styles.containerTablet,
        ]}
      >
        {/* Header with Navigation and Lock controls */}
        <View style={styles.header}>
          <GameIconButton
            type="back"
            color="cream"
            size="compact"
            onPress={handleReturnToHome}
            accessibilityLabel={t("parent.backToKoki")}
          />
          <View style={styles.headerTitleGroup}>
            <Text
              variant="title"
              weight="800"
              color="#1E293B"
              style={styles.headerTitle}
            >
              {t("parent.dashboardTitle")}
            </Text>
            <Text
              variant="caption"
              weight="600"
              color="#64748B"
              style={styles.headerSubtitle}
            >
              {profile?.nickname
                ? `${profile.nickname} (${profile.age} ${isKm ? "ឆ្នាំ" : "yrs"})`
                : isKm
                ? "តំបន់អាណាព្យាបាល"
                : "Parent Dashboard"}
            </Text>
          </View>
          <Pressable
            onPress={handleLockGate}
            style={({ pressed }) => [
              styles.lockButton,
              pressed && styles.lockButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={isKm ? "ចាក់សោឡើងវិញ" : "Lock gate"}
          >
            <Text style={styles.lockIcon}>🔒</Text>
          </Pressable>
        </View>

        {/* Tab Navigation Segmented Bar */}
        <View style={styles.tabBar}>
          <Pressable
            onPress={() => setActiveTab("overview")}
            style={[
              styles.tabButton,
              activeTab === "overview" && styles.tabButtonActive,
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === "overview" }}
            accessibilityLabel={t("parent.tabOverview")}
          >
            <Text
              variant="bodySmall"
              weight="800"
              color={activeTab === "overview" ? "#1E293B" : "#64748B"}
            >
              📊 {t("parent.tabOverview")}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab("profile")}
            style={[
              styles.tabButton,
              activeTab === "profile" && styles.tabButtonActive,
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === "profile" }}
            accessibilityLabel={t("parent.tabProfile")}
          >
            <Text
              variant="bodySmall"
              weight="800"
              color={activeTab === "profile" ? "#1E293B" : "#64748B"}
            >
              👤 {t("parent.tabProfile")}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab("friends")}
            style={[
              styles.tabButton,
              activeTab === "friends" && styles.tabButtonActive,
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === "friends" }}
            accessibilityLabel={t("parent.tabFriends")}
          >
            <Text
              variant="bodySmall"
              weight="800"
              color={activeTab === "friends" ? "#1E293B" : "#64748B"}
            >
              👫 {t("parent.tabFriends")}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab("settings")}
            style={[
              styles.tabButton,
              activeTab === "settings" && styles.tabButtonActive,
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === "settings" }}
            accessibilityLabel={t("parent.tabSettings")}
          >
            <Text
              variant="bodySmall"
              weight="800"
              color={activeTab === "settings" ? "#1E293B" : "#64748B"}
            >
              ⚙️ {t("parent.tabSettings")}
            </Text>
          </Pressable>
        </View>

        {/* Tab Content Display */}
        <View style={styles.tabContent}>
          {activeTab === "overview" && (
            <ParentOverviewTab profile={profile} />
          )}

          {activeTab === "profile" && (
            <ParentProfileTab
              profile={profile}
              onProfileUpdated={refreshProfile}
            />
          )}

          {activeTab === "friends" && (
            <ParentFriendsTab profile={profile} />
          )}

          {activeTab === "settings" && (
            <ParentSettingsTab
              profile={profile}
              onProfileDeleted={refreshProfile}
            />
          )}
        </View>

        {/* Bottom Floating Return Button */}
        <View style={styles.footer}>
          <KokiButton
            variant="secondary"
            fullWidth={true}
            title={`➔ ${t("parent.backToKoki")}`}
            onPress={handleReturnToHome}
          />
        </View>
      </View>
    </KokiScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl,
  },
  containerTablet: {
    maxWidth: 600,
    alignSelf: "center",
    width: "100%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  headerTitleGroup: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: Spacing.xs,
  },
  headerTitle: {
    fontSize: 20,
    textAlign: "center",
  },
  headerSubtitle: {
    marginTop: 2,
    textAlign: "center",
  },
  lockButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.circle,
    backgroundColor: "#F1F5F9",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  lockButtonPressed: {
    backgroundColor: "#E2E8F0",
    transform: [{ scale: 0.95 }],
  },
  lockIcon: {
    fontSize: 18,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#E2E8F0",
    borderRadius: Radius.lg,
    padding: 4,
    marginBottom: Spacing.lg,
  },
  tabButton: {
    flex: 1,
    paddingVertical: Spacing.xs + 2,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.md,
  },
  tabButtonActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  tabContent: {
    width: "100%",
  },
  footer: {
    marginTop: Spacing.xl,
    paddingTop: Spacing.sm,
  },
});
