import { Stack } from "expo-router";
import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";
import { View, StyleSheet } from "react-native";

// We don't need a separate ThemedLayout component anymore
export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Stack screenOptions={{ headerShown: false }}>
          {/* Define the (auth) group for login/register/select-activities */}
          <Stack.Screen name="(auth)/index" options={{ headerShown: false }} redirect={true} />
          <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)/register" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)/select-activities" options={{ headerShown: false }} />

          {/* Define the (tabs) group for the main app */}
          <Stack.Screen name="(tabs)/index" options={{ headerShown: false }} />

          {/* Fallback for not-found routes */}
          <Stack.Screen name="+not-found" options={{ title: "Not Found" }} />
        </Stack>
      </ThemeProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});