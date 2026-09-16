import React, { ReactNode } from "react";
import { 
  View, 
  ScrollView, 
  StyleSheet, 
  ViewStyle, 
  StatusBar, 
  StatusBarStyle 
} from "react-native";
import { SafeAreaView, Edge } from "react-native-safe-area-context";
import { Colors } from "@/constants/colors";
import { useResponsive } from "@/hooks/useResponsive";
import { KeyboardSafeView } from "./KeyboardSafeView";

export interface ScreenContainerProps {
  children: ReactNode;
  scrollable?: boolean;
  safeEdges?: Edge[];
  backgroundColor?: string;
  statusBarStyle?: StatusBarStyle;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
}

export function ScreenContainer({
  children,
  scrollable = false,
  safeEdges = ["top", "left", "right", "bottom"],
  backgroundColor = Colors.background.cream,
  statusBarStyle = "dark-content",
  style,
  contentContainerStyle,
}: ScreenContainerProps) {
  const { isTablet, maxContainerWidth, contentPadding } = useResponsive();

  const innerContent = (
    <View style={[
      styles.innerContent,
      {
        paddingHorizontal: contentPadding,
        maxWidth: maxContainerWidth,
      },
      contentContainerStyle,
    ]}>
      {children}
    </View>
  );

  return (
    <SafeAreaView 
      edges={safeEdges} 
      style={[styles.safeArea, { backgroundColor }, style]}
    >
      <StatusBar barStyle={statusBarStyle} backgroundColor={backgroundColor} />
      <KeyboardSafeView style={styles.keyboardView}>
        <View style={styles.centerWrapper}>
          {scrollable ? (
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={[
                styles.scrollContent,
                isTablet && styles.tabletScrollContent,
              ]}
              showsVerticalScrollIndicator={false}
              bounces={true}
              keyboardShouldPersistTaps="handled"
            >
              {innerContent}
            </ScrollView>
          ) : (
            innerContent
          )}
        </View>
      </KeyboardSafeView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  centerWrapper: {
    flex: 1,
    alignItems: "center",
    width: "100%",
  },
  scrollView: {
    flex: 1,
    width: "100%",
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
  },
  tabletScrollContent: {
    paddingVertical: 16,
  },
  innerContent: {
    width: "100%",
    flex: 1,
  },
});
