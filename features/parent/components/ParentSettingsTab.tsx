import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Switch,
  Pressable,
  Modal,
  TextInput,
  Alert,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { Text } from "@/components/ui/Text";
import { KokiCard } from "@/components/ui/KokiCard";
import { KokiButton } from "@/components/ui/KokiButton";
import { useLocalization } from "@/hooks/useLocalization";
import { ParentSettingsService, ParentAudioSettings } from "../services/parentSettingsService";
import { ProfileService } from "@/storage/services/profileService";
import { ChildProfile } from "@/types/user";
import { Palette } from "@/constants/theme";
import { Spacing, Radius } from "@/constants/spacing";
import { reminderService } from "@/features/notifications";
import {
  LearningReminderSettings,
  NotificationPermissionStatus,
} from "@/features/notifications/types";

interface ParentSettingsTabProps {
  profile: ChildProfile | null;
  onProfileDeleted?: () => void;
}

export const ParentSettingsTab: React.FC<ParentSettingsTabProps> = ({
  profile,
  onProfileDeleted,
}) => {
  const router = useRouter();
  const { locale, t } = useLocalization();
  const isKm = locale === "km";

  // Audio settings
  const [audioSettings, setAudioSettings] = useState<ParentAudioSettings>({
    narrationEnabled: true,
    soundEffectsEnabled: true,
  });

  // Download settings
  const [downloadSettings, setDownloadSettings] = useState<{ downloadWifiOnly: boolean }>({
    downloadWifiOnly: true,
  });

  // Learning Reminder settings
  const [reminderSettings, setReminderSettings] = useState<LearningReminderSettings>({
    enabled: false,
    timeHour: 18,
    timeMinute: 0,
  });
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermissionStatus>("undetermined");
  const [explanationModalVisible, setExplanationModalVisible] = useState<boolean>(false);
  const [testNotificationSent, setTestNotificationSent] = useState<boolean>(false);

  // Deletion modal state
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!profile?.id) return;
    ParentSettingsService.getAudioSettings(profile.id).then(setAudioSettings);
    ParentSettingsService.getDownloadSettings().then(setDownloadSettings);
    ParentSettingsService.getReminderSettings(profile.id).then(setReminderSettings);
    reminderService.getPermissionStatus().then(setPermissionStatus);
  }, [profile?.id]);

  const handleToggleNarration = async (val: boolean) => {
    if (!profile?.id) return;
    setAudioSettings((prev) => ({ ...prev, narrationEnabled: val }));
    await ParentSettingsService.updateAudioSettings(profile.id, {
      narrationEnabled: val,
    });
  };

  const handleToggleSoundEffects = async (val: boolean) => {
    if (!profile?.id) return;
    setAudioSettings((prev) => ({ ...prev, soundEffectsEnabled: val }));
    await ParentSettingsService.updateAudioSettings(profile.id, {
      soundEffectsEnabled: val,
    });
  };

  const handleToggleWifiOnly = async (val: boolean) => {
    setDownloadSettings({ downloadWifiOnly: val });
    await ParentSettingsService.updateDownloadSettings({ downloadWifiOnly: val });
  };

  const handleToggleReminders = async (val: boolean) => {
    if (!profile?.id) return;
    if (val) {
      const status = await reminderService.getPermissionStatus();
      if (status === "granted") {
        const updated = await ParentSettingsService.updateReminderSettings(profile.id, { enabled: true });
        setReminderSettings(updated);
        await reminderService.scheduleLearningReminder(
          profile.id,
          updated,
          profile.nickname,
          locale as any
        );
      } else if (status === "denied") {
        setPermissionStatus("denied");
      } else {
        setExplanationModalVisible(true);
      }
    } else {
      const updated = await ParentSettingsService.updateReminderSettings(profile.id, { enabled: false });
      setReminderSettings(updated);
      await reminderService.cancelLearningReminder(profile.id);
    }
  };

  const handleConfirmEnablePermission = async () => {
    if (!profile?.id) return;
    setExplanationModalVisible(false);
    const status = await reminderService.requestPermission();
    setPermissionStatus(status);
    if (status === "granted") {
      const updated = await ParentSettingsService.updateReminderSettings(profile.id, { enabled: true });
      setReminderSettings(updated);
      await reminderService.scheduleLearningReminder(
        profile.id,
        updated,
        profile.nickname,
        locale as any
      );
    }
  };

  const handleSelectReminderTime = async (hour: number, minute: number) => {
    if (!profile?.id) return;
    const updated = await ParentSettingsService.updateReminderSettings(profile.id, {
      timeHour: hour,
      timeMinute: minute,
    });
    setReminderSettings(updated);
    if (updated.enabled) {
      await reminderService.scheduleLearningReminder(
        profile.id,
        updated,
        profile.nickname,
        locale as any
      );
    }
  };

  const handleSendTestNotification = async () => {
    if (!profile?.id) return;
    setTestNotificationSent(true);
    await reminderService.scheduleTestNotificationInSeconds(
      5,
      profile.id,
      profile.nickname,
      locale as any
    );
    setTimeout(() => setTestNotificationSent(false), 6000);
  };

  const isConfirmed = confirmInput.trim().toUpperCase() === "DELETE";

  const handleConfirmDelete = async () => {
    if (!profile?.id || !isConfirmed || isDeleting) return;

    try {
      setIsDeleting(true);
      const result = await ProfileService.deleteProfile(profile.id);

      setIsDeleting(false);
      setDeleteModalVisible(false);

      if (!result.remainingProfile) {
        // No child profiles remaining -> redirect to onboarding
        router.replace("/(onboarding)");
      } else {
        // Switch to remaining active profile
        if (onProfileDeleted) {
          onProfileDeleted();
        }
      }
    } catch (err) {
      console.warn("[ParentSettingsTab] Error deleting profile:", err);
      setIsDeleting(false);
      Alert.alert(
        isKm ? "មានបញ្ហា" : "Error",
        isKm ? "មិនអាចលុបព័ត៌មានកុមារបានទេ។" : "Failed to delete child profile."
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* 1. Audio Preferences */}
      <View style={styles.sectionHeader}>
        <Text variant="titleSmall" weight="800" color="#1E293B">
          🔊 {t("parent.audioSettings")}
        </Text>
      </View>

      <KokiCard variant="normal" padding="md" style={styles.card}>
        {/* Narration Switch */}
        <View style={styles.settingRow}>
          <View style={styles.settingTextCol}>
            <Text variant="body" weight="700" color="#1E293B">
              {t("parent.narration")}
            </Text>
            <Text variant="caption" weight="600" color="#64748B">
              {t("parent.narrationDesc")}
            </Text>
          </View>
          <Switch
            value={audioSettings.narrationEnabled}
            onValueChange={handleToggleNarration}
            trackColor={{ false: "#CBD5E1", true: "#4A6FA5" }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={styles.divider} />

        {/* Sound Effects Switch */}
        <View style={styles.settingRow}>
          <View style={styles.settingTextCol}>
            <Text variant="body" weight="700" color="#1E293B">
              {t("parent.soundEffects")}
            </Text>
            <Text variant="caption" weight="600" color="#64748B">
              {t("parent.soundEffectsDesc")}
            </Text>
          </View>
          <Switch
            value={audioSettings.soundEffectsEnabled}
            onValueChange={handleToggleSoundEffects}
            trackColor={{ false: "#CBD5E1", true: "#4A6FA5" }}
            thumbColor="#FFFFFF"
          />
        </View>
      </KokiCard>

      {/* 2. Downloads & Cellular Data */}
      <View style={styles.sectionHeader}>
        <Text variant="titleSmall" weight="800" color="#1E293B">
          📥 {isKm ? "ការទាញយក និងទិន្នន័យ" : "Downloads & Cellular Data"}
        </Text>
      </View>

      <KokiCard variant="normal" padding="md" style={styles.card}>
        <View style={styles.settingRow}>
          <View style={styles.settingTextCol}>
            <Text variant="body" weight="700" color="#1E293B">
              {isKm ? "ទាញយកតាមរយៈ Wi-Fi តែប៉ុណ្ណោះ" : "Download over Wi-Fi only"}
            </Text>
            <Text variant="caption" weight="600" color="#64748B">
              {isKm
                ? "ជៀសវាងការប្រើប្រាស់ទិន្នន័យទូរស័ព្ទសម្រាប់ដំណើរផ្សងព្រេងធំៗ"
                : "Prevent using cellular mobile data when downloading content packs"}
            </Text>
          </View>
          <Switch
            value={downloadSettings.downloadWifiOnly}
            onValueChange={handleToggleWifiOnly}
            trackColor={{ false: "#CBD5E1", true: "#4A6FA5" }}
            thumbColor="#FFFFFF"
          />
        </View>
      </KokiCard>

      {/* 3. Gentle Learning Reminders */}
      <View style={styles.sectionHeader}>
        <Text variant="titleSmall" weight="800" color="#1E293B">
          ⏰ {isKm ? "ការរំលឹកការរៀនប្រចាំថ្ងៃ" : "Daily Learning Reminders"}
        </Text>
      </View>

      <KokiCard variant="normal" padding="md" style={styles.card}>
        <View style={styles.settingRow}>
          <View style={styles.settingTextCol}>
            <Text variant="body" weight="700" color="#1E293B">
              {isKm ? "បើកការរំលឹកសុភាពរាបសារ" : "Gentle Learning Reminders"}
            </Text>
            <Text variant="caption" weight="600" color="#64748B">
              {isKm
                ? "អតិបរមា ១ ដងក្នុងមួយថ្ងៃ លើកទឹកចិត្តដោយសេចក្តីស្រឡាញ់ គ្មានការបង្ខិតបង្ខំ"
                : "Max 1 gentle reminder per day. Positive, encouraging, no guilt or pressure."}
            </Text>
          </View>
          <Switch
            value={reminderSettings.enabled}
            onValueChange={handleToggleReminders}
            trackColor={{ false: "#CBD5E1", true: "#4A6FA5" }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* Permission Denied Banner */}
        {permissionStatus === "denied" && reminderSettings.enabled && (
          <View style={styles.deniedBanner}>
            <Text variant="caption" weight="700" color="#B45309" style={{ flex: 1, marginRight: 8 }}>
              {isKm
                ? "⚠️ ការជូនដំណឹងត្រូវបានបិទនៅក្នុងការកំណត់ទូរស័ព្ទ។ សូមបើកវាដើម្បីទទួលបានការរំលឹក។"
                : "⚠️ Notifications are turned off in your device settings. Tap below to enable them."}
            </Text>
            <Pressable
              style={styles.openSettingsButton}
              onPress={() => Linking.openSettings()}
            >
              <Text variant="caption" weight="800" color="#FFFFFF">
                {isKm ? "ការកំណត់" : "Settings"}
              </Text>
            </Pressable>
          </View>
        )}

        {/* Time Settings (Shown when enabled) */}
        {reminderSettings.enabled && (
          <>
            <View style={styles.divider} />
            <View style={styles.timeSection}>
              <View style={styles.timeHeaderRow}>
                <Text variant="bodySmall" weight="700" color="#334155">
                  {isKm ? "ម៉ោងរំលឹកដែលពេញចិត្ត:" : "Preferred reminder time:"}
                </Text>
                <View style={styles.timeBadge}>
                  <Text variant="caption" weight="800" color="#2563EB">
                    {`${reminderSettings.timeHour.toString().padStart(2, "0")}:${reminderSettings.timeMinute.toString().padStart(2, "0")}`}
                    {reminderSettings.timeHour >= 12 ? " PM" : " AM"}
                  </Text>
                </View>
              </View>

              <View style={styles.presetsRow}>
                {[
                  { label: isKm ? "៤:៣០ ល្ងាច (ចេញពីរៀន)" : "4:30 PM (After School)", h: 16, m: 30 },
                  { label: isKm ? "៦:០០ ល្ងាច (ពេលល្ងាច)" : "6:00 PM (Evening)", h: 18, m: 0 },
                  { label: isKm ? "៧:៣០ យប់ (មុនគេង)" : "7:30 PM (Bedtime)", h: 19, m: 30 },
                ].map((preset) => {
                  const isSelected =
                    reminderSettings.timeHour === preset.h &&
                    reminderSettings.timeMinute === preset.m;
                  return (
                    <Pressable
                      key={`${preset.h}:${preset.m}`}
                      onPress={() => handleSelectReminderTime(preset.h, preset.m)}
                      style={[
                        styles.presetPill,
                        isSelected && styles.presetPillSelected,
                      ]}
                    >
                      <Text
                        variant="caption"
                        weight={isSelected ? "800" : "600"}
                        color={isSelected ? "#1D4ED8" : "#475569"}
                      >
                        {preset.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Dev / Parent Preview Trigger */}
              <View style={styles.testRow}>
                <Pressable
                  onPress={handleSendTestNotification}
                  disabled={testNotificationSent}
                  style={[
                    styles.testButton,
                    testNotificationSent && styles.testButtonSent,
                  ]}
                >
                  <Text variant="caption" weight="800" color={testNotificationSent ? "#059669" : "#4F46E5"}>
                    {testNotificationSent
                      ? (isKm ? "✓ បានកំណត់ការផ្ញើក្នុង 5 វិនាទី!" : "✓ Triggering in 5 seconds!")
                      : (isKm ? "🔔 សាកល្បងការជូនដំណឹង (៥ វិនាទី)" : "🔔 Preview reminder now (5s test)")}
                  </Text>
                </Pressable>
              </View>
            </View>
          </>
        )}
      </KokiCard>

      {/* 4. Privacy & Data Storage */}
      <View style={styles.sectionHeader}>
        <Text variant="titleSmall" weight="800" color="#1E293B">
          🛡️ {t("parent.privacyTitle")}
        </Text>
      </View>

      <KokiCard variant="normal" padding="md" style={styles.card}>
        <Text variant="bodySmall" weight="600" color="#475569" style={{ lineHeight: 22 }}>
          {t("parent.privacyDesc")}
        </Text>
        <View style={styles.privacyTagsRow}>
          <View style={styles.privacyTag}>
            <Text variant="caption" weight="800" color="#047857">
              ✓ 100% On-Device
            </Text>
          </View>
          <View style={styles.privacyTag}>
            <Text variant="caption" weight="800" color="#047857">
              ✓ No Account Required
            </Text>
          </View>
          <View style={styles.privacyTag}>
            <Text variant="caption" weight="800" color="#047857">
              ✓ Zero Trackers
            </Text>
          </View>
        </View>
      </KokiCard>

      {/* 5. Danger Zone: Delete Child Profile */}
      <View style={styles.sectionHeader}>
        <Text variant="titleSmall" weight="800" color="#EF4444">
          ⚠️ {t("parent.deleteProfile")}
        </Text>
      </View>

      <KokiCard variant="outlined" padding="md" style={styles.dangerCard}>
        <Text variant="bodySmall" weight="600" color="#64748B" style={{ marginBottom: Spacing.sm }}>
          {t("parent.deleteProfileDesc")}
        </Text>
        <KokiButton
          variant="secondary"
          title={t("parent.deleteProfile")}
          onPress={() => {
            setConfirmInput("");
            setDeleteModalVisible(true);
          }}
          fullWidth={true}
        />
      </KokiCard>

      {/* Pre-Permission Explanation Modal */}
      <Modal
        visible={explanationModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setExplanationModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setExplanationModalVisible(false)}
        >
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.permissionIconBadge}>
              <Text style={styles.deleteIconEmoji}>⏰</Text>
            </View>

            <Text variant="title" weight="800" align="center" color="#1E293B">
              {isKm ? "ការរំលឹកការរៀនសុភាពរាបសារ" : "Gentle Learning Reminders"}
            </Text>

            <Text
              variant="bodySmall"
              weight="600"
              align="center"
              color="#475569"
              style={styles.modalWarningText}
            >
              {isKm
                ? "Koki អាចផ្ញើការរំលឹកសុភាពរាបសារតែ ១ ដងក្នុងមួយថ្ងៃ ដើម្បីលើកទឹកចិត្តកូនរបស់អ្នកឱ្យបន្តដំណើរផ្សងព្រេង។\n\n• គ្មានការគំរាមបាត់បង់ពិន្ទុ (No guilt)\n• គ្មានការផ្សាយពាណិជ្ជកម្ម\n• ដំណើរការលើទូរស័ព្ទផ្ទាល់ (Privacy-first)"
                : "Koki can send a positive, gentle reminder once a day to invite your child back to continue their adventure.\n\n• No streak expiration guilt or pressure\n• No ads or marketing spam\n• 100% on-device & private"}
            </Text>

            <View style={styles.modalButtonsRow}>
              <Pressable
                onPress={() => setExplanationModalVisible(false)}
                style={styles.cancelModalButton}
                accessibilityRole="button"
              >
                <Text variant="bodySmall" weight="800" color="#64748B">
                  {isKm ? "ពេលក្រោយ" : "Not Now"}
                </Text>
              </Pressable>

              <Pressable
                onPress={handleConfirmEnablePermission}
                style={styles.confirmPermissionButton}
                accessibilityRole="button"
              >
                <Text variant="bodySmall" weight="800" color="#FFFFFF">
                  {isKm ? "អនុញ្ញាត" : "Allow"}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Destructive Deletion Confirmation Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setDeleteModalVisible(false)}
        >
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.deleteIconBadge}>
              <Text style={styles.deleteIconEmoji}>🗑️</Text>
            </View>

            <Text variant="title" weight="800" align="center" color="#1E293B">
              {t("parent.deleteModalTitle")}
            </Text>

            <Text
              variant="bodySmall"
              weight="600"
              align="center"
              color="#64748B"
              style={styles.modalWarningText}
            >
              {t("parent.deleteModalWarning")}
            </Text>

            <Text variant="caption" weight="800" color="#1E293B" style={{ marginBottom: 6 }}>
              {t("parent.deleteConfirmType")}
            </Text>

            <TextInput
              value={confirmInput}
              onChangeText={setConfirmInput}
              placeholder="DELETE"
              placeholderTextColor="#94A3B8"
              autoCapitalize="characters"
              autoCorrect={false}
              style={styles.confirmTextInput}
            />

            <View style={styles.modalButtonsRow}>
              <Pressable
                onPress={() => setDeleteModalVisible(false)}
                style={styles.cancelModalButton}
                accessibilityRole="button"
              >
                <Text variant="bodySmall" weight="800" color="#64748B">
                  {t("parent.cancel")}
                </Text>
              </Pressable>

              <Pressable
                onPress={handleConfirmDelete}
                disabled={!isConfirmed || isDeleting}
                style={[
                  styles.confirmDeleteButton,
                  (!isConfirmed || isDeleting) && styles.confirmDeleteButtonDisabled,
                ]}
                accessibilityRole="button"
              >
                <Text variant="bodySmall" weight="800" color="#FFFFFF">
                  {isDeleting ? "..." : t("parent.deleteButtonConfirm")}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: Spacing.xl,
  },
  sectionHeader: {
    marginTop: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  card: {
    backgroundColor: Palette.pureWhite,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    marginBottom: Spacing.md,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.xs,
  },
  settingTextCol: {
    flex: 1,
    paddingRight: Spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: Spacing.xs,
  },
  privacyTagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: Spacing.sm,
  },
  privacyTag: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  dangerCard: {
    backgroundColor: "#FFF5F5",
    borderColor: "#FECACA",
    marginBottom: Spacing.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.md,
  },
  modalCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: Palette.pureWhite,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FECACA",
    borderBottomWidth: 5,
    borderBottomColor: "#FCA5A5",
  },
  deleteIconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  deleteIconEmoji: {
    fontSize: 28,
  },
  modalWarningText: {
    lineHeight: 20,
    marginVertical: Spacing.sm,
  },
  confirmTextInput: {
    width: "100%",
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 10,
    fontSize: 16,
    color: "#1E293B",
    fontFamily: "KantumruyPro_700Bold",
    textAlign: "center",
    letterSpacing: 1.5,
    marginBottom: Spacing.md,
  },
  modalButtonsRow: {
    flexDirection: "row",
    width: "100%",
    gap: Spacing.sm,
  },
  cancelModalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.md,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  confirmDeleteButton: {
    flex: 1.5,
    paddingVertical: 12,
    borderRadius: Radius.md,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
  },
  confirmDeleteButtonDisabled: {
    backgroundColor: "#CBD5E1",
  },
  deniedBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginTop: Spacing.sm,
  },
  openSettingsButton: {
    backgroundColor: "#D97706",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.pill,
  },
  timeSection: {
    paddingTop: Spacing.xs,
  },
  timeHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.xs,
  },
  timeBadge: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  presetsRow: {
    flexDirection: "column",
    gap: 6,
    marginTop: 4,
  },
  presetPill: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: Radius.md,
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },
  presetPillSelected: {
    backgroundColor: "#EFF6FF",
    borderColor: "#3B82F6",
  },
  testRow: {
    marginTop: Spacing.sm,
    alignItems: "center",
  },
  testButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: Radius.pill,
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  testButtonSent: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
  },
  permissionIconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  confirmPermissionButton: {
    flex: 1.5,
    paddingVertical: 12,
    borderRadius: Radius.md,
    backgroundColor: "#3B82F6",
    alignItems: "center",
    justifyContent: "center",
  },
});
