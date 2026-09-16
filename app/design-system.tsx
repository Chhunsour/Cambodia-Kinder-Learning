import React, { useState } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter, Redirect } from "expo-router";
import { KokiScreen } from "@/components/ui/KokiScreen";
import { Text } from "@/components/ui/Text";
import { KokiButton } from "@/components/ui/KokiButton";
import { KokiCard } from "@/components/ui/KokiCard";
import { GameIconButton } from "@/components/ui/GameIconButton";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { CoinBadge } from "@/components/ui/CoinBadge";
import { StarBadge } from "@/components/ui/StarBadge";
import { HeartBadge } from "@/components/ui/HeartBadge";
import { SpeechBubble } from "@/components/ui/SpeechBubble";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { useLocalization } from "@/hooks/useLocalization";
import { useKokiResponsive } from "@/hooks/useKokiResponsive";
import { Palette } from "@/constants/theme";
import { Spacing, Radius } from "@/constants/spacing";
import { ProfileService, DatabaseInspectionResult } from "@/storage";

/**
 * Temporary Design System Playground Screen
 * Exists purely to inspect and verify all reusable visual components.
 * Shielded from production builds.
 */
export default function DesignSystemScreen() {
  if (!__DEV__) {
    return <Redirect href="/(main)/home" />;
  }

  const router = useRouter();
  const { locale, setLocale } = useLocalization();
  const responsive = useKokiResponsive();

  const [progressVal, setProgressVal] = useState(0.65);
  const [coins, setCoins] = useState(150);
  const [stars, setStars] = useState(12);
  const [hearts, setHearts] = useState(5);
  const [isSoundMuted, setIsSoundMuted] = useState(false);
  const [cardPressCount, setCardPressCount] = useState(0);
  const [dbInspection, setDbInspection] = useState<DatabaseInspectionResult | null>(null);
  const [isInspecting, setIsInspecting] = useState(false);

  const toggleLocale = () => {
    setLocale(locale === "km" ? "en" : "km");
  };

  const isKm = locale === "km";

  return (
    <KokiScreen scrollable={true} backgroundColor={Palette.warmCream}>
      <View style={styles.container}>
        {/* Top Header Bar */}
        <View style={styles.headerBar}>
          <GameIconButton
            type="back"
            color="cream"
            size="compact"
            onPress={() => router.back()}
            accessibilityLabel="Go back"
          />

          <View style={styles.headerTitleColumn}>
            <Text variant="title" weight="800" align="center" color={Palette.primaryOrange}>
              {isKm ? "ផ្ទាំងសាកល្បងរចនាបថ UI" : "Design System Preview"}
            </Text>
            <Text variant="caption" align="center" color={Palette.secondaryText}>
              Koki UI Kit • {responsive.deviceTier}
            </Text>
          </View>

          <KokiButton
            compact={true}
            variant="secondary"
            title={isKm ? "EN" : "ខ្មែរ"}
            onPress={toggleLocale}
          />
        </View>

        {/* 1. Typography Hierarchy */}
        <SectionTitle
          title={isKm ? "ពុម្ពអក្សរ (Typography)" : "Typography Roles"}
          subtitle={isKm ? "គាំទ្រភាសាខ្មែរ និងអង់គ្លេស" : "Dual-script Khmer & English"}
          icon="🔤"
        />
        <KokiCard variant="normal" padding="lg" style={styles.sectionCard}>
          <View style={styles.typeRow}>
            <Text variant="caption" color={Palette.secondaryText}>display (34pt / 800):</Text>
            <Text variant="display" color={Palette.primaryOrange}>
              {isKm ? "កូគីរៀនសប្បាយ" : "Play & Learn"}
            </Text>
          </View>

          <View style={styles.typeRow}>
            <Text variant="caption" color={Palette.secondaryText}>heading1 (28pt / 800):</Text>
            <Text variant="heading1">
              {isKm ? "ដំណើរផ្សងព្រេងអង្គរ" : "Angkor Adventure"}
            </Text>
          </View>

          <View style={styles.typeRow}>
            <Text variant="caption" color={Palette.secondaryText}>heading2 (24pt / 700):</Text>
            <Text variant="heading2">
              {isKm ? "រើសមេរៀនថ្ងៃនេះ" : "Today's Lesson"}
            </Text>
          </View>

          <View style={styles.typeRow}>
            <Text variant="caption" color={Palette.secondaryText}>title (20pt / 700):</Text>
            <Text variant="title">
              {isKm ? "តំបន់កម្សាន្តកោះមេគង្គ" : "Mekong Island Zone"}
            </Text>
          </View>

          <View style={styles.typeRow}>
            <Text variant="caption" color={Palette.secondaryText}>body (17pt / 500):</Text>
            <Text variant="body">
              {isKm 
                ? "សូមជ្រើសរើសមេរៀនដែលប្អូនៗចូលចិត្តដើម្បីប្រមូលផ្កាយ និងកាក់មាស!" 
                : "Choose your favorite lesson to collect golden stars and shiny coins!"}
            </Text>
          </View>

          <View style={styles.typeRow}>
            <Text variant="caption" color={Palette.secondaryText}>bodySmall (15pt / 400):</Text>
            <Text variant="bodySmall">
              {isKm 
                ? "រក្សាទុកដោយស្វ័យប្រវត្តិក្នងម៉ាស៊ីន (Offline-first)" 
                : "Progress saved locally on this device (Offline-first)"}
            </Text>
          </View>

          <View style={styles.typeRow}>
            <Text variant="caption" color={Palette.secondaryText}>gameNumber (22pt / 900):</Text>
            <Text variant="gameNumber" color={Palette.deepOrange}>
              +2,500 XP • 48/50
            </Text>
          </View>
        </KokiCard>

        {/* 2. 3D Buttons (KokiButton) */}
        <SectionTitle
          title={isKm ? "ប៊ូតុង 3D (KokiButton)" : "Tactile 3D Buttons"}
          subtitle={isKm ? "ចុចដើម្បីមានអារម្មណ៍ប៉ោងស្រក 3D" : "Press down to feel physical 3D extrusion"}
          icon="🔘"
        />
        <View style={styles.buttonStack}>
          <KokiButton
            variant="primary"
            fullWidth={true}
            title={isKm ? "បន្តដំណើរផ្សងព្រេង" : "Continue Adventure"}
            subtitle={isKm ? "កោះទី ២ • មេរៀនទី ៤" : "Island 2 • Lesson 4"}
            onPress={() => {}}
          />

          <KokiButton
            variant="green"
            fullWidth={true}
            title={isKm ? "ចាប់ផ្តើមរៀនឥឡូវនេះ" : "Start Learning Now"}
            onPress={() => {}}
          />

          <View style={styles.horizontalRow}>
            <View style={{ flex: 1, marginRight: Spacing.xs }}>
              <KokiButton
                variant="secondary"
                compact={true}
                title={isKm ? "មើលពិន្ទុ" : "View Score"}
                onPress={() => {}}
              />
            </View>
            <View style={{ flex: 1, marginLeft: Spacing.xs }}>
              <KokiButton
                variant="ghost"
                compact={true}
                title={isKm ? "រំលងសិន" : "Skip for now"}
                onPress={() => {}}
              />
            </View>
          </View>

          <KokiButton
            variant="primary"
            disabled={true}
            fullWidth={true}
            title={isKm ? "ប៊ូតុងបិទដំណើរការ (Disabled)" : "Disabled Button State"}
            onPress={() => {}}
          />
        </View>

        {/* 3. Game Icon Buttons */}
        <SectionTitle
          title={isKm ? "ប៊ូតុងរូបតំណាង (GameIconButton)" : "Game Icon Buttons"}
          subtitle={isKm ? "ទំហំប៉ះធំសម្រាប់ក្មេង (>=48dp)" : "Kid-safe touch targets (48-64dp)"}
          icon="🎮"
        />
        <KokiCard variant="normal" padding="md" style={styles.sectionCard}>
          <View style={styles.iconButtonRow}>
            <GameIconButton
              type="back"
              color="cream"
              size="normal"
              onPress={() => {}}
            />
            <GameIconButton
              type={isSoundMuted ? "soundMuted" : "sound"}
              color="sky"
              size="normal"
              onPress={() => setIsSoundMuted(!isSoundMuted)}
            />
            <GameIconButton
              type="settings"
              color="orange"
              size="large"
              onPress={() => {}}
            />
            <GameIconButton
              type="replay"
              color="green"
              size="normal"
              onPress={() => {}}
            />
            <GameIconButton
              type="close"
              color="red"
              size="compact"
              onPress={() => {}}
            />
          </View>
        </KokiCard>

        {/* 4. Progress Bar */}
        <SectionTitle
          title={isKm ? "របារវឌ្ឍនភាព (ProgressBar)" : "Game Progress Bar"}
          subtitle={isKm ? "ចលនា Reanimated ជាមួយរូបតំណាងផ្កាយ" : "Reanimated spring fill with star milestones"}
          icon="📈"
        />
        <KokiCard variant="normal" padding="lg" style={styles.sectionCard}>
          <ProgressBar
            progress={progressVal}
            showLabel={true}
            label={isKm ? `សម្រេចបាន ${Math.round(progressVal * 100)}%` : `Completed ${Math.round(progressVal * 100)}%`}
            starCheckpoints={[0.33, 0.66, 1.0]}
          />

          <View style={styles.adjustRow}>
            <KokiButton
              variant="secondary"
              compact={true}
              title="- 15%"
              onPress={() => setProgressVal(Math.max(0, progressVal - 0.15))}
            />
            <Text variant="gameNumber" color={Palette.green}>
              {Math.round(progressVal * 100)}%
            </Text>
            <KokiButton
              variant="green"
              compact={true}
              title="+ 15%"
              onPress={() => setProgressVal(Math.min(1, progressVal + 0.15))}
            />
          </View>
        </KokiCard>

        {/* 5. Game Badges (Coin, Star, Heart) */}
        <SectionTitle
          title={isKm ? "ផ្លាករង្វាន់ (Badges)" : "Game Status Badges"}
          subtitle={isKm ? "កាក់ ផ្កាយ និងបេះដូង" : "Coins, Stars & Hearts with 3D rims"}
          icon="🏆"
        />
        <KokiCard variant="normal" padding="md" style={styles.sectionCard}>
          <View style={styles.badgeRow}>
            <CoinBadge amount={coins} />
            <StarBadge count={stars} />
            <HeartBadge count={hearts} />
          </View>

          <View style={[styles.badgeRow, { marginTop: Spacing.sm }]}>
            <Text variant="caption" color={Palette.secondaryText}>Compact:</Text>
            <CoinBadge amount={coins} compact={true} />
            <StarBadge count={stars} compact={true} />
            <HeartBadge count={hearts} compact={true} />
          </View>

          <View style={styles.adjustRow}>
            <KokiButton
              variant="secondary"
              compact={true}
              title="+ 25 🪙"
              onPress={() => setCoins(coins + 25)}
            />
            <KokiButton
              variant="secondary"
              compact={true}
              title="+ 1 ⭐"
              onPress={() => setStars(stars + 1)}
            />
            <KokiButton
              variant="secondary"
              compact={true}
              title="+ 1 ❤️"
              onPress={() => setHearts(hearts + 1)}
            />
          </View>
        </KokiCard>

        {/* 6. Speech Bubble */}
        <SectionTitle
          title={isKm ? "ពពុះពាក្យសម្តី (SpeechBubble)" : "Koki Speech Bubble"}
          subtitle={isKm ? "សម្រាប់កូគីនិយាយ និងលើកទឹកចិត្ត" : "For Koki mascot dialogue and encouragement"}
          icon="💬"
        />
        <SpeechBubble
          speakerName="Koki"
          tailDirection="bottom"
          message={
            isKm
              ? "សួស្តីប្អូនៗ! តោះរៀនសប្បាយទាំងអស់គ្នាក្នុងទឹកដីអច្ឆរិយៈ!"
              : "Hi little adventurer! Are you ready for fun challenges today?"
          }
        />

        {/* 7. KokiCard Variants */}
        <SectionTitle
          title={isKm ? "កាតព័ត៌មាន (KokiCard Variants)" : "Chunky Rounded Cards"}
          subtitle={isKm ? "Normal, Elevated, Outlined, Interactive" : "Different depth and tactile styles"}
          icon="🃏"
        />
        <View style={styles.cardGrid}>
          <KokiCard variant="normal" padding="md" style={styles.cardItem}>
            <Text variant="titleSmall" weight="700">Normal Card</Text>
            <Text variant="bodySmall">Soft white surface with subtle 3D border</Text>
          </KokiCard>

          <KokiCard variant="elevated" padding="md" style={styles.cardItem}>
            <Text variant="titleSmall" weight="700" color={Palette.skyBlueDeep}>Elevated Card</Text>
            <Text variant="bodySmall">Deeper shadow layer for featured sections</Text>
          </KokiCard>

          <KokiCard variant="outlined" padding="md" style={styles.cardItem}>
            <Text variant="titleSmall" weight="700" color={Palette.secondaryText}>Outlined Card</Text>
            <Text variant="bodySmall">Clear boundary on cream backgrounds</Text>
          </KokiCard>

          <KokiCard 
            variant="interactive" 
            padding="md" 
            style={styles.cardItem}
            onPress={() => setCardPressCount(cardPressCount + 1)}
          >
            <Text variant="titleSmall" weight="700" color={Palette.green}>Interactive Card 👆</Text>
            <Text variant="bodySmall">
              {isKm ? `ចុចបាន ${cardPressCount} ដង` : `Pressed ${cardPressCount} times (tactile)`}
            </Text>
          </KokiCard>
        </View>

        {/* 8. Responsive Diagnostic Card */}
        <SectionTitle
          title={isKm ? "ការគាំទ្រអេក្រង់ (Responsive System)" : "Responsive Engine Diagnostics"}
          subtitle={isKm ? "ទូរស័ព្ទ និងថេប្លេត" : "Adaptive phone & tablet metrics"}
          icon="📱"
        />
        <KokiCard variant="normal" padding="lg" style={styles.sectionCard}>
          <View style={styles.diagnosticRow}>
            <Text variant="bodySmall" color={Palette.secondaryText}>Device Tier:</Text>
            <Text variant="bodySmall" weight="700" color={Palette.primaryOrange}>
              {responsive.deviceTier}
            </Text>
          </View>
          <View style={styles.diagnosticRow}>
            <Text variant="bodySmall" color={Palette.secondaryText}>Dimensions:</Text>
            <Text variant="bodySmall" weight="700">
              {Math.round(responsive.width)} × {Math.round(responsive.height)} dp
            </Text>
          </View>
          <View style={styles.diagnosticRow}>
            <Text variant="bodySmall" color={Palette.secondaryText}>Horizontal Padding:</Text>
            <Text variant="bodySmall" weight="700">
              {responsive.horizontalPadding} dp
            </Text>
          </View>
          <View style={styles.diagnosticRow}>
            <Text variant="bodySmall" color={Palette.secondaryText}>Max Content Width:</Text>
            <Text variant="bodySmall" weight="700">
              {responsive.maxContentWidth} dp
            </Text>
          </View>
        </KokiCard>

        {/* 9. Developer Diagnostics & SQLite Controls */}
        <SectionTitle
          title="🛠️ Developer Diagnostics"
          subtitle="Inspect, seed, or reset SQLite child profiles & settings"
          icon="🔄"
        />
        <KokiCard variant="outlined" padding="lg" style={styles.sectionCard}>
          <Text variant="bodySmall" color={Palette.secondaryText}>
            Local-first SQLite persistence diagnostics for offline child profiles:
          </Text>

          <View style={{ gap: Spacing.sm, marginTop: Spacing.md }}>
            <KokiButton
              variant="secondary"
              fullWidth={true}
              title={isInspecting ? "Inspecting..." : "🔍 inspectLocalDatabase()"}
              onPress={async () => {
                setIsInspecting(true);
                try {
                  const result = await ProfileService.inspectLocalDatabase();
                  setDbInspection(result);
                } catch (e) {
                  console.warn("Inspection failed:", e);
                } finally {
                  setIsInspecting(false);
                }
              }}
            />

            {dbInspection && (
              <View style={{ backgroundColor: Palette.softWhite, padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: Palette.skyBlue }}>
                <Text variant="caption" weight="bold" color={Palette.primaryText}>
                  📊 SQLite State:
                </Text>
                <Text variant="caption" color={Palette.secondaryText}>
                  • PRAGMA user_version: {dbInspection.userVersion}
                </Text>
                <Text variant="caption" color={Palette.secondaryText}>
                  • Tables: {dbInspection.tables.join(", ")}
                </Text>
                <Text variant="caption" color={Palette.secondaryText}>
                  • child_profiles count: {dbInspection.childProfilesCount}
                </Text>
                <Text variant="caption" color={Palette.secondaryText}>
                  • Active profile: {dbInspection.activeProfile ? `${dbInspection.activeProfile.nickname} (age ${dbInspection.activeProfile.age}, ${dbInspection.activeProfile.learningBand})` : "None"}
                </Text>
                <Text variant="caption" color={Palette.secondaryText}>
                  • Onboarding completed: {dbInspection.onboardingCompleted ? "Yes" : "No"}
                </Text>
                <Text variant="caption" color={Palette.secondaryText}>
                  • App settings: {JSON.stringify(dbInspection.appSettings)}
                </Text>
              </View>
            )}

            <KokiButton
              variant="green"
              fullWidth={true}
              title="🌱 seedDevChildProfile()"
              onPress={async () => {
                await ProfileService.seedDevChildProfile();
                const result = await ProfileService.inspectLocalDatabase();
                setDbInspection(result);
              }}
            />

            <KokiButton
              variant="primary"
              fullWidth={true}
              title="↺ resetLocalDatabaseForDev() & Launch Onboarding"
              onPress={async () => {
                await ProfileService.resetLocalDatabaseForDev();
                router.replace("/(onboarding)");
              }}
            />
          </View>
        </KokiCard>

        {/* Bottom space */}
        <View style={{ height: Spacing.giant }} />
      </View>
    </KokiScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.md,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  headerTitleColumn: {
    flex: 1,
    paddingHorizontal: Spacing.xs,
  },
  sectionCard: {
    marginBottom: Spacing.lg,
  },
  typeRow: {
    marginVertical: Spacing.xxs,
  },
  buttonStack: {
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  horizontalRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconButtonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: Spacing.xs,
  },
  adjustRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.md,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  cardGrid: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  cardItem: {
    width: "100%",
  },
  diagnosticRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.xxs,
  },
});
