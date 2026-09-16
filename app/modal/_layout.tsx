import React from "react";
import { Stack } from "expo-router";

export default function ModalLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: "modal",
        animation: "fade_from_bottom",
      }}
    />
  );
}
