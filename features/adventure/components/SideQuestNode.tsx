import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { Palette } from "@/constants/theme";
import { MapNodeData } from "../types";

interface SideQuestNodeProps {
  node: MapNodeData;
  onPress: (node: MapNodeData) => void;
  label?: string;
  progressText?: string;
}

export const SideQuestNode: React.FC<SideQuestNodeProps> = ({
  node,
  onPress,
  label = "English",
  progressText,
}) => {
  const isLocked = node.status === "locked";
  const isCompleted = node.status === "completed";

  return (
    <View style={styles.container}>
      {/* Visual Branch Ribbon */}
      <View style={styles.branchHeader}>
        <Text variant="caption" weight="800" style={styles.sideQuestTag}>
          {progressText || "ABC"}
        </Text>
      </View>

      <Pressable
        onPress={() => onPress(node)}
        accessibilityRole="button"
        accessibilityLabel={`English Side Quest, ${node.status}`}
        style={({ pressed }) => [
          styles.nodeBase,
          isLocked ? styles.lockedBase : styles.activeBase,
          { transform: [{ scale: pressed ? 0.94 : 1 }] },
        ]}
      >
        <Text style={styles.flagEmoji}>{isLocked ? "🔒" : "🔤"}</Text>
      </Pressable>

      <View style={[styles.titleBadge, isLocked && styles.lockedTitleBadge]}>
        <Text
          variant="caption"
          weight="800"
          numberOfLines={1}
          style={[styles.titleText, isLocked && styles.lockedTitleText]}
        >
          {label}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  branchHeader: {
    marginBottom: -4,
    zIndex: 2,
  },
  sideQuestTag: {
    backgroundColor: "#7B61FF",
    color: Palette.pureWhite,
    fontSize: 9,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    overflow: "hidden",
    letterSpacing: 0.5,
  },
  nodeBase: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3.5,
    borderBottomWidth: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 4,
    elevation: 4,
  },
  activeBase: {
    backgroundColor: "#E8EEFF",
    borderColor: "#4A6FA5",
    borderBottomColor: "#335384",
  },
  lockedBase: {
    backgroundColor: "#F1F5F9",
    borderColor: "#94A3B8",
    borderBottomColor: "#64748B",
  },
  flagEmoji: {
    fontSize: 26,
  },
  titleBadge: {
    marginTop: 3,
    backgroundColor: "#4A6FA5",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#335384",
    maxWidth: 90,
  },
  lockedTitleBadge: {
    backgroundColor: "#94A3B8",
    borderColor: "#64748B",
  },
  titleText: {
    color: Palette.pureWhite,
    fontSize: 10,
    textAlign: "center",
  },
  lockedTitleText: {
    color: "#F1F5F9",
  },
});
