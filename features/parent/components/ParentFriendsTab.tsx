import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  Modal,
  Alert,
  Share,
  ActivityIndicator,
} from "react-native";
import { Text } from "@/components/ui/Text";
import { KokiCard } from "@/components/ui/KokiCard";
import { KokiButton } from "@/components/ui/KokiButton";
import { useLocalization } from "@/hooks/useLocalization";
import { useParentAccount } from "@/hooks/useParentAccount";
import { ParentAccountModal } from "./ParentAccountModal";
import { FriendService } from "../services/friendService";
import {
  isValidFriendCodeFormat,
  normalizeFriendCode,
} from "../services/friendCodeGenerator";
import {
  MinimalFriendChild,
  FriendItem,
  IncomingFriendRequest,
  OutgoingFriendRequest,
} from "@/lib/supabase/types";
import { BUILT_IN_AVATARS } from "@/constants/avatars";
import { networkMonitor } from "@/lib/network/networkMonitor";
import { ChildProfile } from "@/types/user";
import { Palette } from "@/constants/theme";
import { Spacing, Radius } from "@/constants/spacing";

interface ParentFriendsTabProps {
  profile: ChildProfile | null;
}

function getAvatarEmoji(avatarId?: string | null): string {
  const found = BUILT_IN_AVATARS.find((a) => a.id === avatarId);
  return found?.emoji || "🐯";
}

/**
 * ParentFriendsTab
 *
 * Dedicated tab in the Parent Area for managing child friendships safely:
 * - Displays child's private friend code (KOKI-XXXXXX)
 * - Copy / Share code directly to other known parents
 * - Rotate code (invalidates old code without breaking existing friendships)
 * - Add a friend by code (pre-lookup minimal preview, parent confirmation)
 * - Review incoming friend requests (Accept / Decline)
 * - Review outgoing pending requests (Cancel)
 * - View existing friends list with safe friend removal
 * - Offline cached view & guest binding guard
 */
export const ParentFriendsTab: React.FC<ParentFriendsTabProps> = ({ profile }) => {
  const { locale, t } = useLocalization();
  const isKm = locale === "km";

  const { isBound, bindingInfo } = useParentAccount();
  const cloudChildId = bindingInfo?.cloud_child_id;

  // Cloud & data state
  const [friendCode, setFriendCode] = useState<string | null>(null);
  const [incomingRequests, setIncomingRequests] = useState<IncomingFriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<OutgoingFriendRequest[]>([]);
  const [friendsList, setFriendsList] = useState<FriendItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(() => networkMonitor.isOnline());

  // Input & lookup state
  const [inputCode, setInputCode] = useState("");
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [foundChild, setFoundChild] = useState<MinimalFriendChild | null>(null);
  const [lookupModalVisible, setLookupModalVisible] = useState(false);
  const [isSendingRequest, setIsSendingRequest] = useState(false);

  // Rotate code state
  const [rotateModalVisible, setRotateModalVisible] = useState(false);
  const [isRotating, setIsRotating] = useState(false);

  // Remove friend state
  const [removeModalVisible, setRemoveModalVisible] = useState(false);
  const [friendToRemove, setFriendToRemove] = useState<FriendItem | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  // Account modal & feedback state
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Network monitor listener
  useEffect(() => {
    const unsub = networkMonitor.addConnectivityListener((online: boolean) => {
      setIsOnline(online);
    });
    return unsub;
  }, []);

  // Format error helper
  const translateErrorCode = useCallback(
    (code?: string): string => {
      switch (code) {
        case "INVALID_FORMAT":
        case "INVALID_CODE":
          return t("parent.errorInvalidCode");
        case "ALREADY_FRIENDS":
          return t("parent.errorAlreadyFriends");
        case "CANNOT_FRIEND_SELF":
          return t("parent.errorCannotFriendSelf");
        case "REQUEST_ALREADY_PENDING":
          return t("parent.errorRequestAlreadyPending");
        case "CODE_NOT_FOUND":
          return t("parent.errorLookupFailed");
        case "OFFLINE":
          return t("parent.errorNetworkRequired");
        default:
          return code || (isKm ? "មានបញ្ហា។ សូមព្យាយាមម្តងទៀត។" : "An error occurred. Please try again.");
      }
    },
    [t, isKm]
  );

  // Load friends data
  const loadData = useCallback(async () => {
    if (!cloudChildId) return;

    setIsLoading(true);
    try {
      if (networkMonitor.isOnline()) {
        const [codeRes, inc, out, friends] = await Promise.all([
          FriendService.getOrCreateFriendCode(cloudChildId),
          FriendService.getIncomingRequests(cloudChildId),
          FriendService.getOutgoingRequests(cloudChildId),
          FriendService.getFriendsList(cloudChildId),
        ]);

        if (codeRes.success && codeRes.code) {
          setFriendCode(codeRes.code);
        }
        setIncomingRequests(inc);
        setOutgoingRequests(out);
        setFriendsList(friends);
      } else {
        // Offline: load cached friends
        const cached = await FriendService.getCachedFriendsList(cloudChildId);
        setFriendsList(cached);
      }
    } catch (err) {
      console.warn("[ParentFriendsTab] Error loading friends data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [cloudChildId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Share / Copy Code
  const handleShareCode = async () => {
    if (!friendCode) return;
    const msg = t("parent.shareMessage").replace("{code}", friendCode);
    try {
      await Share.share({
        message: msg,
        title: "Koki Friend Code",
      });
      setFeedback({ type: "success", text: t("parent.codeCopied") });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      console.warn("[ParentFriendsTab] Share error:", err);
    }
  };

  // Handle Rotate Code Confirmation
  const handleConfirmRotate = async () => {
    if (!cloudChildId || isRotating) return;

    try {
      setIsRotating(true);
      const res = await FriendService.rotateFriendCode(cloudChildId);
      setIsRotating(false);
      setRotateModalVisible(false);

      if (res.success && res.newCode) {
        setFriendCode(res.newCode);
        setFeedback({ type: "success", text: t("parent.codeRotatedSuccess") });
        setTimeout(() => setFeedback(null), 3500);
      } else {
        Alert.alert(
          isKm ? "មានបញ្ហា" : "Error",
          translateErrorCode(res.error)
        );
      }
    } catch (err) {
      setIsRotating(false);
      setRotateModalVisible(false);
      console.warn("[ParentFriendsTab] Rotate error:", err);
    }
  };

  // Handle Code Lookup
  const handleLookupCode = async () => {
    const trimmed = inputCode.trim();
    if (!trimmed) return;

    if (!isValidFriendCodeFormat(trimmed)) {
      Alert.alert(
        isKm ? "ទម្រង់មិនត្រឹមត្រូវ" : "Invalid Format",
        t("parent.errorInvalidCode")
      );
      return;
    }

    const normalized = normalizeFriendCode(trimmed);
    if (friendCode && normalized === normalizeFriendCode(friendCode)) {
      Alert.alert(
        isKm ? "មិនអាចបន្ថែមខ្លួនឯងបានទេ" : "Cannot Add Self",
        t("parent.errorCannotFriendSelf")
      );
      return;
    }

    try {
      setIsLookingUp(true);
      const res = await FriendService.lookupFriendCode(normalized);
      setIsLookingUp(false);

      if (res.success && res.child) {
        setFoundChild(res.child);
        setLookupModalVisible(true);
      } else {
        Alert.alert(
          isKm ? "រកមិនឃើញ" : "Not Found",
          translateErrorCode(res.error)
        );
      }
    } catch (err) {
      setIsLookingUp(false);
      console.warn("[ParentFriendsTab] Lookup error:", err);
    }
  };

  // Confirm Sending Friend Request
  const handleConfirmSendRequest = async () => {
    if (!cloudChildId || !foundChild || isSendingRequest) return;

    try {
      setIsSendingRequest(true);
      const res = await FriendService.sendFriendRequest(cloudChildId, inputCode);
      setIsSendingRequest(false);
      setLookupModalVisible(false);
      setInputCode("");

      if (res.success) {
        if (res.autoAccepted) {
          setFeedback({
            type: "success",
            text: t("parent.requestAcceptedSuccess"),
          });
        } else {
          setFeedback({
            type: "success",
            text: t("parent.requestSentSuccess").replace(
              "{name}",
              foundChild.nickname
            ),
          });
        }
        setTimeout(() => setFeedback(null), 3500);
        await loadData();
      } else {
        Alert.alert(
          isKm ? "មានបញ្ហា" : "Error",
          translateErrorCode(res.error)
        );
      }
    } catch (err) {
      setIsSendingRequest(false);
      setLookupModalVisible(false);
      console.warn("[ParentFriendsTab] Send request error:", err);
    }
  };

  // Accept incoming request
  const handleAcceptRequest = async (requestId: string) => {
    try {
      const res = await FriendService.acceptRequest(requestId);
      if (res.success) {
        setFeedback({
          type: "success",
          text: t("parent.requestAcceptedSuccess"),
        });
        setTimeout(() => setFeedback(null), 3500);
        await loadData();
      } else {
        Alert.alert(
          isKm ? "មានបញ្ហា" : "Error",
          translateErrorCode(res.error)
        );
      }
    } catch (err) {
      console.warn("[ParentFriendsTab] Accept error:", err);
    }
  };

  // Decline incoming request
  const handleDeclineRequest = async (requestId: string) => {
    try {
      const res = await FriendService.declineRequest(requestId);
      if (res.success) {
        await loadData();
      } else {
        Alert.alert(
          isKm ? "មានបញ្ហា" : "Error",
          translateErrorCode(res.error)
        );
      }
    } catch (err) {
      console.warn("[ParentFriendsTab] Decline error:", err);
    }
  };

  // Cancel outgoing request
  const handleCancelRequest = async (requestId: string) => {
    try {
      const res = await FriendService.cancelRequest(requestId);
      if (res.success) {
        await loadData();
      } else {
        Alert.alert(
          isKm ? "មានបញ្ហា" : "Error",
          translateErrorCode(res.error)
        );
      }
    } catch (err) {
      console.warn("[ParentFriendsTab] Cancel error:", err);
    }
  };

  // Remove mutual friend
  const handleConfirmRemove = async () => {
    if (!cloudChildId || !friendToRemove || isRemoving) return;

    try {
      setIsRemoving(true);
      const res = await FriendService.removeFriend(
        cloudChildId,
        friendToRemove.friend_id
      );
      setIsRemoving(false);
      setRemoveModalVisible(false);
      setFriendToRemove(null);

      if (res.success) {
        setFeedback({ type: "success", text: t("parent.friendRemovedSuccess") });
        setTimeout(() => setFeedback(null), 3000);
        await loadData();
      } else {
        Alert.alert(
          isKm ? "មានបញ្ហា" : "Error",
          translateErrorCode(res.error)
        );
      }
    } catch (err) {
      setIsRemoving(false);
      setRemoveModalVisible(false);
      console.warn("[ParentFriendsTab] Remove friend error:", err);
    }
  };

  // Guard: Unbound Guest Child Profile
  if (!isBound || !cloudChildId) {
    return (
      <View style={styles.container}>
        <KokiCard style={styles.unboundCard}>
          <Text variant="title" weight="800" color="#1E293B" style={styles.cardTitle}>
            🛡️ {t("parent.unboundNotice")}
          </Text>
          <Text variant="body" color="#64748B" style={styles.cardDesc}>
            {isKm
              ? "ដើម្បីការពារសុវត្ថិភាព និងភ្ជាប់ទំនាក់ទំនងជាមួយមិត្តភក្តិ សូមរក្សាទុកវឌ្ឍនភាពរបស់កូនទៅកាន់គណនីអាណាព្យាបាលជាមុនសិន។ ការរៀន និងលេងធម្មតាមិនរងផលប៉ះពាល់ទេ។"
              : "To keep connections private and safe, child profiles must be backed up to a parent account before using Friends. Local learning and offline play are never affected."}
          </Text>
          <KokiButton
            variant="primary"
            title={t("parent.unboundNoticeCTA")}
            onPress={() => setIsAccountModalOpen(true)}
            style={{ marginTop: Spacing.md }}
          />
        </KokiCard>

        <ParentAccountModal
          visible={isAccountModalOpen}
          onClose={() => setIsAccountModalOpen(false)}
          profile={profile}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Offline Alert Banner */}
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Text variant="caption" weight="700" color="#92400E">
            📡 {t("parent.offlineFriendsNotice")}
          </Text>
        </View>
      )}

      {/* Floating Feedback Banner */}
      {feedback && (
        <View
          style={[
            styles.feedbackBanner,
            feedback.type === "success"
              ? styles.feedbackSuccess
              : styles.feedbackError,
          ]}
        >
          <Text
            variant="bodySmall"
            weight="700"
            color={feedback.type === "success" ? "#065F46" : "#991B1B"}
          >
            {feedback.type === "success" ? "✓ " : "⚠️ "}
            {feedback.text}
          </Text>
        </View>
      )}

      {/* Section 1: My Child's Friend Code */}
      <KokiCard style={styles.sectionCard}>
        <View style={styles.headerRow}>
          <View style={styles.headerTextCol}>
            <Text variant="titleMedium" weight="800" color="#1E293B">
              🔑 {t("parent.myFriendCode")}
            </Text>
            <Text variant="caption" color="#64748B" style={{ marginTop: 2 }}>
              {t("parent.myFriendCodeDesc")}
            </Text>
          </View>
        </View>

        {/* Code Box */}
        <View style={styles.codeContainer}>
          {isLoading && !friendCode ? (
            <ActivityIndicator color={Palette.primaryOrange} size="small" />
          ) : (
            <Text
              variant="display"
              weight="800"
              color="#1E293B"
              style={styles.codeText}
              accessibilityLabel={`Friend code ${friendCode}`}
            >
              {friendCode || "------"}
            </Text>
          )}
        </View>

        {/* Actions for Code */}
        <View style={styles.codeActionsRow}>
          <KokiButton
            variant="primary"
            compact={true}
            title={`📋 ${t("parent.copyShareCode")}`}
            onPress={handleShareCode}
            disabled={!friendCode}
            style={{ flex: 1, marginRight: Spacing.sm }}
          />
          <KokiButton
            variant="secondary"
            compact={true}
            title={`🔄 ${t("parent.newCode")}`}
            onPress={() => setRotateModalVisible(true)}
            disabled={!isOnline}
            style={{ flex: 1 }}
          />
        </View>
      </KokiCard>

      {/* Section 2: Add a Friend */}
      <KokiCard style={styles.sectionCard}>
        <Text variant="titleMedium" weight="800" color="#1E293B">
          ➕ {t("parent.addFriend")}
        </Text>
        <Text variant="caption" color="#64748B" style={{ marginTop: 2, marginBottom: Spacing.md }}>
          {t("parent.addFriendDesc")}
        </Text>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={inputCode}
            onChangeText={(text) => setInputCode(text.toUpperCase())}
            placeholder={t("parent.enterCodePlaceholder")}
            placeholderTextColor="#94A3B8"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={12}
            editable={isOnline}
          />
          <KokiButton
            variant="green"
            compact={true}
            title={t("parent.lookupButton")}
            onPress={handleLookupCode}
            loading={isLookingUp}
            disabled={!isOnline || !inputCode.trim()}
            style={{ marginLeft: Spacing.sm }}
          />
        </View>
      </KokiCard>

      {/* Section 3: Pending Requests (Incoming & Outgoing) */}
      {(incomingRequests.length > 0 || outgoingRequests.length > 0) && (
        <KokiCard style={styles.sectionCard}>
          <Text variant="titleMedium" weight="800" color="#1E293B" style={{ marginBottom: Spacing.sm }}>
            ⏳ {t("parent.pendingRequests")}
          </Text>

          {/* Incoming requests */}
          {incomingRequests.length > 0 && (
            <View style={{ marginBottom: Spacing.md }}>
              <Text variant="bodySmall" weight="800" color="#0369A1" style={{ marginBottom: Spacing.xs }}>
                {t("parent.incomingRequests").replace(
                  "{count}",
                  String(incomingRequests.length)
                )}
              </Text>
              {incomingRequests.map((req) => (
                <View key={req.request_id} style={styles.requestCard}>
                  <View style={styles.requestAvatarCircle}>
                    <Text style={styles.avatarEmoji}>
                      {getAvatarEmoji(req.sender_avatar_id)}
                    </Text>
                  </View>
                  <View style={styles.requestInfo}>
                    <Text variant="body" weight="800" color="#1E293B">
                      {req.sender_nickname}
                    </Text>
                    <Text variant="caption" color="#64748B">
                      {t("parent.incomingDesc")}
                    </Text>
                  </View>
                  <View style={styles.requestActions}>
                    <Pressable
                      style={[styles.smallBtn, styles.acceptBtn]}
                      onPress={() => handleAcceptRequest(req.request_id)}
                      accessibilityRole="button"
                      accessibilityLabel={t("parent.accept")}
                    >
                      <Text variant="caption" weight="800" color="#FFFFFF">
                        {t("parent.accept")}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[styles.smallBtn, styles.declineBtn]}
                      onPress={() => handleDeclineRequest(req.request_id)}
                      accessibilityRole="button"
                      accessibilityLabel={t("parent.decline")}
                    >
                      <Text variant="caption" weight="800" color="#64748B">
                        ✕
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Outgoing requests */}
          {outgoingRequests.length > 0 && (
            <View>
              <Text variant="bodySmall" weight="800" color="#64748B" style={{ marginBottom: Spacing.xs }}>
                {t("parent.outgoingRequests").replace(
                  "{count}",
                  String(outgoingRequests.length)
                )}
              </Text>
              {outgoingRequests.map((req) => (
                <View key={req.request_id} style={styles.requestCard}>
                  <View style={styles.requestAvatarCircle}>
                    <Text style={styles.avatarEmoji}>
                      {getAvatarEmoji(req.receiver_avatar_id)}
                    </Text>
                  </View>
                  <View style={styles.requestInfo}>
                    <Text variant="body" weight="800" color="#1E293B">
                      {req.receiver_nickname}
                    </Text>
                    <Text variant="caption" color="#94A3B8">
                      {isKm ? "កំពុងរង់ចាំការឆ្លើយតប..." : "Waiting for approval…"}
                    </Text>
                  </View>
                  <Pressable
                    style={[styles.smallBtn, styles.declineBtn]}
                    onPress={() => handleCancelRequest(req.request_id)}
                    accessibilityRole="button"
                    accessibilityLabel={t("parent.cancelRequest")}
                  >
                    <Text variant="caption" weight="700" color="#EF4444">
                      {t("parent.cancelRequest")}
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </KokiCard>
      )}

      {/* Section 4: Approved Friends List */}
      <KokiCard style={styles.sectionCard}>
        <View style={styles.headerRow}>
          <Text variant="titleMedium" weight="800" color="#1E293B">
            👫 {t("parent.friendsList").replace("{count}", String(friendsList.length))}
          </Text>
        </View>

        {friendsList.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🌟</Text>
            <Text variant="body" weight="800" color="#475569" style={{ marginTop: Spacing.xs }}>
              {t("parent.noFriendsYet")}
            </Text>
            <Text variant="caption" color="#94A3B8" style={{ textAlign: "center", marginTop: 4 }}>
              {t("parent.noFriendsYetDesc")}
            </Text>
          </View>
        ) : (
          <View style={styles.friendsListContainer}>
            {friendsList.map((friend) => (
              <View key={friend.friend_id} style={styles.friendRow}>
                <View style={styles.friendAvatarCircle}>
                  <Text style={styles.avatarEmoji}>
                    {getAvatarEmoji(friend.avatar_id)}
                  </Text>
                </View>
                <View style={styles.friendInfo}>
                  <Text variant="body" weight="800" color="#1E293B">
                    {friend.nickname}
                  </Text>
                  <Text variant="caption" color="#94A3B8">
                    {isKm ? "មិត្តភក្តិ" : "Friend"}
                  </Text>
                </View>
                <Pressable
                  style={styles.removeBtn}
                  onPress={() => {
                    setFriendToRemove(friend);
                    setRemoveModalVisible(true);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`${t("parent.removeFriend")} ${friend.nickname}`}
                >
                  <Text variant="caption" weight="700" color="#94A3B8">
                    {t("parent.removeFriend")}
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </KokiCard>

      {/* Rotate Code Modal */}
      <Modal
        visible={rotateModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setRotateModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text variant="title" weight="800" color="#1E293B" style={{ marginBottom: Spacing.sm }}>
              🔄 {t("parent.rotateConfirmTitle")}
            </Text>
            <Text variant="body" color="#64748B" style={{ marginBottom: Spacing.lg }}>
              {t("parent.rotateConfirmDesc")}
            </Text>
            <View style={styles.modalActions}>
              <KokiButton
                variant="primary"
                title={t("parent.rotateConfirmButton")}
                loading={isRotating}
                onPress={handleConfirmRotate}
                style={{ marginBottom: Spacing.sm }}
              />
              <KokiButton
                variant="ghost"
                title={t("parent.cancel")}
                onPress={() => setRotateModalVisible(false)}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Friend Lookup Confirmation Modal */}
      <Modal
        visible={lookupModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setLookupModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text variant="title" weight="800" color="#1E293B" style={{ marginBottom: Spacing.sm }}>
              👋 {t("parent.addConfirmTitle")}
            </Text>

            {foundChild && (
              <View style={styles.childPreviewCard}>
                <View style={styles.childPreviewAvatar}>
                  <Text style={{ fontSize: 36 }}>
                    {getAvatarEmoji(foundChild.avatar_id)}
                  </Text>
                </View>
                <Text variant="titleMedium" weight="800" color="#1E293B">
                  {foundChild.nickname}
                </Text>
              </View>
            )}

            <Text variant="body" color="#64748B" style={{ textAlign: "center", marginBottom: Spacing.lg }}>
              {t("parent.addConfirmDesc").replace(
                "{name}",
                foundChild?.nickname || ""
              )}
            </Text>

            <View style={styles.modalActions}>
              <KokiButton
                variant="primary"
                title={t("parent.sendRequestButton")}
                loading={isSendingRequest}
                onPress={handleConfirmSendRequest}
                style={{ marginBottom: Spacing.sm }}
              />
              <KokiButton
                variant="ghost"
                title={t("parent.cancel")}
                onPress={() => setLookupModalVisible(false)}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Remove Friend Confirmation Modal */}
      <Modal
        visible={removeModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setRemoveModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text variant="title" weight="800" color="#DC2626" style={{ marginBottom: Spacing.sm }}>
              ⚠️ {t("parent.removeConfirmTitle")}
            </Text>
            <Text variant="body" color="#64748B" style={{ marginBottom: Spacing.lg }}>
              {t("parent.removeConfirmDesc").replace(
                "{name}",
                friendToRemove?.nickname || ""
              )}
            </Text>
            <View style={styles.modalActions}>
              <KokiButton
                variant="green"
                title={t("parent.removeConfirmButton")}
                loading={isRemoving}
                onPress={handleConfirmRemove}
                style={{ marginBottom: Spacing.sm }}
              />
              <KokiButton
                variant="ghost"
                title={t("parent.cancel")}
                onPress={() => setRemoveModalVisible(false)}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: Spacing.xl,
  },
  unboundCard: {
    padding: Spacing.lg,
    backgroundColor: "#FFFFFF",
    borderRadius: Radius.lg,
  },
  cardTitle: {
    marginBottom: Spacing.xs,
  },
  cardDesc: {
    lineHeight: 22,
  },
  offlineBanner: {
    backgroundColor: "#FEF3C7",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  feedbackBanner: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
  },
  feedbackSuccess: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
  },
  feedbackError: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  sectionCard: {
    padding: Spacing.md,
    backgroundColor: "#FFFFFF",
    borderRadius: Radius.lg,
    marginBottom: Spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  headerTextCol: {
    flex: 1,
  },
  codeContainer: {
    backgroundColor: "#F8FAFC",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: Spacing.sm,
  },
  codeText: {
    letterSpacing: 4,
    fontFamily: "System",
  },
  codeActionsRow: {
    flexDirection: "row",
    marginTop: Spacing.xs,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    height: 48,
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    letterSpacing: 1.5,
  },
  requestCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: Spacing.sm,
    borderRadius: Radius.md,
    marginBottom: Spacing.xs,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  requestAvatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },
  requestInfo: {
    flex: 1,
  },
  requestActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  smallBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Radius.sm,
    marginLeft: Spacing.xs,
  },
  acceptBtn: {
    backgroundColor: "#10B981",
  },
  declineBtn: {
    backgroundColor: "#E2E8F0",
  },
  avatarEmoji: {
    fontSize: 22,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
  },
  emptyEmoji: {
    fontSize: 40,
  },
  friendsListContainer: {
    marginTop: Spacing.xs,
  },
  friendRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  friendAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },
  friendInfo: {
    flex: 1,
  },
  removeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: Radius.sm,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  modalActions: {
    width: "100%",
  },
  childPreviewCard: {
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: Spacing.md,
    borderRadius: Radius.lg,
    marginVertical: Spacing.md,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  childPreviewAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xs,
  },
});
