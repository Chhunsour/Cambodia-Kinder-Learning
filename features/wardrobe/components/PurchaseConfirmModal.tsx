import React from "react";
import { Modal, View, StyleSheet, TouchableWithoutFeedback } from "react-native";
import { Text } from "@/components/ui/Text";
import { KokiButton } from "@/components/ui/KokiButton";
import { Palette } from "@/constants/theme";
import { Radius, Spacing } from "@/constants/spacing";
import { Depth } from "@/constants/depth";
import { CosmeticItem } from "../types";
import { useLocalization } from "@/hooks/useLocalization";

export interface PurchaseConfirmModalProps {
  item: CosmeticItem | null;
  visible: boolean;
  isPurchasing: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const PurchaseConfirmModal: React.FC<PurchaseConfirmModalProps> = ({
  item,
  visible,
  isPurchasing,
  onConfirm,
  onCancel,
}) => {
  const { locale } = useLocalization();
  const isKm = locale === "km";

  if (!item || !visible) return null;

  const itemName = isKm ? item.nameKm : item.nameEn;
  const title = isKm ? `ចង់បាន ${itemName}?` : `Get ${itemName}?`;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={[styles.dialogCard, Depth.styles.floatingCard]}>
              {/* Item Graphic */}
              <View style={styles.iconCircle}>
                <Text style={styles.itemIcon}>{item.icon}</Text>
              </View>

              {/* Friendly Title */}
              <Text
                variant="heading2"
                weight="900"
                align="center"
                color={Palette.primaryText}
                style={styles.titleText}
              >
                {title}
              </Text>

              {/* Price Pill */}
              <View style={styles.pricePill}>
                <Text style={styles.coinEmoji}>🪙</Text>
                <Text
                  variant="heading2"
                  weight="900"
                  color="#B45309"
                  style={styles.priceNumber}
                >
                  {item.priceCoins}
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.buttonRow}>
                <View style={styles.buttonWrapper}>
                  <KokiButton
                    variant="secondary"
                    compact={true}
                    title={isKm ? "ពេលក្រោយ" : "Not now"}
                    onPress={onCancel}
                    disabled={isPurchasing}
                    accessibilityLabel={isKm ? "ពេលក្រោយ" : "Not now"}
                  />
                </View>

                <View style={styles.buttonWrapper}>
                  <KokiButton
                    variant="green"
                    compact={true}
                    title={isPurchasing ? "..." : isKm ? "យកវា!" : "Get it!"}
                    onPress={onConfirm}
                    disabled={isPurchasing}
                    accessibilityLabel={isKm ? "យកវា" : "Get it"}
                  />
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.lg,
  },
  dialogCard: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: Palette.pureWhite,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    alignItems: "center",
    borderWidth: 3,
    borderColor: Palette.borderSubtle,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FEF3C7",
    borderWidth: 2,
    borderColor: "#FDE68A",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  itemIcon: {
    fontSize: 42,
  },
  titleText: {
    fontSize: 22,
    lineHeight: 28,
    marginBottom: Spacing.sm,
  },
  pricePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    borderWidth: 1.5,
    borderColor: "#F59E0B",
    borderRadius: Radius.pill,
    paddingVertical: 4,
    paddingHorizontal: Spacing.md,
    gap: 6,
    marginBottom: Spacing.lg,
  },
  coinEmoji: {
    fontSize: 18,
  },
  priceNumber: {
    fontSize: 20,
    lineHeight: 24,
  },
  buttonRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    width: "100%",
  },
  buttonWrapper: {
    flex: 1,
  },
});
