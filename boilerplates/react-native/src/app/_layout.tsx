import { Stack } from "expo-router";
import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth.store";
import { setupNotifications } from "@/lib/notifications";

export default function RootLayout() {
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();
    setupNotifications();
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
