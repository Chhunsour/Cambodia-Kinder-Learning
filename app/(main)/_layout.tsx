import React from "react";
import { Tabs } from "expo-router";
import { KokiTabBar } from "@/components/navigation/KokiTabBar";

export default function MainLayout() {
  return (
    <Tabs
      tabBar={(props) => <KokiTabBar {...props} />}
      backBehavior="initialRoute"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="home/index"
        options={{
          title: "Home",
        }}
      />
      <Tabs.Screen
        name="adventure/index"
        options={{
          title: "Adventure",
        }}
      />
      <Tabs.Screen
        name="koki/index"
        options={{
          title: "Koki",
        }}
      />
      <Tabs.Screen
        name="collection/index"
        options={{
          title: "Collection",
        }}
      />
    </Tabs>
  );
}
