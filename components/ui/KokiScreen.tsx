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
import { Palette } from "@/constants/theme";
import { useKokiResponsive } from "@/hooks/useKokiResponsive";
import { KeyboardSafeView } from "./KeyboardSafeView";

export interface KokiScreenProps {
  children: ReactNode;
  scrollable?: boolean;
  safeEdges?: Edge[];
  backgroundColor?: string;
  statusBarStyle?: StatusBarStyle;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
}

export function KokiScreen({
  children,
  scrollable = false,
  safeEdges = ["top", "left", "right", "bottom"],
  backgroundColor = Palette.warmCream,
  statusBarStyle = "dark-content",
  style,
  contentContainerStyle,
}: KokiScreenProps) {
  const { isTablet, maxContentWidth, horizontalPadding } = useKokiResponsive();

  const innerContent = (
    <View style={[
      styles.innerContent,
      {
        paddingHorizontal: horizontalPadding,
        maxWidth: maxContentWidth,
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
