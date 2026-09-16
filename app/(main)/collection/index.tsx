import React, { useState } from "react";
import { View, StyleSheet, Pressable, Modal } from "react-native";
import { useRouter } from "expo-router";
import { KokiScreen } from "@/components/ui/KokiScreen";
import { Text } from "@/components/ui/Text";
import { KokiCard } from "@/components/ui/KokiCard";
import { KokiButton } from "@/components/ui/KokiButton";
import { StarBadge } from "@/components/ui/StarBadge";
import { CoinBadge } from "@/components/ui/CoinBadge";
import { useLocalization } from "@/hooks/useLocalization";
import { useWallet } from "@/features/wallet";
import { useWorldProgression } from "@/features/progression";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import { useKokiResponsive } from "@/hooks/useKokiResponsive";
import { FriendsLeaderboardView } from "@/features/leaderboard";
import { ParentGate } from "@/features/parent";
import { Palette } from "@/constants/theme";
import { Spacing, Radius } from "@/constants/spacing";

type CollectionSubTab = "stickers" | "friends";

export default function CollectionScreen() {
  const router = useRouter();
  const { locale, t } = useLocalization();
  const { coinBalance } = useWallet();
  const { totalStars } = useWorldProgression("world-1");
  const { profile } = useActiveProfile();
  const responsive = useKokiResponsive();
  const isKm = locale === "km";

  const [activeTab, setActiveTab] = useState<CollectionSubTab>("stickers");
  const [isParentGateOpen, setIsParentGateOpen] = useState(false);

  const handleUnlockParentGate = () => {
    setIsParentGateOpen(false);
    router.push("/parent");
  };

  return (
    <KokiScreen scrollable={true} contentContainerStyle={{ paddingBottom: 110 }}>
      <View
        style={[
          styles.container,
          responsive.isTablet && styles.containerTablet,
        ]}
      >
        {/* Screen Title */}
        <Text variant="heading1" align="center" color={Palette.goldDark}>
          {isKm ? "ការប្រមូលរង្វាន់" : "My Collection"}
        </Text>
        <Text
          variant="body"
          align="center"
          color={Palette.secondaryText}
          style={styles.subtitle}
        >
          {isKm
            ? "មេដាយ ស្ទីកឃ័រ និងមិត្តភក្តិ"
            : "Badges, Stickers & Learning Friends"}
        </Text>

        {/* Global Wallet & Star Balance */}
        <View style={styles.badgeRow}>
          <CoinBadge amount={coinBalance} />
          <StarBadge count={totalStars} />
        </View>

        {/* Segmented Sub-Tab Bar: Stickers vs Friends */}
        <View style={styles.tabBar}>
          <Pressable
            onPress={() => setActiveTab("stickers")}
            style={[
              styles.tabButton,
              activeTab === "stickers" && styles.tabButtonActive,
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === "stickers" }}
            accessibilityLabel={t("leaderboard.tabStickers")}
          >
            <Text
              variant="bodySmall"
              weight="800"
              color={activeTab === "stickers" ? "#1E293B" : "#64748B"}
            >
              🌟 {t("leaderboard.tabStickers")}
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
            accessibilityLabel={t("leaderboard.tabFriendsLeaderboard")}
          >
            <Text
              variant="bodySmall"
              weight="800"
              color={activeTab === "friends" ? "#1E293B" : "#64748B"}
            >
              👫 {t("leaderboard.tabFriendsLeaderboard")}
            </Text>
          </Pressable>
        </View>

        {/* Sub-Tab 1: Sticker Album */}
        {activeTab === "stickers" && (
          <KokiCard variant="normal" padding="lg" style={styles.card}>
            <Text variant="titleSmall" weight="700">
              {isKm ? "អាល់ប៊ុមស្ទីកឃ័រ" : "Sticker Album"}
            </Text>
            <Text
              variant="bodySmall"
              color={Palette.secondaryText}
              style={{ marginTop: Spacing.xs }}
            >
              {isKm
                ? "រង្វាន់ដែលរកបានពីការរៀនមេរៀននីមួយៗនឹងបង្ហាញនៅទីនេះ។"
                : "Collectible stickers and achievements earned from completed lessons."}
            </Text>
            <KokiButton
              variant="primary"
              compact={true}
              title={isKm ? "មើលផ្ទាំងរង្វាន់គំរូ" : "Preview Reward Celebration"}
              onPress={() => router.push("/reward")}
              style={{ marginTop: Spacing.md }}
            />
          </KokiCard>
        )}

        {/* Sub-Tab 2: Friends-Only Weekly Learning Leaderboard */}
        {activeTab === "friends" && (
          <FriendsLeaderboardView
            profile={profile}
            onOpenParentGate={() => setIsParentGateOpen(true)}
          />
        )}
      </View>

      {/* Parent Gate Modal: Protects Add Friend / Account setup actions */}
      <Modal
        visible={isParentGateOpen}
        animationType="slide"
        onRequestClose={() => setIsParentGateOpen(false)}
      >
        <KokiScreen scrollable={true} backgroundColor={Palette.warmCream}>
          <ParentGate
            onUnlock={handleUnlockParentGate}
            onCancel={() => setIsParentGateOpen(false)}
          />
        </KokiScreen>
      </Modal>
    </KokiScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.sm,
    alignItems: "center",
  },
  containerTablet: {
    maxWidth: 600,
    alignSelf: "center",
    width: "100%",
  },
  subtitle: {
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },
  badgeRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#E2E8F0",
    borderRadius: Radius.lg,
    padding: 4,
    marginBottom: Spacing.lg,
    width: "100%",
  },
  tabButton: {
    flex: 1,
    paddingVertical: Spacing.xs + 3,
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
  card: {
    width: "100%",
  },
});
