import React from "react";
import { View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { KokiScreen } from "@/components/ui/KokiScreen";
import { Text } from "@/components/ui/Text";
import { KokiButton } from "@/components/ui/KokiButton";
import { KokiCard } from "@/components/ui/KokiCard";
import { KokiMascot } from "@/components/koki/KokiMascot";
import { useLocalization } from "@/hooks/useLocalization";
import { Palette } from "@/constants/theme";
import { Spacing } from "@/constants/spacing";

export default function RewardScreen() {
  const router = useRouter();
  const { locale } = useLocalization();
  const isKm = locale === "km";

  return (
    <KokiScreen scrollable={true} backgroundColor={Palette.pureWhite}>
      <View style={styles.container}>
        <KokiMascot size={130} mood="cheering" style={styles.mascot} />

        <Text variant="display" align="center" color={Palette.goldDark}>
          🏆
        </Text>
        <Text variant="heading1" align="center" color={Palette.primaryText}>
          {isKm ? "រង្វាន់ពិសេស!" : "Special Reward!"}
        </Text>
        <Text variant="body" align="center" color={Palette.secondaryText} style={styles.subtitle}>
          {isKm ? "ផ្ទាំងរង្វាន់ Modal (Reward Celebration)" : "Reward Celebration Modal"}
        </Text>

        <KokiCard variant="normal" padding="lg" style={styles.card}>
          <Text variant="titleSmall" weight="700" color={Palette.primaryOrange} align="center">
            {isKm ? "ស្ទីកឃ័រកូនដំរីមាស!" : "Golden Elephant Sticker Unlocked!"}
          </Text>
          <Text variant="bodySmall" color={Palette.secondaryText} align="center" style={{ marginTop: 4 }}>
            {isKm
              ? "បានរក្សាទុកក្នុងអាល់ប៊ុមរង្វាន់របស់អ្នក។"
              : "Added to your permanent collection album."}
          </Text>
        </KokiCard>

        <View style={styles.actions}>
          <KokiButton
            variant="green"
            fullWidth={true}
            title={isKm ? "យល់ព្រម (បិទ)" : "Awesome! (Close)"}
            onPress={() => router.back()}
          />
        </View>
      </View>
    </KokiScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.xl,
    alignItems: "center",
  },
  mascot: {
    marginBottom: Spacing.sm,
  },
  subtitle: {
    marginTop: Spacing.xxs,
    marginBottom: Spacing.xl,
  },
  card: {
    width: "100%",
    marginBottom: Spacing.xl,
  },
  actions: {
    width: "100%",
  },
});
