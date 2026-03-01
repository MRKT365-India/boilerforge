import { View, Text, Pressable } from "react-native";
import { useAuthStore } from "@/stores/auth.store";
import { router } from "expo-router";

export default function ProfileScreen() {
  const { user, signOut } = useAuthStore();

  const handleSignOut = async () => {
    await signOut();
    router.replace("/(auth)/login");
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
      <Text style={{ fontSize: 20, fontWeight: "bold" }}>Profile</Text>
      <Text style={{ color: "#666", marginTop: 8 }}>{user?.email ?? "Not signed in"}</Text>
      <Pressable
        onPress={handleSignOut}
        style={{ marginTop: 24, backgroundColor: "#ef4444", padding: 12, borderRadius: 8 }}
      >
        <Text style={{ color: "#fff", fontWeight: "600" }}>Sign out</Text>
      </Pressable>
    </View>
  );
}
