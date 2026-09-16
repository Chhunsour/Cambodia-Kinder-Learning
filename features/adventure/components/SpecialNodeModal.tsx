import React from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { Text } from "@/components/ui/Text";
import { KokiButton } from "@/components/ui/KokiButton";
import { Palette } from "@/constants/theme";
import { Spacing } from "@/constants/spacing";
import { MapNodeData } from "../types";

interface SpecialNodeModalProps {
  visible: boolean;
  node: MapNodeData | null;
  isKm: boolean;
  onClose: () => void;
  onAction?: (node: MapNodeData) => void;
}

export const SpecialNodeModal: React.FC<SpecialNodeModalProps> = ({
  visible,
  node,
  isKm,
  onClose,
  onAction,
}) => {
  if (!node) return null;

  const isLocked = node.status === "locked";
  let icon = "⭐";
  let fallbackTitle = isKm ? "ព័ត៌មានលម្អិត" : "Node Details";
  let fallbackDesc = "";
  let buttonTitle = isKm ? "យល់ព្រម" : "Got it";
  let buttonVariant: "primary" | "secondary" | "green" = "primary";

  if (node.type === "treasure") {
    icon = "🎁";
    fallbackTitle = isKm ? "ប្រអប់កំណប់ពិសេស" : "Special Treasure";
    fallbackDesc = isLocked
      ? isKm
        ? "រៀនបន្តដើម្បីបើកប្រអប់កំណប់នេះ!"
        : "Complete more lessons to unlock this treasure chest!"
      : isKm
      ? "អបអរសាទរ! អ្នកបានបើកកាដូរង្វាន់ក្នុងភូមិកូគី!"
      : "Hooray! You opened a special treasure reward in Koki Village!";
    buttonVariant = "primary";
  } else if (node.type === "challenge") {
    icon = "🐯";
    fallbackTitle = isKm ? "ការប្រកួតភូមិកូគី" : "Koki Challenge";
    fallbackDesc = isLocked
      ? isKm
        ? "ឆ្លងកាត់មេរៀនមុនៗទាំងអស់ ដើម្បីដោះសោការប្រកួតនេះ!"
        : "Complete the previous lessons to unlock this checkpoint challenge!"
      : isKm
      ? "ត្រៀមខ្លួនរួចរាល់ហើយឬនៅ? សាកល្បងសមត្ថភាពឥឡូវនេះ!"
      : "Are you ready? Test your skills in this special challenge!";
    buttonVariant = "primary";
    if (!isLocked) {
      buttonTitle = isKm ? "ចូលលេង" : "Play Challenge";
    }
  } else if (node.type === "sideQuest") {
    icon = "🔤";
    fallbackTitle = isKm ? "ដំណើរផ្សងព្រេងភាសាអង់គ្លេស" : "English Adventure";
    fallbackDesc = isLocked
      ? isKm
        ? "រៀនបន្តដើម្បីដោះសោមេរៀនអង់គ្លេសបន្ថែមនេះ!"
        : "Complete more lessons to unlock this optional English side quest!"
      : isKm
      ? "មេរៀនបន្ថែម៖ រៀនពាក្យអង់គ្លេសសប្បាយៗទាំងអស់គ្នា!"
      : "Optional bonus: Explore fun English vocabulary with Koki!";
    buttonVariant = "green";
    if (!isLocked) {
      buttonTitle = isKm ? "ចូលរៀន" : "Explore English";
    }
  }

  const title = isKm ? node.titleKm || fallbackTitle : node.titleEn || fallbackTitle;
  const desc = isKm ? node.descriptionKm || fallbackDesc : node.descriptionEn || fallbackDesc;

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconEmoji}>{icon}</Text>
          </View>

          <Text variant="heading2" weight="800" align="center" style={styles.title}>
            {title}
          </Text>

          <Text
            variant="body"
            align="center"
            color={Palette.secondaryText}
            style={styles.description}
          >
            {desc}
          </Text>

          <View style={styles.buttonContainer}>
            <KokiButton
              variant={buttonVariant}
              title={buttonTitle}
              onPress={() => {
                if (!isLocked && onAction && (node.type === "sideQuest" || node.type === "challenge")) {
                  onAction(node);
                } else {
                  onClose();
                }
              }}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: Palette.pureWhite,
    borderRadius: 24,
    padding: Spacing.xl,
    alignItems: "center",
    borderWidth: 2,
    borderColor: Palette.cardOutline,
    borderBottomWidth: 6,
    borderBottomColor: Palette.borderStrong,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Palette.warmCream,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: Palette.gold,
  },
  iconEmoji: {
    fontSize: 38,
  },
  title: {
    marginBottom: Spacing.sm,
    color: Palette.primaryText,
  },
  description: {
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  buttonContainer: {
    width: "100%",
  },
});
