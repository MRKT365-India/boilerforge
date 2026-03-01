import { View, Text } from "react-native";

export default function HomeScreen() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 20, fontWeight: "bold" }}>Home</Text>
      <Text style={{ color: "#666", marginTop: 8 }}>Your app starts here</Text>
    </View>
  );
}
