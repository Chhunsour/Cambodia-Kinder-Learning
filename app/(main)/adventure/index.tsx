import React, { useState } from "react";
import { StyleSheet, View, Pressable } from "react-native";
import { AdventureMap } from "@/features/adventure";
import { useWorldProgression } from "@/features/progression";
import { Palette } from "@/constants/theme";
import { Spacing, Radius } from "@/constants/spacing";
import { Text } from "@/components/ui/Text";
import { useLocalization } from "@/hooks/useLocalization";
import { MoreAdventuresModal } from "@/features/contentPacks/components/MoreAdventuresModal";

export default function AdventureScreen() {
  const { locale } = useLocalization();
  const isKm = locale === "km";

  const [activeWorldId, setActiveWorldId] = useState<string>("world-1");
  const [modalVisible, setModalVisible] = useState<boolean>(false);

  const { world } = useWorldProgression(activeWorldId);

  return (
    <View style={styles.container}>
      {/* Top Floating Adventure Selector Header */}
      <View style={styles.headerFloatingRow}>
        {activeWorldId !== "world-1" && (
          <Pressable
            style={styles.backToVillageButton}
            onPress={() => setActiveWorldId("world-1")}
            accessibilityRole="button"
          >
            <Text variant="caption" weight="800" color="#4A6FA5">
              ← {isKm ? "ភូមិកូគី" : "Koki Village"}
            </Text>
          </Pressable>
        )}

        <Pressable
          style={styles.moreAdventuresButton}
          onPress={() => setModalVisible(true)}
          accessibilityRole="button"
        >
          <Text variant="caption" weight="800" color="#FFFFFF">
            🗺️ {isKm ? "ដំណើរផ្សងព្រេងបន្ថែម" : "More Adventures"}
          </Text>
        </Pressable>
      </View>

      {world ? <AdventureMap world={world} /> : <View style={styles.container} />}

      <MoreAdventuresModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSelectWorld={(worldId) => setActiveWorldId(worldId)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.warmCream,
  },
  headerFloatingRow: {
    position: "absolute",
    top: 14,
    left: Spacing.md,
    right: Spacing.md,
    zIndex: 10,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: Spacing.xs,
  },
  moreAdventuresButton: {
    backgroundColor: "#4A6FA5",
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    elevation: 3,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  backToVillageButton: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    elevation: 3,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
});
