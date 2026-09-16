import React from "react";
import { TouchableOpacity, View, StyleSheet } from "react-native";
import { Text } from "@/components/ui/Text";
import { Palette } from "@/constants/theme";
import { Radius, Spacing } from "@/constants/spacing";
import { Depth } from "@/constants/depth";
import { CosmeticItem, ItemCardState } from "../types";
import { useLocalization } from "@/hooks/useLocalization";

export interface CosmeticItemCardProps {
  item: CosmeticItem;
  state: ItemCardState;
  isSelected: boolean;
  onPress: () => void;
}

export const CosmeticItemCard: React.FC<CosmeticItemCardProps> = ({
  item,
  state,
  isSelected,
  onPress,
}) => {
  const { locale } = useLocalization();
  const isKm = locale === "km";

  const itemName = isKm ? item.nameKm : item.nameEn;

  // Rarity styling
  const getRarityBadge = () => {
    switch (item.rarity) {
      case "special":
        return { text: "★ Special", bg: "#FEF08A", color: "#854D0E" };
      case "rare":
        return { text: "Rare", bg: "#E0F2FE", color: "#0369A1" };
      case "common":
      default:
        return null;
    }
  };

  const rarityInfo = getRarityBadge();

  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={onPress}
      style={[
        styles.card,
        isSelected && styles.cardSelected,
        state === "unaffordable" && styles.cardUnaffordable,
        Depth.styles.subtleCard,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${itemName}, ${state}`}
    >
      {/* Rarity tag if rare or special */}
      {rarityInfo && (
        <View style={[styles.rarityBadge, { backgroundColor: rarityInfo.bg }]}>
          <Text
            variant="caption"
            weight="800"
            color={rarityInfo.color}
            style={styles.rarityText}
          >
            {rarityInfo.text}
          </Text>
        </View>
      )}

      {/* Item Icon / Graphic */}
      <View style={styles.iconCircle}>
        <Text style={styles.itemIcon}>{item.icon}</Text>
      </View>

      {/* Item Name */}
      <Text
        variant="bodySmall"
        weight="800"
        align="center"
        numberOfLines={1}
        color={Palette.primaryText}
        style={styles.nameText}
      >
        {itemName}
      </Text>

      {/* State / Price Badge */}
      <View style={styles.statusContainer}>
        {state === "equipped" ? (
          <View style={[styles.statusPill, styles.pillEquipped]}>
            <Text
              variant="caption"
              weight="900"
              color={Palette.pureWhite}
              style={styles.pillText}
            >
              ✓ {isKm ? "កំពុងពាក់" : "Wearing"}
            </Text>
          </View>
        ) : state === "owned" ? (
          <View style={[styles.statusPill, styles.pillOwned]}>
            <Text
              variant="caption"
              weight="800"
              color={Palette.secondaryText}
              style={styles.pillText}
            >
              {isKm ? "បានទិញ" : "Owned"}
            </Text>
          </View>
        ) : (
          <View
            style={[
              styles.statusPill,
              state === "affordable" ? styles.pillAffordable : styles.pillLocked,
            ]}
          >
            <Text style={styles.coinEmoji}>🪙</Text>
            <Text
              variant="caption"
              weight="900"
              color={state === "affordable" ? "#B45309" : Palette.mutedText}
              style={styles.pillText}
            >
              {item.priceCoins}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 105,
    maxWidth: 160,
    backgroundColor: Palette.pureWhite,
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderColor: Palette.borderSubtle,
    padding: Spacing.sm,
    alignItems: "center",
    justifyContent: "space-between",
    position: "relative",
    minHeight: 145,
  },
  cardSelected: {
    borderColor: Palette.primaryOrange,
    borderWidth: 3,
    backgroundColor: "#FFFBF7",
    ...Depth.styles.elevatedCard,
  },
  cardUnaffordable: {
    opacity: 0.85,
  },
  rarityBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: Radius.pill,
  },
  rarityText: {
    fontSize: 9,
    lineHeight: 12,
  },
  iconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    marginBottom: 6,
  },
  itemIcon: {
    fontSize: 34,
  },
  nameText: {
    fontSize: 13,
    lineHeight: 17,
    marginBottom: 6,
  },
  statusContainer: {
    width: "100%",
    alignItems: "center",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: Radius.pill,
    gap: 3,
    width: "100%",
  },
  pillEquipped: {
    backgroundColor: Palette.green,
  },
  pillOwned: {
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  pillAffordable: {
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  pillLocked: {
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  coinEmoji: {
    fontSize: 12,
  },
  pillText: {
    fontSize: 11,
    lineHeight: 15,
  },
});
