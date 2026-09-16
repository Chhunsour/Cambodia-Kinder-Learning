import React from "react";
import {
  ScrollView,
  TouchableOpacity,
  View,
  StyleSheet,
} from "react-native";
import { Text } from "@/components/ui/Text";
import { Palette } from "@/constants/theme";
import { Radius, Spacing } from "@/constants/spacing";
import { Depth } from "@/constants/depth";
import { CosmeticCategory } from "../types";
import { useLocalization } from "@/hooks/useLocalization";

interface CategoryTabBarProps {
  selectedCategory: CosmeticCategory;
  onSelectCategory: (cat: CosmeticCategory) => void;
  ownedCount?: number;
}

interface CategoryOption {
  key: CosmeticCategory;
  labelKey: string;
  labelEn: string;
  labelKm: string;
  icon: string;
}

const CATEGORIES: readonly CategoryOption[] = [
  { key: "all", labelKey: "wardrobe.categoryAll", labelEn: "All", labelKm: "ទាំងអស់", icon: "🌈" },
  { key: "head", labelKey: "wardrobe.categoryHead", labelEn: "Head", labelKm: "ក្បាល", icon: "👒" },
  { key: "face", labelKey: "wardrobe.categoryFace", labelEn: "Face", labelKm: "មុខ", icon: "🕶️" },
  { key: "neck", labelKey: "wardrobe.categoryNeck", labelEn: "Neck", labelKm: "ក", icon: "🧣" },
  { key: "body", labelKey: "wardrobe.categoryBody", labelEn: "Body", labelKm: "ខ្លួន", icon: "👕" },
  { key: "back", labelKey: "wardrobe.categoryBack", labelEn: "Back", labelKm: "ខ្នង", icon: "🎒" },
  { key: "special", labelKey: "wardrobe.categorySpecial", labelEn: "Special", labelKm: "ពិសេស", icon: "✨" },
  { key: "owned", labelKey: "wardrobe.categoryOwned", labelEn: "Owned", labelKm: "បានទិញ", icon: "⭐" },
];

/**
 * Child-friendly horizontal category filter bar for Koki Wardrobe.
 * Large touch targets with icons and Khmer/English localization.
 */
export const CategoryTabBar: React.FC<CategoryTabBarProps> = ({
  selectedCategory,
  onSelectCategory,
  ownedCount,
}) => {
  const { locale } = useLocalization();
  const isKm = locale === "km";

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.key;
          const label = isKm ? cat.labelKm : cat.labelEn;

          return (
            <TouchableOpacity
              key={cat.key}
              activeOpacity={0.75}
              onPress={() => onSelectCategory(cat.key)}
              style={[
                styles.tabPill,
                isSelected ? styles.tabPillActive : styles.tabPillInactive,
                Depth.styles.subtleCard,
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${label} category`}
            >
              <Text style={styles.tabIcon}>{cat.icon}</Text>
              <Text
                variant="bodySmall"
                weight={isSelected ? "800" : "600"}
                color={isSelected ? Palette.pureWhite : Palette.primaryText}
                style={styles.tabLabel}
              >
                {label}
                {cat.key === "owned" && ownedCount !== undefined ? ` (${ownedCount})` : ""}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    paddingVertical: Spacing.xs,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
    alignItems: "center",
  },
  tabPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    borderWidth: 2,
    gap: 6,
    minHeight: 44, // Generous child-friendly touch target
  },
  tabPillActive: {
    backgroundColor: Palette.primaryOrange,
    borderColor: Palette.deepOrange,
  },
  tabPillInactive: {
    backgroundColor: Palette.pureWhite,
    borderColor: Palette.borderSubtle,
  },
  tabIcon: {
    fontSize: 16,
  },
  tabLabel: {
    fontSize: 14,
  },
});
