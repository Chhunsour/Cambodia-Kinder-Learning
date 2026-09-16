import React, { useState } from "react";
import { View, StyleSheet, Alert, Modal, Pressable } from "react-native";
import { Text } from "@/components/ui/Text";
import { KokiCard } from "@/components/ui/KokiCard";
import { KokiButton } from "@/components/ui/KokiButton";
import { ContentPackManifest, ContentPackStatus, DownloadProgress } from "../types";
import { Palette } from "@/constants/theme";
import { Spacing, Radius } from "@/constants/spacing";
import { useLocalization } from "@/hooks/useLocalization";

export interface ContentPackCardProps {
  manifest: ContentPackManifest;
  status: ContentPackStatus;
  progress?: DownloadProgress;
  isRecommended?: boolean;
  onDownload: () => void;
  onUpdate: () => void;
  onPlay: () => void;
  onDelete: () => void;
  onCancel?: () => void;
}

export const ContentPackCard: React.FC<ContentPackCardProps> = ({
  manifest,
  status,
  progress,
  isRecommended,
  onDownload,
  onUpdate,
  onPlay,
  onDelete,
  onCancel,
}) => {
  const { locale } = useLocalization();
  const isKm = locale === "km";

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  const title = isKm ? manifest.title.km : manifest.title.en;
  const description = manifest.description
    ? isKm
      ? manifest.description.km
      : manifest.description.en
    : "";

  const sizeMb = (manifest.estimatedSizeBytes / (1024 * 1024)).toFixed(1);

  const handleDeletePress = () => {
    setDeleteModalVisible(true);
  };

  const handleConfirmDelete = () => {
    setDeleteModalVisible(false);
    onDelete();
  };

  return (
    <KokiCard variant="elevated" padding="md" style={styles.card}>
      {/* Header Row: Title & Recommended Badge */}
      <View style={styles.headerRow}>
        <View style={styles.titleContainer}>
          <Text variant="title" weight="800" color="#1E293B">
            {title}
          </Text>
          <Text variant="caption" weight="600" color="#64748B" style={styles.sizeText}>
            📦 {sizeMb} MB
          </Text>
        </View>

        {isRecommended && (
          <View style={styles.recommendedBadge}>
            <Text variant="caption" weight="800" color="#FFFFFF">
              ★ {isKm ? "ណែនាំ" : "Recommended"}
            </Text>
          </View>
        )}
      </View>

      {/* Description */}
      {description ? (
        <Text variant="bodySmall" weight="600" color="#475569" style={styles.description}>
          {description}
        </Text>
      ) : null}

      {/* Age Band Tags */}
      <View style={styles.tagsRow}>
        {manifest.ageBands.map((band) => (
          <View key={band} style={styles.tag}>
            <Text variant="caption" weight="700" color="#4A6FA5">
              {band.charAt(0).toUpperCase() + band.slice(1)}
            </Text>
          </View>
        ))}
      </View>

      {/* Progress Bar for Downloading State */}
      {status === "downloading" && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBarBackground}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.max(5, progress?.percent || 0)}%` },
              ]}
            />
          </View>
          <View style={styles.progressTextRow}>
            <Text variant="caption" weight="700" color="#4A6FA5">
              {isKm ? "កំពុងទាញយក..." : "Downloading..."} {progress?.percent || 0}%
            </Text>
            {onCancel && (
              <Pressable onPress={onCancel} style={styles.cancelBtn}>
                <Text variant="caption" weight="700" color="#EF4444">
                  {isKm ? "ផ្អាក" : "Cancel"}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      )}

      {/* Action Footer depending on status */}
      <View style={styles.footerRow}>
        {status === "not_downloaded" && (
          <KokiButton
            variant="primary"
            title={isKm ? "ទាញយក" : "Download"}
            onPress={onDownload}
            style={styles.actionBtn}
          />
        )}

        {status === "downloading" && (
          <KokiButton
            variant="secondary"
            title={isKm ? "កំពុងទាញយក..." : "Downloading..."}
            disabled
            onPress={() => {}}
            style={styles.actionBtn}
          />
        )}

        {status === "installed" && (
          <View style={styles.installedRow}>
            <View style={styles.installedBadge}>
              <Text variant="bodySmall" weight="800" color="#047857">
                ✓ {isKm ? "បានទាញយក" : "Downloaded"}
              </Text>
            </View>

            <View style={styles.installedActions}>
              <Pressable onPress={handleDeletePress} style={styles.deleteLink}>
                <Text variant="caption" weight="700" color="#94A3B8">
                  🗑️ {isKm ? "លុបឯកសារ" : "Remove"}
                </Text>
              </Pressable>

              <KokiButton
                variant="green"
                title={isKm ? "លេងឥឡូវនេះ" : "Play"}
                onPress={onPlay}
                style={styles.playBtn}
              />
            </View>
          </View>
        )}

        {status === "update_available" && (
          <View style={styles.updateRow}>
            <KokiButton
              variant="secondary"
              title={isKm ? "លេង" : "Play"}
              onPress={onPlay}
              style={{ flex: 1, marginRight: Spacing.xs }}
            />
            <KokiButton
              variant="primary"
              title={isKm ? "ធ្វើបច្ចុប្បន្នភាព" : "Update"}
              onPress={onUpdate}
              style={{ flex: 1 }}
            />
          </View>
        )}

        {status === "failed" && (
          <View style={styles.failedRow}>
            <Text variant="caption" weight="700" color="#EF4444" style={{ marginBottom: 4 }}>
              ⚠️ {isKm ? "មិនអាចទាញយកបានទេ។ សូមព្យាយាមម្តងទៀត។" : "Could not download. Try again."}
            </Text>
            <KokiButton
              variant="primary"
              title={isKm ? "ព្យាយាមម្តងទៀត" : "Retry"}
              onPress={onDownload}
              style={styles.actionBtn}
            />
          </View>
        )}
      </View>

      {/* Confirmation Modal for Safe Pack Deletion */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setDeleteModalVisible(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text variant="title" weight="800" align="center" color="#1E293B" style={{ marginBottom: Spacing.xs }}>
              {isKm ? "លុបឯកសារដែលបានទាញយក?" : "Remove downloaded files?"}
            </Text>

            <Text variant="bodySmall" weight="600" align="center" color="#475569" style={{ lineHeight: 22, marginBottom: Spacing.md }}>
              {isKm
                ? "ការលុបឯកសារនឹងជួយសន្សំទំហំផ្ទុក។ ការរីកចម្រើន និងផ្កាយដែលប្អូនបានរៀននឹងនៅតែត្រូវបានរក្សាទុកជានិច្ច!"
                : "Deleting content files frees up storage. Your child's learning progress, stars, and coins will remain safely saved!"}
            </Text>

            <View style={styles.modalActionsRow}>
              <KokiButton
                variant="secondary"
                title={isKm ? "ទុកវិញ" : "Cancel"}
                onPress={() => setDeleteModalVisible(false)}
                style={{ flex: 1, marginRight: Spacing.xs }}
              />
              <Pressable
                onPress={handleConfirmDelete}
                style={styles.confirmDeleteModalBtn}
                accessibilityRole="button"
              >
                <Text variant="bodySmall" weight="800" color="#FFFFFF">
                  {isKm ? "លុបឯកសារ" : "Remove Files"}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </KokiCard>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: Spacing.xs,
    borderRadius: Radius.lg,
    backgroundColor: "#FFFFFF",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  titleContainer: {
    flex: 1,
  },
  sizeText: {
    marginTop: 2,
  },
  recommendedBadge: {
    backgroundColor: "#F59E0B",
    paddingHorizontal: Spacing.xs + 2,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  description: {
    marginTop: Spacing.xs,
    lineHeight: 20,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginVertical: Spacing.xs + 2,
  },
  tag: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  progressContainer: {
    marginVertical: Spacing.xs,
  },
  progressBarBackground: {
    height: 10,
    backgroundColor: "#E2E8F0",
    borderRadius: Radius.pill,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#4A6FA5",
    borderRadius: Radius.pill,
  },
  progressTextRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  cancelBtn: {
    padding: 4,
  },
  footerRow: {
    marginTop: Spacing.xs,
  },
  actionBtn: {
    width: "100%",
  },
  installedRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  installedBadge: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: Spacing.xs + 2,
    paddingVertical: 6,
    borderRadius: Radius.md,
  },
  installedActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  deleteLink: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  playBtn: {
    minWidth: 100,
  },
  updateRow: {
    flexDirection: "row",
    width: "100%",
  },
  failedRow: {
    width: "100%",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.md,
  },
  modalCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#FFFFFF",
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: "center",
  },
  modalActionsRow: {
    flexDirection: "row",
    width: "100%",
    marginTop: Spacing.xs,
  },
  confirmDeleteModalBtn: {
    flex: 1,
    backgroundColor: "#EF4444",
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
});
