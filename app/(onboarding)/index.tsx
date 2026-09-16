import React, { useState, useEffect } from "react";
import { 
  View, 
  StyleSheet, 
  TextInput, 
  Pressable, 
  ScrollView, 
  Keyboard 
} from "react-native";
import { useRouter } from "expo-router";
import Animated, { 
  FadeInRight, 
  FadeOutLeft, 
  FadeInLeft, 
  FadeOutRight 
} from "react-native-reanimated";
import { KokiScreen } from "@/components/ui/KokiScreen";
import { Text } from "@/components/ui/Text";
import { KokiButton } from "@/components/ui/KokiButton";
import { KokiCard } from "@/components/ui/KokiCard";
import { GameIconButton } from "@/components/ui/GameIconButton";
import { KokiMascot } from "@/components/koki/KokiMascot";
import { useLocalization } from "@/hooks/useLocalization";
import { useKokiResponsive } from "@/hooks/useKokiResponsive";
import { Palette } from "@/constants/theme";
import { Spacing, Radius, TouchTarget } from "@/constants/spacing";
import { Depth } from "@/constants/depth";
import { BUILT_IN_AVATARS, AvatarOption } from "@/constants/avatars";
import { ProfileService, OnboardingDraft } from "@/storage";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import { deriveLearningBand } from "@/types/user";
import { Locale } from "@/types/common";

const AGE_OPTIONS = [3, 4, 5, 6, 7, 8, 9];

export default function OnboardingScreen() {
  const router = useRouter();
  const { locale, setLocale, t } = useLocalization();
  const { refreshProfile } = useActiveProfile();
  const responsive = useKokiResponsive();

  // Onboarding state
  const [step, setStep] = useState<number>(1);
  const [selectedLocale, setSelectedLocale] = useState<Locale>(locale);
  const [selectedAge, setSelectedAge] = useState<number>(5);
  const [nickname, setNickname] = useState<string>("");
  const [selectedAvatarId, setSelectedAvatarId] = useState<string>("avatar_01");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const isKm = locale === "km";

  // Resume draft state if app was interrupted during previous onboarding attempt
  useEffect(() => {
    async function loadDraft() {
      const draft = await ProfileService.getOnboardingDraft();
      if (draft) {
        if (draft.step) setStep(draft.step);
        if (draft.locale) {
          setSelectedLocale(draft.locale);
          setLocale(draft.locale);
        }
        if (draft.age) setSelectedAge(draft.age);
        if (draft.nickname) setNickname(draft.nickname);
        if (draft.avatarId) setSelectedAvatarId(draft.avatarId);
      }
    }
    loadDraft();
  }, []);

  // Save draft on state changes for restart safety
  const persistDraft = (nextStep: number, nextLocale?: Locale, nextAge?: number, nextNick?: string, nextAvatar?: string) => {
    const draft: OnboardingDraft = {
      step: nextStep,
      locale: nextLocale || selectedLocale,
      age: nextAge || selectedAge,
      nickname: nextNick !== undefined ? nextNick : nickname,
      avatarId: nextAvatar || selectedAvatarId,
    };
    ProfileService.saveOnboardingDraft(draft);
  };

  const handleLanguageSelect = (lang: Locale) => {
    setSelectedLocale(lang);
    setLocale(lang);
    persistDraft(step, lang);
  };

  const handleAgeSelect = (age: number) => {
    setSelectedAge(age);
    persistDraft(step, selectedLocale, age);
  };

  const handleAvatarSelect = (avatarId: string) => {
    setSelectedAvatarId(avatarId);
    persistDraft(step, selectedLocale, selectedAge, nickname, avatarId);
  };

  const goToStep = (nextStep: number) => {
    setStep(nextStep);
    persistDraft(nextStep);
  };

  const handleComplete = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    Keyboard.dismiss();

    try {
      await ProfileService.completeFirstLaunchOnboarding({
        nickname,
        age: selectedAge,
        avatarId: selectedAvatarId,
        uiLanguage: selectedLocale,
      });

      // Refresh in-memory context state so the entire tree receives the active child profile
      await refreshProfile();

      // Navigate to Home
      router.replace("/(main)/home");
    } catch (error) {
      console.warn("[Onboarding] Failed to complete profile:", error);
      setIsSubmitting(false);
    }
  };

  const selectedAvatar = BUILT_IN_AVATARS.find((a) => a.id === selectedAvatarId) || BUILT_IN_AVATARS[0];
  const learningBand = deriveLearningBand(selectedAge);

  const getLearningBandLabel = () => {
    switch (learningBand) {
      case "explorer":
        return t("onboarding.learningBandExplorer");
      case "adventurer":
        return t("onboarding.learningBandAdventurer");
      case "champion":
        return t("onboarding.learningBandChampion");
    }
  };

  return (
    <KokiScreen scrollable={true} backgroundColor={Palette.warmCream}>
      <View style={styles.container}>
        {/* Top Progress & Back Bar (Steps 2 to 4) */}
        {step > 1 && (
          <View style={styles.topBar}>
            <GameIconButton
              type="back"
              color="cream"
              size="compact"
              onPress={() => goToStep(step - 1)}
              accessibilityLabel={t("onboarding.backButton")}
            />

            {/* Step Dots Progress Indicator */}
            <View style={styles.progressDots}>
              {[1, 2, 3, 4].map((s) => (
                <View
                  key={s}
                  style={[
                    styles.dot,
                    s === step && styles.dotActive,
                    s < step && styles.dotCompleted,
                  ]}
                />
              ))}
            </View>

            <View style={styles.stepCounter}>
              <Text variant="caption" weight="700" color={Palette.secondaryText}>
                {step} / 4
              </Text>
            </View>
          </View>
        )}

        {/* STEP 1: Welcome */}
        {step === 1 && (
          <Animated.View 
            entering={FadeInRight.duration(260)} 
            exiting={FadeOutLeft.duration(200)} 
            style={styles.stepWrapper}
          >
            <KokiMascot size={responsive.isTablet ? 160 : 130} mood="happy" style={styles.heroMascot} />

            <Text variant="display" align="center" color={Palette.primaryOrange} style={styles.mainTitle}>
              {t("onboarding.welcomeTitle")}
            </Text>

            <Text variant="heading2" align="center" color={Palette.primaryText} style={styles.subTitle}>
              {t("onboarding.welcomeSubtitle")}
            </Text>

            <KokiCard variant="normal" padding="lg" style={styles.welcomeCard}>
              <Text variant="body" align="center" color={Palette.secondaryText}>
                {isKm
                  ? "ត្រៀមខ្លួនសម្រាប់ដំណើរផ្សងព្រេងក្នុងទឹកដីកម្ពុជាដ៏ស្រស់ស្អាត ជាមួយល្បែងកម្សាន្តឆ្លាតវៃ!"
                  : "Get ready for a joyful learning journey across Cambodia with playful games and prizes!"}
              </Text>
            </KokiCard>

            <View style={styles.ctaContainer}>
              <KokiButton
                variant="primary"
                fullWidth={true}
                title={t("onboarding.letsGo")}
                onPress={() => goToStep(2)}
              />
            </View>
          </Animated.View>
        )}

        {/* STEP 2: Language Selection */}
        {step === 2 && (
          <Animated.View 
            entering={FadeInRight.duration(260)} 
            exiting={FadeOutLeft.duration(200)} 
            style={styles.stepWrapper}
          >
            <Text variant="heading1" align="center" color={Palette.primaryText} style={styles.stepTitle}>
              {t("onboarding.languageTitle")}
            </Text>
            <Text variant="body" align="center" color={Palette.secondaryText} style={styles.stepSubtitle}>
              {t("onboarding.languageSubtitle")}
            </Text>

            {/* Language Options Grid */}
            <View style={styles.optionsColumn}>
              {/* Khmer Option */}
              <Pressable
                onPress={() => handleLanguageSelect("km")}
                style={[
                  styles.languageCard,
                  selectedLocale === "km" && styles.optionCardSelected,
                ]}
                accessibilityRole="button"
                accessibilityLabel="ភាសាខ្មែរ (Khmer)"
              >
                <View style={styles.langEmojiWrapper}>
                  <Text style={{ fontSize: 36 }}>🇰🇭</Text>
                </View>
                <View style={styles.langTextColumn}>
                  <Text variant="heading2" weight="800" color={selectedLocale === "km" ? Palette.primaryOrange : Palette.primaryText}>
                    ភាសាខ្មែរ
                  </Text>
                  <Text variant="bodySmall" color={Palette.secondaryText}>
                    Khmer (Default)
                  </Text>
                </View>
                {selectedLocale === "km" && (
                  <View style={styles.checkBadge}>
                    <Text style={{ fontSize: 16, color: Palette.inverseText, fontWeight: "800" }}>✓</Text>
                  </View>
                )}
              </Pressable>

              {/* English Option */}
              <Pressable
                onPress={() => handleLanguageSelect("en")}
                style={[
                  styles.languageCard,
                  selectedLocale === "en" && styles.optionCardSelected,
                ]}
                accessibilityRole="button"
                accessibilityLabel="English"
              >
                <View style={styles.langEmojiWrapper}>
                  <Text style={{ fontSize: 36 }}>🇬🇧</Text>
                </View>
                <View style={styles.langTextColumn}>
                  <Text variant="heading2" weight="800" color={selectedLocale === "en" ? Palette.primaryOrange : Palette.primaryText}>
                    English
                  </Text>
                  <Text variant="bodySmall" color={Palette.secondaryText}>
                    English Language
                  </Text>
                </View>
                {selectedLocale === "en" && (
                  <View style={styles.checkBadge}>
                    <Text style={{ fontSize: 16, color: Palette.inverseText, fontWeight: "800" }}>✓</Text>
                  </View>
                )}
              </Pressable>
            </View>

            {/* Clarification Note */}
            <KokiCard variant="normal" padding="md" style={styles.noteCard}>
              <Text variant="caption" color={Palette.secondaryText} align="center">
                ℹ️ {t("onboarding.languageNote")}
              </Text>
            </KokiCard>

            <View style={styles.ctaContainer}>
              <KokiButton
                variant="primary"
                fullWidth={true}
                title={t("onboarding.nextButton")}
                onPress={() => goToStep(3)}
              />
            </View>
          </Animated.View>
        )}

        {/* STEP 3: Age Selection */}
        {step === 3 && (
          <Animated.View 
            entering={FadeInRight.duration(260)} 
            exiting={FadeOutLeft.duration(200)} 
            style={styles.stepWrapper}
          >
            <Text variant="heading1" align="center" color={Palette.primaryText} style={styles.stepTitle}>
              {t("onboarding.ageTitle")}
            </Text>
            <Text variant="body" align="center" color={Palette.secondaryText} style={styles.stepSubtitle}>
              {t("onboarding.ageSubtitle")}
            </Text>

            {/* Age Grid */}
            <View style={styles.ageGrid}>
              {AGE_OPTIONS.map((age) => {
                const isSelected = selectedAge === age;
                return (
                  <Pressable
                    key={age}
                    onPress={() => handleAgeSelect(age)}
                    accessibilityRole="button"
                    accessibilityLabel={t("onboarding.yearsOld", { age })}
                    accessibilityState={{ selected: isSelected }}
                    style={[
                      styles.ageButton,
                      isSelected && styles.ageButtonSelected,
                    ]}
                  >
                    <Text 
                      variant="display" 
                      weight="900" 
                      color={isSelected ? Palette.primaryOrange : Palette.primaryText}
                    >
                      {age}
                    </Text>
                    <Text 
                      variant="caption" 
                      weight="700" 
                      color={isSelected ? Palette.deepOrange : Palette.secondaryText}
                    >
                      {isKm ? `${age} ឆ្នាំ` : "yrs"}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Dynamic Learning Tier Feedback */}
            <KokiCard variant="elevated" padding="md" style={styles.tierCard}>
              <Text variant="caption" weight="700" color={Palette.secondaryText} align="center">
                {isKm ? "កម្រិតសិក្សាដែលបានកំណត់" : "Configured Learning Tier"}:
              </Text>
              <Text variant="titleSmall" weight="800" color={Palette.primaryOrange} align="center" style={{ marginTop: 2 }}>
                🎯 {getLearningBandLabel()}
              </Text>
            </KokiCard>

            <View style={styles.ctaContainer}>
              <KokiButton
                variant="primary"
                fullWidth={true}
                title={t("onboarding.nextButton")}
                onPress={() => goToStep(4)}
              />
            </View>
          </Animated.View>
        )}

        {/* STEP 4: Nickname & Avatar Selection */}
        {step === 4 && (
          <Animated.View 
            entering={FadeInRight.duration(260)} 
            exiting={FadeOutLeft.duration(200)} 
            style={styles.stepWrapper}
          >
            <Text variant="heading1" align="center" color={Palette.primaryText} style={styles.stepTitle}>
              {t("onboarding.profileTitle")}
            </Text>
            <Text variant="body" align="center" color={Palette.secondaryText} style={styles.stepSubtitle}>
              {t("onboarding.profileSubtitle")}
            </Text>

            {/* Nickname Input Card */}
            <KokiCard variant="normal" padding="md" style={styles.inputCard}>
              <Text variant="titleSmall" weight="700" style={styles.inputLabel}>
                {t("onboarding.nicknameLabel")}
              </Text>
              <TextInput
                value={nickname}
                onChangeText={(text) => {
                  setNickname(text);
                  persistDraft(4, selectedLocale, selectedAge, text);
                }}
                maxLength={16}
                placeholder={t("onboarding.nicknamePlaceholder")}
                placeholderTextColor={Palette.mutedText}
                style={styles.textInput}
                autoCorrect={false}
                returnKeyType="done"
              />
              <Text variant="caption" color={Palette.secondaryText} style={styles.inputHint}>
                {isKm
                  ? "បើមិនដាក់ឈ្មោះទេ កូគីនឹងហៅប្អូនថា «អ្នករុករកតូច»"
                  : "If left blank, Koki will call you 'Little Explorer'"}
              </Text>
            </KokiCard>

            {/* Avatar Selection Title */}
            <Text variant="titleSmall" weight="700" style={styles.avatarSectionHeader}>
              {t("onboarding.avatarLabel")}
            </Text>

            {/* 8 Avatar Grid */}
            <View style={styles.avatarGrid}>
              {BUILT_IN_AVATARS.map((avatar) => {
                const isSelected = selectedAvatarId === avatar.id;
                return (
                  <Pressable
                    key={avatar.id}
                    onPress={() => handleAvatarSelect(avatar.id)}
                    accessibilityRole="button"
                    accessibilityLabel={isKm ? avatar.nameKm : avatar.nameEn}
                    accessibilityState={{ selected: isSelected }}
                    style={[
                      styles.avatarCard,
                      { backgroundColor: avatar.bgColor },
                      isSelected && [styles.avatarCardSelected, { borderColor: avatar.borderColor }],
                    ]}
                  >
                    <Text style={styles.avatarEmoji}>{avatar.emoji}</Text>
                    <Text 
                      variant="caption" 
                      weight={isSelected ? "800" : "600"} 
                      color={isSelected ? Palette.primaryText : Palette.secondaryText}
                      numberOfLines={1}
                      style={styles.avatarName}
                    >
                      {isKm ? avatar.nameKm : avatar.nameEn}
                    </Text>
                    {isSelected && (
                      <View style={[styles.avatarCheckBadge, { backgroundColor: avatar.borderColor }]}>
                        <Text style={{ fontSize: 10, color: Palette.inverseText, fontWeight: "900" }}>✓</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>

            {/* Complete Button */}
            <View style={styles.ctaContainer}>
              <KokiButton
                variant="green"
                fullWidth={true}
                title={t("onboarding.readyButton")}
                loading={isSubmitting}
                onPress={handleComplete}
              />
            </View>
          </Animated.View>
        )}
      </View>
    </KokiScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.md,
    alignItems: "center",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: Spacing.md,
  },
  progressDots: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#E2DCD2",
  },
  dotActive: {
    width: 24,
    backgroundColor: Palette.primaryOrange,
  },
  dotCompleted: {
    backgroundColor: Palette.green,
  },
  stepCounter: {
    width: 44,
    alignItems: "flex-end",
  },
  stepWrapper: {
    width: "100%",
    alignItems: "center",
  },
  heroMascot: {
    marginVertical: Spacing.md,
  },
  mainTitle: {
    marginBottom: Spacing.xxs,
  },
  subTitle: {
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  stepTitle: {
    marginBottom: Spacing.xxs,
  },
  stepSubtitle: {
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  welcomeCard: {
    width: "100%",
    marginBottom: Spacing.xl,
  },
  ctaContainer: {
    width: "100%",
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  optionsColumn: {
    width: "100%",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  languageCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Palette.pureWhite,
    borderRadius: Radius.large,
    padding: Spacing.md,
    borderWidth: 2,
    borderColor: Palette.cardOutline,
    ...Depth.styles.subtleCard,
  },
  optionCardSelected: {
    borderColor: Palette.primaryOrange,
    backgroundColor: Palette.orangeLight,
    ...Depth.styles.elevatedCard,
  },
  langEmojiWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Palette.softWhite,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  langTextColumn: {
    flex: 1,
  },
  checkBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Palette.primaryOrange,
    alignItems: "center",
    justifyContent: "center",
  },
  noteCard: {
    width: "100%",
    marginBottom: Spacing.md,
  },
  ageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: Spacing.sm,
    width: "100%",
    marginBottom: Spacing.md,
  },
  ageButton: {
    width: "22%",
    minWidth: 70,
    aspectRatio: 1,
    backgroundColor: Palette.pureWhite,
    borderRadius: Radius.large,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Palette.cardOutline,
    ...Depth.styles.subtleCard,
  },
  ageButtonSelected: {
    borderColor: Palette.primaryOrange,
    backgroundColor: Palette.orangeLight,
    transform: [{ scale: 1.05 }],
    ...Depth.styles.elevatedCard,
  },
  tierCard: {
    width: "100%",
    marginBottom: Spacing.md,
  },
  inputCard: {
    width: "100%",
    marginBottom: Spacing.md,
  },
  inputLabel: {
    marginBottom: Spacing.xs,
  },
  textInput: {
    backgroundColor: Palette.warmCream,
    borderWidth: 2,
    borderColor: Palette.cardOutline,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 18,
    fontWeight: "700",
    color: Palette.primaryText,
    minHeight: TouchTarget.kid,
  },
  inputHint: {
    marginTop: Spacing.xs,
  },
  avatarSectionHeader: {
    alignSelf: "flex-start",
    marginBottom: Spacing.xs,
  },
  avatarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: Spacing.xs,
    width: "100%",
    marginBottom: Spacing.md,
  },
  avatarCard: {
    width: "23%",
    minWidth: 72,
    aspectRatio: 0.9,
    borderRadius: Radius.large,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xs,
    borderWidth: 2,
    borderColor: "transparent",
    position: "relative",
    ...Depth.styles.subtleCard,
  },
  avatarCardSelected: {
    borderWidth: 3,
    transform: [{ scale: 1.05 }],
    ...Depth.styles.elevatedCard,
  },
  avatarEmoji: {
    fontSize: 32,
    marginBottom: 2,
  },
  avatarName: {
    fontSize: 11,
    textAlign: "center",
    paddingHorizontal: 2,
  },
  avatarCheckBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
});
