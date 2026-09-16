import React from "react";
import { View, StyleSheet } from "react-native";
import Animated, { FadeInUp, FadeOutDown } from "react-native-reanimated";
import { KokiButton } from "@/components/ui/KokiButton";
import { useLocalization } from "@/hooks/useLocalization";
import { ActivityLifecycleState } from "../types";
import { Spacing, Radius } from "@/constants/spacing";
import { Palette } from "@/constants/theme";

interface LessonBottomBarProps {
  lifecycleState: ActivityLifecycleState;
  onContinue: () => void;
}

/**
 * Bottom Action Bar for Lesson Activities.
 *
 * Hosts the primary "Continue" CTA which smoothly slides in
 * upon successfully solving an activity.
 */
export function LessonBottomBar({
  lifecycleState,
  onContinue,
}: LessonBottomBarProps) {
  const { t } = useLocalization();
  const isCorrect = lifecycleState === "correct";

  if (!isCorrect) {
    return <View style={styles.emptyContainer} />;
  }

  return (
    <Animated.View
      entering={FadeInUp.duration(280).springify()}
      exiting={FadeOutDown.duration(200)}
      style={styles.bottomBar}
    >
      <KokiButton
        variant="green"
        fullWidth={true}
        title={t("lesson.continue")}
        icon={<KokiCheckIcon />}
        onPress={onContinue}
        accessibilityLabel={t("lesson.continue")}
      />
    </Animated.View>
  );
}

function KokiCheckIcon() {
  return (
    <View style={styles.checkBadge}>
      <Animated.Text style={styles.checkEmoji}>➔</Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    height: 72,
  },
  bottomBar: {
    width: "100%",
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    backgroundColor: "transparent",
  },
  checkBadge: {
    marginRight: Spacing.xs,
  },
  checkEmoji: {
    color: Palette.pureWhite,
    fontSize: 18,
    fontWeight: "900",
  },
});
