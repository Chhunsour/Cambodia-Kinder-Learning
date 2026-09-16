import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
} from "react-native";
import { Text } from "@/components/ui/Text";
import { KokiCard } from "@/components/ui/KokiCard";
import { KokiButton } from "@/components/ui/KokiButton";
import { useLocalization } from "@/hooks/useLocalization";
import { BUILT_IN_AVATARS, AvatarOption } from "@/constants/avatars";
import { ProfileService } from "@/storage/services/profileService";
import { ChildProfile, deriveLearningBand } from "@/types/user";
import { Locale } from "@/types/common";
import { Palette } from "@/constants/theme";
import { Spacing, Radius } from "@/constants/spacing";

interface ParentProfileTabProps {
  profile: ChildProfile | null;
  onProfileUpdated: () => void;
}

export const ParentProfileTab: React.FC<ParentProfileTabProps> = ({
  profile,
  onProfileUpdated,
}) => {
  const { locale, setLocale, t } = useLocalization();
  const isKm = locale === "km";

  // Form states
  const [nickname, setNickname] = useState(profile?.nickname || "");
  const [age, setAge] = useState(profile?.age || 5);
  const [selectedAvatarId, setSelectedAvatarId] = useState(profile?.avatarId || "avatar_01");
  const [selectedLanguage, setSelectedLanguage] = useState<Locale>(
    (profile?.uiLanguage as Locale) || locale
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Synchronize when profile prop updates
  useEffect(() => {
    if (profile) {
      setNickname(profile.nickname);
      setAge(profile.age);
      setSelectedAvatarId(profile.avatarId);
      setSelectedLanguage(profile.uiLanguage as Locale);
    }
  }, [profile]);

  // Derived preview learning band
  const previewBand = useMemo(() => {
    const band = deriveLearningBand(age);
    switch (band) {
      case "champion":
        return isKm ? "ជើងឯក (Champion) • អាយុ ៨-៩" : "Champion (Ages 8–9)";
      case "adventurer":
        return isKm ? "អ្នកផ្សងព្រេង (Adventurer) • អាយុ ៦-៧" : "Adventurer (Ages 6–7)";
      case "explorer":
      default:
        return isKm ? "អ្នករុករក (Explorer) • អាយុ ៣-៥" : "Explorer (Ages 3–5)";
    }
  }, [age, isKm]);

  const handleSave = async () => {
    if (!profile?.id) return;

    const cleanName = nickname.trim();
    if (!cleanName) {
      Alert.alert(
        isKm ? "សូមបញ្ចូលឈ្មោះ" : "Missing Name",
        isKm ? "ឈ្មោះហៅក្រៅរបស់កូនមិនអាចនៅទទេបានទេ។" : "Child nickname cannot be empty."
      );
      return;
    }

    try {
      setIsSaving(true);
      setSaveSuccessMsg(null);

      // 1. Update Nickname
      await ProfileService.updateNickname(profile.id, cleanName);

      // 2. Update Age (auto-recalculates learning band without wiping progress)
      await ProfileService.updateAge(profile.id, age);

      // 3. Update Avatar
      await ProfileService.updateAvatar(profile.id, selectedAvatarId);

      // 4. Update UI Language if changed
      if (selectedLanguage !== profile.uiLanguage) {
        await ProfileService.updateLanguage(profile.id, selectedLanguage);
        await setLocale(selectedLanguage);
      }

      setIsSaving(false);
      setSaveSuccessMsg(t("parent.profileUpdatedToast"));
      onProfileUpdated();

      // Clear success banner after 3 seconds
      setTimeout(() => {
        setSaveSuccessMsg(null);
      }, 3000);
    } catch (err) {
      console.warn("[ParentProfileTab] Error saving profile:", err);
      setIsSaving(false);
      Alert.alert(
        isKm ? "មានបញ្ហា" : "Error",
        isKm ? "មិនអាចរក្សាទុកព័ត៌មានបានទេ។" : "Failed to save profile changes."
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* Success Toast */}
      {saveSuccessMsg && (
        <View style={styles.successBanner}>
          <Text variant="caption" weight="800" color="#047857">
            ✓ {saveSuccessMsg}
          </Text>
        </View>
      )}

      {/* 1. Nickname Field */}
      <KokiCard variant="normal" padding="md" style={styles.card}>
        <Text variant="titleSmall" weight="800" color="#1E293B" style={styles.label}>
          👤 {t("parent.childNickname")}
        </Text>
        <TextInput
          value={nickname}
          onChangeText={setNickname}
          placeholder={t("parent.nicknamePlaceholder")}
          placeholderTextColor="#94A3B8"
          style={styles.textInput}
          maxLength={30}
          autoCorrect={false}
        />
      </KokiCard>

      {/* 2. Age & Learning Band Field */}
      <KokiCard variant="normal" padding="md" style={styles.card}>
        <View style={styles.ageHeaderRow}>
          <Text variant="titleSmall" weight="800" color="#1E293B">
            🎂 {t("parent.childAge")}
          </Text>
          <View style={styles.bandBadge}>
            <Text variant="caption" weight="800" color="#7B61FF">
              {previewBand}
            </Text>
          </View>
        </View>

        {/* Age Picker Pills (Ages 3 to 9) */}
        <View style={styles.agePillsRow}>
          {[3, 4, 5, 6, 7, 8, 9].map((a) => {
            const isSelected = age === a;
            return (
              <Pressable
                key={a}
                onPress={() => setAge(a)}
                style={[styles.agePill, isSelected && styles.agePillSelected]}
                accessibilityRole="button"
                accessibilityLabel={`${a} years old`}
              >
                <Text
                  variant="body"
                  weight="800"
                  color={isSelected ? "#FFFFFF" : "#475569"}
                >
                  {a}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text variant="caption" weight="600" color="#64748B" style={styles.ageHelperText}>
          {isKm
            ? "ការផ្លាស់ប្តូរអាយុនឹងជួយតម្រូវកម្រិតមេរៀននាពេលខាងមុខ ដោយមិនលុបប្រវត្តិរៀន ឬផ្កាយដែលទទួលបានរួចនោះទេ។"
            : "Adjusting age updates learning recommendations without erasing any existing lesson progress or earned stars."}
        </Text>
      </KokiCard>

      {/* 3. Avatar Grid Selection */}
      <KokiCard variant="normal" padding="md" style={styles.card}>
        <Text variant="titleSmall" weight="800" color="#1E293B" style={styles.label}>
          🐾 {t("parent.selectAvatar")}
        </Text>
        <View style={styles.avatarGrid}>
          {BUILT_IN_AVATARS.map((item) => {
            const isSelected = selectedAvatarId === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => setSelectedAvatarId(item.id)}
                style={[
                  styles.avatarItem,
                  { backgroundColor: item.bgColor },
                  isSelected && styles.avatarItemSelected,
                ]}
                accessibilityRole="button"
                accessibilityLabel={isKm ? item.nameKm : item.nameEn}
              >
                <Text style={styles.avatarEmoji}>{item.emoji}</Text>
                <Text
                  variant="caption"
                  weight="700"
                  numberOfLines={1}
                  color={isSelected ? "#1E293B" : "#64748B"}
                  style={{ fontSize: 10, marginTop: 2 }}
                >
                  {isKm ? item.nameKm : item.nameEn}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </KokiCard>

      {/* 4. App Interface Language */}
      <KokiCard variant="normal" padding="md" style={styles.card}>
        <Text variant="titleSmall" weight="800" color="#1E293B" style={styles.label}>
          🌐 {t("parent.appLanguage")}
        </Text>
        <View style={styles.langToggleRow}>
          <Pressable
            onPress={() => setSelectedLanguage("km")}
            style={[
              styles.langButton,
              selectedLanguage === "km" && styles.langButtonActive,
            ]}
            accessibilityRole="button"
          >
            <Text
              variant="bodySmall"
              weight="800"
              color={selectedLanguage === "km" ? "#FFFFFF" : "#475569"}
            >
              🇰🇭 {t("parent.khmer")}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setSelectedLanguage("en")}
            style={[
              styles.langButton,
              selectedLanguage === "en" && styles.langButtonActive,
            ]}
            accessibilityRole="button"
          >
            <Text
              variant="bodySmall"
              weight="800"
              color={selectedLanguage === "en" ? "#FFFFFF" : "#475569"}
            >
              🇬🇧 {t("parent.english")}
            </Text>
          </Pressable>
        </View>
        <Text variant="caption" weight="600" color="#64748B" style={styles.ageHelperText}>
          {isKm
            ? "ផ្លាស់ប្តូរភាសាសម្រាប់ម៉ឺនុយ និងប៊ូតុងកម្មវិធី។ វាមិនផ្លាស់ប្តូរប្រធានបទមេរៀនកុមារឡើយ។"
            : "Changes UI buttons and navigation. Does not alter lesson learning subjects."}
        </Text>
      </KokiCard>

      {/* Save Button */}
      <View style={styles.saveSection}>
        <KokiButton
          variant="primary"
          title={isSaving ? "..." : t("parent.saveChanges")}
          onPress={handleSave}
          fullWidth={true}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: Spacing.xl,
  },
  successBanner: {
    backgroundColor: "#D1FAE5",
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  card: {
    backgroundColor: Palette.pureWhite,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    marginBottom: Spacing.md,
  },
  label: {
    marginBottom: Spacing.xs,
  },
  textInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 10,
    fontSize: 16,
    color: "#1E293B",
    fontFamily: "KantumruyPro_600SemiBold",
  },
  ageHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.xs,
  },
  bandBadge: {
    backgroundColor: "#EDE9FE",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  agePillsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    marginVertical: Spacing.xs,
  },
  agePill: {
    flex: 1,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: "#F1F5F9",
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  agePillSelected: {
    backgroundColor: "#4A6FA5",
    borderColor: "#335384",
  },
  ageHelperText: {
    marginTop: Spacing.xs,
    lineHeight: 18,
  },
  avatarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: Spacing.xs,
  },
  avatarItem: {
    width: "23%",
    paddingVertical: 8,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },
  avatarItemSelected: {
    borderColor: "#7B61FF",
    borderWidth: 2.5,
    transform: [{ scale: 1.04 }],
  },
  avatarEmoji: {
    fontSize: 26,
  },
  langToggleRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  langButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.md,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
  },
  langButtonActive: {
    backgroundColor: "#4A6FA5",
    borderColor: "#335384",
  },
  saveSection: {
    marginTop: Spacing.xs,
  },
});
