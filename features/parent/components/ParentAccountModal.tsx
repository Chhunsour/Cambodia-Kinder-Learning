import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Modal,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Text } from "@/components/ui/Text";
import { KokiCard } from "@/components/ui/KokiCard";
import { KokiButton } from "@/components/ui/KokiButton";
import { GameIconButton } from "@/components/ui/GameIconButton";
import { useLocalization } from "@/hooks/useLocalization";
import { useParentAccount } from "@/hooks/useParentAccount";
import { ChildProfile } from "@/types/user";
import { Palette } from "@/constants/theme";
import { Spacing, Radius } from "@/constants/spacing";

interface ParentAccountModalProps {
  visible: boolean;
  onClose: () => void;
  profile: ChildProfile | null;
}

export const ParentAccountModal: React.FC<ParentAccountModalProps> = ({
  visible,
  onClose,
  profile,
}) => {
  const { locale, t } = useLocalization();
  const isKm = locale === "km";
  const {
    status,
    email,
    isBound,
    bindingInfo,
    signIn,
    signUp,
    signOut,
    bindCurrentProfile,
    restoreCloudChild,
    mergeWithCloudChild,
    existingCloudChildren,
    failedSyncCount,
    retryFailedSync,
    syncNow,
    deleteAccount,
  } = useParentAccount();

  // Auth Form Mode
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [inputEmail, setInputEmail] = useState("");
  const [inputPassword, setInputPassword] = useState("");
  const [inputConfirmPassword, setInputConfirmPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Sync / Bind state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [existingDataWarning, setExistingDataWarning] = useState<string | null>(null);

  // Parent Account Deletion state
  const [deleteAccountModalVisible, setDeleteAccountModalVisible] = useState(false);
  const [deleteAccountConfirmText, setDeleteAccountConfirmText] = useState("");
  const [preserveLocalData, setPreserveLocalData] = useState(true);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const resetForm = () => {
    setInputEmail("");
    setInputPassword("");
    setInputConfirmPassword("");
    setAuthError(null);
    setSyncFeedback(null);
    setExistingDataWarning(null);
    setDeleteAccountConfirmText("");
    setDeleteAccountModalVisible(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleDeleteAccount = async () => {
    if (deleteAccountConfirmText.trim().toUpperCase() !== "DELETE ACCOUNT") return;
    setIsDeletingAccount(true);
    const res = await deleteAccount(preserveLocalData);
    setIsDeletingAccount(false);
    if (res.success) {
      setDeleteAccountModalVisible(false);
      setDeleteAccountConfirmText("");
      setSyncFeedback(
        isKm
          ? "គណនី និងទិន្នន័យលើក្លោដត្រូវបានលុបជោគជ័យ។"
          : "Parent account and cloud data permanently deleted."
      );
      setTimeout(() => {
        setSyncFeedback(null);
        handleClose();
      }, 1500);
    } else {
      setAuthError(res.error || (isKm ? "មិនអាចលុបគណនីបានទេ។" : "Failed to delete account."));
      setDeleteAccountModalVisible(false);
    }
  };

  const handleSignIn = async () => {
    if (!inputEmail.trim() || !inputPassword.trim()) {
      setAuthError(isKm ? "សូមបញ្ចូលអ៊ីមែល និងពាក្យសម្ងាត់។" : "Please enter both email and password.");
      return;
    }

    setAuthLoading(true);
    setAuthError(null);

    const res = await signIn(inputEmail, inputPassword);
    setAuthLoading(false);

    if (!res.success) {
      setAuthError(res.error || "Sign in failed.");
    }
  };

  const handleSignUp = async () => {
    if (!inputEmail.trim() || !inputPassword.trim()) {
      setAuthError(isKm ? "សូមបញ្ចូលអ៊ីមែល និងពាក្យសម្ងាត់។" : "Please enter email and password.");
      return;
    }

    if (inputPassword.length < 6) {
      setAuthError(t("parent.passwordTooShort"));
      return;
    }

    if (inputPassword !== inputConfirmPassword) {
      setAuthError(t("parent.passwordsDoNotMatch"));
      return;
    }

    setAuthLoading(true);
    setAuthError(null);

    const res = await signUp(inputEmail, inputPassword);
    setAuthLoading(false);

    if (!res.success) {
      setAuthError(res.error || "Sign up failed.");
    }
  };

  const handleBindChild = async () => {
    if (!profile?.id) return;
    setIsSyncing(true);
    setAuthError(null);
    setExistingDataWarning(null);

    const res = await bindCurrentProfile();
    setIsSyncing(false);

    if (res.existingCloudDataFound) {
      setExistingDataWarning(t("parent.existingCloudDataDesc"));
    } else if (!res.success) {
      setAuthError(res.error || "Failed to bind profile.");
    } else {
      setSyncFeedback(t("parent.syncSuccess"));
      setTimeout(() => setSyncFeedback(null), 3500);
    }
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    setAuthError(null);

    const res = await syncNow();
    setIsSyncing(false);

    if (res.success) {
      setSyncFeedback(t("parent.syncSuccess"));
      setTimeout(() => setSyncFeedback(null), 3500);
    } else {
      setAuthError(res.error || "Sync failed.");
    }
  };

  const handleSignOut = async () => {
    await signOut();
    resetForm();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleCol}>
              <Text variant="title" weight="800" color="#1E293B">
                {t("parent.accountModalTitle")}
              </Text>
              <Text variant="caption" weight="600" color="#64748B">
                {profile?.nickname ? `${profile.nickname}` : "Koki"}
              </Text>
            </View>
            <GameIconButton
              type="close"
              color="cream"
              size="compact"
              onPress={handleClose}
              accessibilityLabel="Close account modal"
            />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Feedback Banners */}
            {syncFeedback && (
              <View style={styles.successBanner}>
                <Text variant="caption" weight="800" color="#047857">
                  ✓ {syncFeedback}
                </Text>
              </View>
            )}

            {authError && (
              <View style={styles.errorBanner}>
                <Text variant="caption" weight="700" color="#DC2626">
                  ⚠️ {authError}
                </Text>
              </View>
            )}

            {/* ============================================================ */}
            {/* CASE 1: AUTHENTICATED & BOUND                                */}
            {/* ============================================================ */}
            {status === "authenticated" && isBound && (
              <View style={styles.cardWrapper}>
                <KokiCard variant="elevated" padding="md" style={styles.card}>
                  <View style={styles.badgeRow}>
                    <View style={styles.statusBadgeGreen}>
                      <Text variant="caption" weight="800" color="#047857">
                        ✓ {t("parent.syncStatusBound")}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.infoRow}>
                    <Text variant="caption" weight="700" color="#64748B">
                      {isKm ? "គណនីអាណាព្យាបាល៖" : "Parent Account:"}
                    </Text>
                    <Text variant="bodySmall" weight="800" color="#1E293B">
                      {email}
                    </Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Text variant="caption" weight="700" color="#64748B">
                      {isKm ? "កុមារដែលបានភ្ជាប់៖" : "Linked Child:"}
                    </Text>
                    <Text variant="bodySmall" weight="800" color="#1E293B">
                      {profile?.nickname}
                    </Text>
                  </View>

                  {bindingInfo?.last_sync_at ? (
                    <View style={styles.infoRow}>
                      <Text variant="caption" weight="700" color="#64748B">
                        {t("parent.syncLastSynced")}:
                      </Text>
                      <Text variant="caption" weight="800" color="#475569">
                        {new Date(bindingInfo.last_sync_at).toLocaleDateString(
                          isKm ? "km-KH" : "en-US",
                          { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }
                        )}
                      </Text>
                    </View>
                  ) : null}

                  {failedSyncCount > 0 ? (
                    <View style={[styles.warningBox, { marginBottom: Spacing.sm }]}>
                      <Text variant="caption" weight="800" color="#B45309">
                        ⚠️ {t("parent.syncStatusNeedsAttention")} ({failedSyncCount})
                      </Text>
                      <KokiButton
                        variant="secondary"
                        title={`🔄 ${t("parent.retryFailed")}`}
                        onPress={retryFailedSync}
                        disabled={isSyncing}
                        style={{ marginTop: Spacing.xs }}
                        fullWidth={true}
                      />
                    </View>
                  ) : null}

                  <View style={styles.buttonGroup}>
                    <KokiButton
                      variant="primary"
                      title={isSyncing ? t("parent.syncing") : `☁️ ${t("parent.syncNow")}`}
                      onPress={handleSyncNow}
                      disabled={isSyncing}
                      fullWidth={true}
                    />

                    <KokiButton
                      variant="ghost"
                      title={t("parent.signOut")}
                      onPress={handleSignOut}
                      fullWidth={true}
                    />
                  </View>
                  <Text variant="caption" align="center" color="#94A3B8" style={{ marginTop: 4 }}>
                    {t("parent.signOutNotice")}
                  </Text>
                </KokiCard>

                {/* Danger Zone: Delete Parent Account */}
                <KokiCard variant="outlined" padding="md" style={styles.dangerCard}>
                  <Text variant="bodySmall" weight="800" color="#EF4444" style={{ marginBottom: 4 }}>
                    ⚠️ {isKm ? "លុបគណនីអាណាព្យាបាល" : "Delete Parent Account"}
                  </Text>
                  <Text variant="caption" color="#64748B" style={{ marginBottom: Spacing.sm }}>
                    {isKm
                      ? "លុបទិន្នន័យបម្រុងទុក និងគណនីទាំងអស់នៅលើក្លោដជាអចិន្ត្រៃយ៍។"
                      : "Permanently delete your parent account and all cloud sync backups from our servers."}
                  </Text>
                  <KokiButton
                    variant="secondary"
                    title={`🗑️ ${isKm ? "លុបគណនីលើក្លោដ..." : "Delete Parent Account..."}`}
                    onPress={() => {
                      setDeleteAccountConfirmText("");
                      setPreserveLocalData(true);
                      setDeleteAccountModalVisible(true);
                    }}
                    fullWidth={true}
                  />
                </KokiCard>
              </View>
            )}

            {/* ============================================================ */}
            {/* CASE 2: AUTHENTICATED & NOT YET BOUND                        */}
            {/* ============================================================ */}
            {status === "authenticated" && !isBound && (
              <View style={styles.cardWrapper}>
                <KokiCard variant="elevated" padding="md" style={styles.card}>
                  <Text variant="titleSmall" weight="800" color="#1E293B">
                    🛡️ {t("parent.bindPromptTitle").replace("{name}", profile?.nickname || "Koki")}
                  </Text>
                  <Text variant="bodySmall" color="#64748B" style={{ marginTop: 4, marginBottom: Spacing.md }}>
                    {t("parent.bindPromptDesc")}
                  </Text>

                  {existingDataWarning || existingCloudChildren.length > 0 ? (
                    <View style={styles.warningBox}>
                      <Text variant="caption" weight="800" color="#B45309">
                        ☁️ {t("parent.conflictModalTitle")}
                      </Text>
                      <Text variant="caption" color="#92400E" style={{ marginTop: 2, marginBottom: Spacing.sm }}>
                        {t("parent.conflictModalDesc")}
                      </Text>

                      {existingCloudChildren.map((cloudChild) => (
                        <View
                          key={cloudChild.id}
                          style={{
                            marginBottom: Spacing.sm,
                            padding: Spacing.sm,
                            backgroundColor: "#FEF3C7",
                            borderRadius: Radius.md,
                            borderWidth: 1,
                            borderColor: "#FDE68A",
                          }}
                        >
                          <Text variant="bodySmall" weight="800" color="#78350F">
                            🧒 {cloudChild.nickname} ({cloudChild.age} {isKm ? "ឆ្នាំ" : "yrs"})
                          </Text>
                          <View style={{ flexDirection: "row", gap: 8, marginTop: Spacing.xs }}>
                            <KokiButton
                              variant="primary"
                              title={`⬇️ ${t("parent.conflictOptionRestore")}`}
                              onPress={async () => {
                                setIsSyncing(true);
                                setAuthError(null);
                                const res = await restoreCloudChild(cloudChild.id);
                                setIsSyncing(false);
                                if (res.success) {
                                  setSyncFeedback(t("parent.syncSuccess"));
                                  setTimeout(() => setSyncFeedback(null), 3500);
                                } else {
                                  setAuthError(res.error || "Restore failed");
                                }
                              }}
                              disabled={isSyncing}
                              style={{ flex: 1 }}
                            />
                            <KokiButton
                              variant="secondary"
                              title={`🔀 ${t("parent.conflictOptionMerge")}`}
                              onPress={async () => {
                                setIsSyncing(true);
                                setAuthError(null);
                                const res = await mergeWithCloudChild(cloudChild.id);
                                setIsSyncing(false);
                                if (res.success) {
                                  setSyncFeedback(t("parent.syncSuccess"));
                                  setTimeout(() => setSyncFeedback(null), 3500);
                                } else {
                                  setAuthError(res.error || "Merge failed");
                                }
                              }}
                              disabled={isSyncing}
                              style={{ flex: 1 }}
                            />
                          </View>
                        </View>
                      ))}

                      <KokiButton
                        variant="ghost"
                        title={`📱 ${t("parent.conflictOptionKeep")}`}
                        onPress={async () => {
                          setIsSyncing(true);
                          setAuthError(null);
                          const res = await bindCurrentProfile(true);
                          setIsSyncing(false);
                          if (res.success) {
                            setSyncFeedback(t("parent.syncSuccess"));
                            setTimeout(() => setSyncFeedback(null), 3500);
                          } else {
                            setAuthError(res.error || "Failed to keep local profile");
                          }
                        }}
                        disabled={isSyncing}
                        fullWidth={true}
                        style={{ marginTop: Spacing.xs }}
                      />
                    </View>
                  ) : (
                    <View style={styles.buttonGroup}>
                      <KokiButton
                        variant="primary"
                        title={isSyncing ? t("parent.syncing") : `✓ ${t("parent.bindConfirmButton")}`}
                        onPress={handleBindChild}
                        disabled={isSyncing}
                        fullWidth={true}
                      />

                      <KokiButton
                        variant="ghost"
                        title={t("parent.signOut")}
                        onPress={handleSignOut}
                        fullWidth={true}
                      />
                    </View>
                  )}
                </KokiCard>

                {/* Danger Zone: Delete Parent Account */}
                <KokiCard variant="outlined" padding="md" style={styles.dangerCard}>
                  <Text variant="bodySmall" weight="800" color="#EF4444" style={{ marginBottom: 4 }}>
                    ⚠️ {isKm ? "លុបគណនីអាណាព្យាបាល" : "Delete Parent Account"}
                  </Text>
                  <Text variant="caption" color="#64748B" style={{ marginBottom: Spacing.sm }}>
                    {isKm
                      ? "លុបទិន្នន័យបម្រុងទុក និងគណនីទាំងអស់នៅលើក្លោដជាអចិន្ត្រៃយ៍។"
                      : "Permanently delete your parent account and all cloud sync backups from our servers."}
                  </Text>
                  <KokiButton
                    variant="secondary"
                    title={`🗑️ ${isKm ? "លុបគណនីលើក្លោដ..." : "Delete Parent Account..."}`}
                    onPress={() => {
                      setDeleteAccountConfirmText("");
                      setPreserveLocalData(true);
                      setDeleteAccountModalVisible(true);
                    }}
                    fullWidth={true}
                  />
                </KokiCard>
              </View>
            )}

            {/* ============================================================ */}
            {/* CASE 3: UNCONFIRMED EMAIL BANNER                             */}
            {/* ============================================================ */}
            {status === "unconfirmed_email" && (
              <KokiCard variant="normal" padding="md" style={styles.card}>
                <Text variant="titleSmall" weight="800" color="#1E293B">
                  ✉️ {t("parent.checkEmailTitle")}
                </Text>
                <Text variant="bodySmall" color="#475569" style={{ marginVertical: Spacing.sm }}>
                  {t("parent.checkEmailDesc")}
                </Text>
                <KokiButton
                  variant="secondary"
                  title={t("parent.signInTab")}
                  onPress={() => setAuthMode("signin")}
                  fullWidth={true}
                />
              </KokiCard>
            )}

            {/* ============================================================ */}
            {/* CASE 4: GUEST (SIGN IN / CREATE ACCOUNT FORM)                */}
            {/* ============================================================ */}
            {status === "guest" && (
              <View style={styles.cardWrapper}>
                {/* Segmented Mode Selector */}
                <View style={styles.tabToggle}>
                  <Pressable
                    onPress={() => {
                      setAuthMode("signin");
                      setAuthError(null);
                    }}
                    style={[
                      styles.toggleButton,
                      authMode === "signin" && styles.toggleButtonActive,
                    ]}
                  >
                    <Text
                      variant="bodySmall"
                      weight="800"
                      color={authMode === "signin" ? "#1E293B" : "#64748B"}
                    >
                      {t("parent.signInTab")}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      setAuthMode("signup");
                      setAuthError(null);
                    }}
                    style={[
                      styles.toggleButton,
                      authMode === "signup" && styles.toggleButtonActive,
                    ]}
                  >
                    <Text
                      variant="bodySmall"
                      weight="800"
                      color={authMode === "signup" ? "#1E293B" : "#64748B"}
                    >
                      {t("parent.createAccountTab")}
                    </Text>
                  </Pressable>
                </View>

                {/* Input Fields */}
                <KokiCard variant="normal" padding="md" style={styles.card}>
                  <Text variant="caption" weight="700" color="#475569" style={styles.fieldLabel}>
                    ✉️ {t("parent.parentEmail")}
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={inputEmail}
                    onChangeText={setInputEmail}
                    placeholder={t("parent.parentEmailPlaceholder")}
                    placeholderTextColor="#94A3B8"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />

                  <Text
                    variant="caption"
                    weight="700"
                    color="#475569"
                    style={[styles.fieldLabel, { marginTop: Spacing.md }]}
                  >
                    🔒 {t("parent.password")}
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={inputPassword}
                    onChangeText={setInputPassword}
                    placeholder={t("parent.passwordPlaceholder")}
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={true}
                    autoCapitalize="none"
                  />

                  {authMode === "signup" && (
                    <>
                      <Text
                        variant="caption"
                        weight="700"
                        color="#475569"
                        style={[styles.fieldLabel, { marginTop: Spacing.md }]}
                      >
                        🔒 {t("parent.confirmPassword")}
                      </Text>
                      <TextInput
                        style={styles.input}
                        value={inputConfirmPassword}
                        onChangeText={setInputConfirmPassword}
                        placeholder={t("parent.confirmPasswordPlaceholder")}
                        placeholderTextColor="#94A3B8"
                        secureTextEntry={true}
                        autoCapitalize="none"
                      />
                    </>
                  )}

                  <View style={{ marginTop: Spacing.lg }}>
                    <KokiButton
                      variant="primary"
                      title={
                        authLoading
                          ? (isKm ? "កំពុងដំណើរការ..." : "Processing...")
                          : authMode === "signin"
                          ? t("parent.signInButton")
                          : t("parent.createAccountButton")
                      }
                      onPress={authMode === "signin" ? handleSignIn : handleSignUp}
                      disabled={authLoading}
                      fullWidth={true}
                    />
                  </View>

                  <Text variant="caption" align="center" color="#94A3B8" style={{ marginTop: Spacing.sm }}>
                    {isKm
                      ? "គណនីនេះសម្រាប់តែអាណាព្យាបាលប៉ុណ្ណោះ។ មិនទាមទារព័ត៌មានផ្ទាល់ខ្លួនរបស់កុមារឡើយ។"
                      : "This account is for parents only. No personal child information is requested."}
                  </Text>
                </KokiCard>
              </View>
            )}
          </ScrollView>
        </View>
      </View>

      {/* Account Deletion Confirmation Modal */}
      <Modal
        visible={deleteAccountModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteAccountModalVisible(false)}
      >
        <Pressable
          style={styles.deleteModalOverlay}
          onPress={() => setDeleteAccountModalVisible(false)}
        >
          <Pressable style={styles.deleteModalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.deleteIconBadge}>
              <Text style={{ fontSize: 28 }}>🗑️</Text>
            </View>

            <Text variant="title" weight="800" align="center" color="#1E293B">
              {isKm ? "លុបគណនីអាណាព្យាបាល?" : "Delete Parent Account?"}
            </Text>

            <Text
              variant="bodySmall"
              weight="600"
              align="center"
              color="#64748B"
              style={{ marginVertical: Spacing.sm, lineHeight: 20 }}
            >
              {isKm
                ? "ការលុបគណនីនេះ នឹងលុបទិន្នន័យបម្រុងទុកទាំងអស់នៅលើក្លោដជាអចិន្ត្រៃយ៍ និងមិនអាចត្រឡប់វិញបានទេ។"
                : "This action will permanently delete your parent account and all cloud backups from our servers. This cannot be undone."}
            </Text>

            {/* Choice: Preserve local data as guest */}
            <Pressable
              style={styles.preserveOptionRow}
              onPress={() => setPreserveLocalData(!preserveLocalData)}
            >
              <View style={[styles.checkbox, preserveLocalData && styles.checkboxActive]}>
                {preserveLocalData && (
                  <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "900" }}>✓</Text>
                )}
              </View>
              <Text variant="caption" weight="700" color="#334155" style={{ flex: 1, marginLeft: 8 }}>
                {isKm
                  ? "រក្សាទុកដំណើរការរៀនសូត្រនៅលើទូរស័ព្ទនេះ (ជាគណនីភ្ញៀវ)"
                  : "Keep learning progress on this device (as guest profile)"}
              </Text>
            </Pressable>

            <Text variant="caption" weight="800" color="#1E293B" style={{ alignSelf: "flex-start", marginBottom: 6, marginTop: Spacing.sm }}>
              {isKm
                ? "វាយអក្សរ \"DELETE ACCOUNT\" ដើម្បីបញ្ជាក់:"
                : 'Type "DELETE ACCOUNT" to confirm:'}
            </Text>

            <TextInput
              value={deleteAccountConfirmText}
              onChangeText={setDeleteAccountConfirmText}
              placeholder="DELETE ACCOUNT"
              placeholderTextColor="#94A3B8"
              autoCapitalize="characters"
              autoCorrect={false}
              style={styles.confirmTextInput}
            />

            <View style={styles.modalButtonsRow}>
              <Pressable
                onPress={() => setDeleteAccountModalVisible(false)}
                style={styles.cancelModalButton}
                accessibilityRole="button"
              >
                <Text variant="bodySmall" weight="800" color="#64748B">
                  {t("parent.cancel")}
                </Text>
              </Pressable>

              <Pressable
                onPress={handleDeleteAccount}
                disabled={
                  deleteAccountConfirmText.trim().toUpperCase() !== "DELETE ACCOUNT" ||
                  isDeletingAccount
                }
                style={[
                  styles.confirmDeleteButton,
                  (deleteAccountConfirmText.trim().toUpperCase() !== "DELETE ACCOUNT" ||
                    isDeletingAccount) && styles.confirmDeleteButtonDisabled,
                ]}
                accessibilityRole="button"
              >
                <Text variant="bodySmall" weight="800" color="#FFFFFF">
                  {isDeletingAccount ? "..." : (isKm ? "លុបគណនី" : "Delete Account")}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    padding: Spacing.md,
  },
  container: {
    backgroundColor: "#F8FAFC",
    borderRadius: Radius.xl,
    maxHeight: "90%",
    maxWidth: 540,
    width: "100%",
    alignSelf: "center",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  headerTitleCol: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  cardWrapper: {
    width: "100%",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: Radius.lg,
  },
  successBanner: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  errorBanner: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  warningBox: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  badgeRow: {
    flexDirection: "row",
    marginBottom: Spacing.md,
  },
  statusBadgeGreen: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  buttonGroup: {
    marginTop: Spacing.lg,
    gap: Spacing.xs,
  },
  tabToggle: {
    flexDirection: "row",
    backgroundColor: "#E2E8F0",
    borderRadius: Radius.lg,
    padding: 3,
    marginBottom: Spacing.md,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: Spacing.xs + 2,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.md,
  },
  toggleButtonActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  fieldLabel: {
    marginBottom: 4,
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 15,
    color: "#1E293B",
  },
  dangerCard: {
    backgroundColor: "#FFF5F5",
    borderColor: "#FECACA",
    marginTop: Spacing.md,
  },
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.md,
  },
  deleteModalCard: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#FFFFFF",
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
  preserveOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: Radius.md,
    padding: Spacing.sm,
    width: "100%",
    marginVertical: Spacing.xs,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#94A3B8",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  checkboxActive: {
    backgroundColor: "#3B82F6",
    borderColor: "#2563EB",
  },
  confirmTextInput: {
    width: "100%",
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 10,
    fontSize: 15,
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
});
