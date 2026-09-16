import React from "react";
import { Stack } from "expo-router";

export default function ParentLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_bottom",
      }}
    >
      <Stack.Screen name="index" />
    </Stack>
  );
}
