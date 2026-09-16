import React, { useState, useEffect, useCallback } from "react";
import {
  Modal,
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Text } from "@/components/ui/Text";
import { KokiButton } from "@/components/ui/KokiButton";
import { ContentPackCard } from "./ContentPackCard";
import { contentPackService } from "../services/contentPackService";
import {
  ContentPackManifest,
  ContentPackStatus,
  DownloadProgress,
} from "../types";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import { useLocalization } from "@/hooks/useLocalization";
import { Spacing, Radius } from "@/constants/spacing";

interface PackItemState {
  manifest: ContentPackManifest;
  status: ContentPackStatus;
  progress?: DownloadProgress;
}

export interface MoreAdventuresModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectWorld: (worldId: string) => void;
}

export const MoreAdventuresModal: React.FC<MoreAdventuresModalProps> = ({
  visible,
  onClose,
  onSelectWorld,
}) => {
  const { profile } = useActiveProfile();
  const { locale } = useLocalization();
  const isKm = locale === "km";

  const [packs, setPacks] = useState<PackItemState[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadPacks = useCallback(async () => {
    try {
      setLoading(true);
      const list = await contentPackService.listAvailablePacks();
      setPacks(
        list.map((item) => ({
          manifest: item.manifest,
          status: item.status,
        }))
      );
    } catch (err) {
      console.warn("[MoreAdventuresModal] Error listing packs:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      loadPacks();
    }
  }, [visible, loadPacks]);

  const handleDownload = async (packId: string) => {
    try {
      // Set downloading status in UI
      setPacks((prev) =>
        prev.map((p) =>
          p.manifest.id === packId ? { ...p, status: "downloading" } : p
        )
      );

      await contentPackService.downloadPack(packId, {
        onProgress: (progress) => {
          setPacks((prev) =>
            prev.map((p) =>
              p.manifest.id === packId ? { ...p, progress } : p
            )
          );
        },
      });

      // Reload on completion
      await loadPacks();
    } catch (err: any) {
      const message =
        err?.userMessage ||
        (isKm
          ? "មិនអាចទាញយកបានទេ។ សូមព្យាយាមម្តងទៀត។"
          : "Could not download. Try again.");
      Alert.alert(isKm ? "ការទាញយក" : "Download", message);
      await loadPacks();
    }
  };

  const handleUpdate = async (packId: string) => {
    try {
      setPacks((prev) =>
        prev.map((p) =>
          p.manifest.id === packId ? { ...p, status: "downloading" } : p
        )
      );

      await contentPackService.updatePack(packId, {
        onProgress: (progress) => {
          setPacks((prev) =>
            prev.map((p) =>
              p.manifest.id === packId ? { ...p, progress } : p
            )
          );
        },
      });

      await loadPacks();
    } catch (err: any) {
      const message =
        err?.userMessage ||
        (isKm
          ? "មិនអាចធ្វើបច្ចុប្បន្នភាពបានទេ។ សូមព្យាយាមម្តងទៀត។"
          : "Could not update. Try again.");
      Alert.alert(isKm ? "បច្ចុប្បន្នភាព" : "Update", message);
      await loadPacks();
    }
  };

  const handleDelete = async (packId: string) => {
    try {
      await contentPackService.deletePack(packId);
      await loadPacks();
    } catch (err: any) {
      Alert.alert(
        isKm ? "លុបឯកសារ" : "Remove Files",
        err?.message || "Could not remove files."
      );
    }
  };

  const handlePlay = (worldId?: string) => {
    if (worldId) {
      onSelectWorld(worldId);
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header Bar */}
        <View style={styles.header}>
          <View>
            <Text variant="heading2" weight="900" color="#1E293B">
              🗺️ {isKm ? "ដំណើរផ្សងព្រេងបន្ថែម" : "More Adventures"}
            </Text>
            <Text variant="caption" weight="600" color="#64748B">
              {isKm
                ? "ទាញយកពិភពថ្មីៗដើម្បីរៀនដោយគ្មានអ៊ីនធឺណិត"
                : "Download new worlds and play completely offline"}
            </Text>
          </View>

          <Pressable onPress={onClose} style={styles.closeButton} accessibilityRole="button">
            <Text variant="titleSmall" weight="800" color="#64748B">
              ✕
            </Text>
          </Pressable>
        </View>

        {/* Body Content */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4A6FA5" />
            <Text variant="bodySmall" weight="600" color="#64748B" style={{ marginTop: Spacing.sm }}>
              {isKm ? "កំពុងពិនិត្យមើល..." : "Checking available adventures..."}
            </Text>
          </View>
        ) : packs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text variant="title" weight="800" color="#1E293B">
              🏝️ {isKm ? "គ្មានដំណើរផ្សងព្រេងថ្មីទេ" : "No new adventures"}
            </Text>
            <Text variant="bodySmall" weight="600" color="#64748B" align="center" style={{ marginTop: 6 }}>
              {isKm
                ? "ភូមិកូគីត្រូវបានដំឡើងរួចហើយ។ ដំណើរផ្សងព្រេងថ្មីៗនឹងមកដល់ក្នុងពេលឆាប់ៗនេះ!"
                : "Koki Village is bundled and ready. New downloadable worlds will arrive soon!"}
            </Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {packs.map((item) => {
              const isRecommended =
                profile?.learningBand &&
                item.manifest.ageBands.includes(profile.learningBand);

              return (
                <ContentPackCard
                  key={item.manifest.id}
                  manifest={item.manifest}
                  status={item.status}
                  progress={item.progress}
                  isRecommended={isRecommended}
                  onDownload={() => handleDownload(item.manifest.id)}
                  onUpdate={() => handleUpdate(item.manifest.id)}
                  onPlay={() => handlePlay(item.manifest.worldId)}
                  onDelete={() => handleDelete(item.manifest.id)}
                />
              );
            })}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: Radius.pill,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  scrollContent: {
    padding: Spacing.md,
  },
});
