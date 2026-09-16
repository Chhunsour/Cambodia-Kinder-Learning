import React, { useState } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { KokiScreen } from "@/components/ui/KokiScreen";
import { Text } from "@/components/ui/Text";
import { KokiButton } from "@/components/ui/KokiButton";
import { CoinBadge } from "@/components/ui/CoinBadge";
import { KokiAvatar } from "@/components/koki/KokiAvatar";
import { Palette } from "@/constants/theme";
import { Spacing, Radius } from "@/constants/spacing";
import { Depth } from "@/constants/depth";
import { useLocalization } from "@/hooks/useLocalization";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import { useKokiResponsive } from "@/hooks/useKokiResponsive";
import {
  useWardrobe,
  CategoryTabBar,
  CosmeticItemCard,
  PurchaseConfirmModal,
  CosmeticItem,
} from "@/features/wardrobe";

export default function KokiWardrobeScreen() {
  const { locale, t } = useLocalization();
  const { profile } = useActiveProfile();
  const responsive = useKokiResponsive();
  const isKm = locale === "km";

  const {
    coinBalance,
    ownedItemIds,
    equippedAppearance,
    previewAppearance,
    selectedCategory,
    selectedItem,
    filteredItems,
    isPurchasing,
    setSelectedCategory,
    selectItem,
    equipItem,
    unequipSlot,
    purchaseItem,
    resetPreview,
    getItemCardState,
  } = useWardrobe();

  // Modal state
  const [modalItem, setModalItem] = useState<CosmeticItem | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Check if preview currently differs from persisted equipment
  const hasUnsavedPreview =
    previewAppearance.head !== equippedAppearance.head ||
    previewAppearance.face !== equippedAppearance.face ||
    previewAppearance.neck !== equippedAppearance.neck ||
    previewAppearance.body !== equippedAppearance.body ||
    previewAppearance.back !== equippedAppearance.back ||
    previewAppearance.special !== equippedAppearance.special;

  const handleOpenPurchase = (item: CosmeticItem) => {
    setModalItem(item);
  };

  const handleConfirmPurchase = async () => {
    if (!modalItem) return;
    const result = await purchaseItem(modalItem.id, true);
    setModalItem(null);

    if (result.success) {
      setSuccessMessage(t("wardrobe.purchaseSuccess"));
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  const selectedItemState = selectedItem ? getItemCardState(selectedItem) : null;
  const coinsNeeded = selectedItem ? Math.max(0, selectedItem.priceCoins - coinBalance) : 0;

  return (
    <KokiScreen scrollable={false} backgroundColor={Palette.warmCream}>
      <View style={styles.container}>
        {/* ============================================================ */}
        {/* 1. TOP HEADER: Title & Coin Balance                          */}
        {/* ============================================================ */}
        <View style={styles.headerRow}>
          <View style={styles.headerTitles}>
            <Text
              variant="heading1"
              weight="900"
              color={Palette.primaryText}
              style={styles.headerTitle}
            >
              {t("wardrobe.title")}
            </Text>
            <Text
              variant="bodySmall"
              color={Palette.secondaryText}
              style={styles.headerSubtitle}
            >
              {t("wardrobe.subtitle")}
            </Text>
          </View>

          {/* Live Coin Balance */}
          <CoinBadge amount={coinBalance} />
        </View>

        {/* ============================================================ */}
        {/* 2. PROMINENT KOKI PREVIEW AREA                               */}
        {/* ============================================================ */}
        <View style={[styles.previewContainer, responsive.isTablet && styles.previewContainerTablet]}>
          <KokiAvatar
            appearance={previewAppearance}
            size={responsive.isTablet ? 140 : 115}
            mood="happy"
            showEquippedBadges={true}
          />

          {/* Reset Preview Button (if child is trying on unequipped items) */}
          {hasUnsavedPreview && (
            <View style={styles.resetPreviewWrapper}>
              <KokiButton
                variant="secondary"
                compact={true}
                title={isKm ? "ត្រឡប់ដើម" : "Reset Look"}
                onPress={resetPreview}
                style={styles.resetButton}
              />
            </View>
          )}

          {/* Temporary Success Toast Banner */}
          {successMessage && (
            <View style={[styles.successBanner, Depth.styles.floatingCard]}>
              <Text style={styles.successEmoji}>🎉</Text>
              <Text
                variant="bodySmall"
                weight="900"
                color="#065F46"
                style={styles.successText}
              >
                {successMessage}
              </Text>
            </View>
          )}
        </View>

        {/* ============================================================ */}
        {/* 3. HORIZONTAL CATEGORY NAVIGATION                            */}
        {/* ============================================================ */}
        <CategoryTabBar
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          ownedCount={ownedItemIds.length}
        />

        {/* ============================================================ */}
        {/* 4. SCROLLABLE ITEM GRID                                      */}
        {/* ============================================================ */}
        <ScrollView
          style={styles.gridScrollView}
          contentContainerStyle={styles.gridContent}
          showsVerticalScrollIndicator={false}
        >
          {filteredItems.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📦</Text>
              <Text
                variant="body"
                color={Palette.secondaryText}
                align="center"
              >
                {t("wardrobe.emptyCategory")}
              </Text>
            </View>
          ) : (
            <View style={styles.gridRow}>
              {filteredItems.map((item) => {
                const state = getItemCardState(item);
                const isSelected = selectedItem?.id === item.id;

                return (
                  <View key={item.id} style={styles.gridCol}>
                    <CosmeticItemCard
                      item={item}
                      state={state}
                      isSelected={isSelected}
                      onPress={() => selectItem(item)}
                    />
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>

        {/* ============================================================ */}
        {/* 5. BOTTOM ACTION BAR: Selected Item Controls                 */}
        {/* ============================================================ */}
        {selectedItem && (
          <View style={[styles.bottomActionBar, Depth.styles.floatingCard]}>
            <View style={styles.selectedItemSummary}>
              <Text style={styles.selectedItemIcon}>{selectedItem.icon}</Text>
              <View style={styles.selectedItemText}>
                <Text
                  variant="heading2"
                  weight="900"
                  color={Palette.primaryText}
                  numberOfLines={1}
                >
                  {isKm ? selectedItem.nameKm : selectedItem.nameEn}
                </Text>
                <Text
                  variant="caption"
                  color={Palette.secondaryText}
                >
                  {isKm
                    ? `ប្រភេទ: ${selectedItem.slot}`
                    : `Slot: ${selectedItem.slot}`}
                </Text>
              </View>
            </View>

            {/* Action Buttons depending on state */}
            <View style={styles.actionButtonsContainer}>
              {selectedItemState === "equipped" ? (
                <View style={styles.dualActionRow}>
                  <View style={styles.actionCol}>
                    <KokiButton
                      variant="secondary"
                      compact={true}
                      title={t("wardrobe.actionRemove")}
                      onPress={() => unequipSlot(selectedItem.slot)}
                      accessibilityLabel={t("wardrobe.actionRemove")}
                    />
                  </View>
                  <View style={styles.actionCol}>
                    <KokiButton
                      variant="green"
                      compact={true}
                      disabled={true}
                      title={`✓ ${t("wardrobe.actionWearing")}`}
                      onPress={() => {}}
                      accessibilityLabel={t("wardrobe.actionWearing")}
                    />
                  </View>
                </View>
              ) : selectedItemState === "owned" ? (
                <KokiButton
                  variant="primary"
                  fullWidth={true}
                  title={t("wardrobe.actionWear")}
                  onPress={() => equipItem(selectedItem.id)}
                  accessibilityLabel={t("wardrobe.actionWear")}
                />
              ) : selectedItemState === "affordable" ? (
                <KokiButton
                  variant="green"
                  fullWidth={true}
                  title={`🪙 ${t("wardrobe.actionGetFor", { price: selectedItem.priceCoins })}`}
                  onPress={() => handleOpenPurchase(selectedItem)}
                  accessibilityLabel={`Buy for ${selectedItem.priceCoins} coins`}
                />
              ) : (
                <View style={styles.unaffordableStack}>
                  <Text
                    variant="caption"
                    weight="800"
                    color="#DC2626"
                    align="center"
                  >
                    {t("wardrobe.needMoreCoins", { count: coinsNeeded })}
                  </Text>
                  <Text
                    variant="caption"
                    color={Palette.secondaryText}
                    align="center"
                    style={{ marginTop: 2 }}
                  >
                    {t("wardrobe.earnCoinsHint")}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
      </View>

      {/* Confirmation Modal */}
      <PurchaseConfirmModal
        item={modalItem}
        visible={Boolean(modalItem)}
        isPurchasing={isPurchasing}
        onConfirm={handleConfirmPurchase}
        onCancel={() => setModalItem(null)}
      />
    </KokiScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Spacing.xs,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  headerTitles: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    lineHeight: 26,
  },
  headerSubtitle: {
    fontSize: 12,
  },
  previewContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xs,
    position: "relative",
    minHeight: 155,
  },
  previewContainerTablet: {
    minHeight: 180,
  },
  resetPreviewWrapper: {
    position: "absolute",
    right: Spacing.md,
    top: Spacing.sm,
  },
  resetButton: {
    minHeight: 32,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  successBanner: {
    position: "absolute",
    bottom: 4,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D1FAE5",
    borderWidth: 1.5,
    borderColor: "#10B981",
    borderRadius: Radius.pill,
    paddingVertical: 4,
    paddingHorizontal: Spacing.md,
    gap: 6,
  },
  successEmoji: {
    fontSize: 16,
  },
  successText: {
    fontSize: 13,
  },
  gridScrollView: {
    flex: 1,
  },
  gridContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
    paddingBottom: 110, // Avoid bottom bar overlap
  },
  gridRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
    justifyContent: "flex-start",
  },
  gridCol: {
    width: "31.5%", // 3 columns for young children
    minWidth: 100,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xxl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: Spacing.sm,
  },
  bottomActionBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Palette.pureWhite,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    borderWidth: 1.5,
    borderColor: Palette.borderSubtle,
  },
  selectedItemSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  selectedItemIcon: {
    fontSize: 26,
  },
  selectedItemText: {
    flex: 1,
  },
  actionButtonsContainer: {
    width: "100%",
  },
  dualActionRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    width: "100%",
  },
  actionCol: {
    flex: 1,
  },
  unaffordableStack: {
    backgroundColor: "#FEF2F2",
    borderRadius: Radius.md,
    paddingVertical: 6,
    paddingHorizontal: Spacing.sm,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
});
