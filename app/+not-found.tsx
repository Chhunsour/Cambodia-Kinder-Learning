import React from "react";
import { View, StyleSheet } from "react-native";
import { Link, Stack } from "expo-router";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Text } from "@/components/ui/Text";
import { Colors } from "@/constants/colors";
import { Spacing } from "@/constants/spacing";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <ScreenContainer>
        <View style={styles.container}>
          <Text variant="hero" color={Colors.primary.base}>
            404
          </Text>
          <Text variant="titleSmall" color={Colors.text.primary} style={styles.title}>
            This screen does not exist.
          </Text>
          <Link href="/" style={styles.link}>
            <Text variant="bodyLarge" color={Colors.text.link} weight="700">
              Go to Home Screen
            </Text>
          </Link>
        </View>
      </ScreenContainer>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.lg,
  },
  title: {
    marginVertical: Spacing.base,
  },
  link: {
    marginTop: Spacing.base,
    paddingVertical: Spacing.base,
  },
});
