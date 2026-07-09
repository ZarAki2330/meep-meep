import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { initialWindowMetrics, SafeAreaProvider } from "react-native-safe-area-context";

import { JeuxProvider } from "@/context/jeux";
import { AppThemeProvider, useTheme } from "@/context/theme";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <AppThemeProvider>
        <JeuxProvider>
          <Navigation />
        </JeuxProvider>
      </AppThemeProvider>
    </SafeAreaProvider>
  );
}

function Navigation() {
  const { mode, colors } = useTheme();

  return (
    <ThemeProvider value={mode === "dark" ? DarkTheme : DefaultTheme}>
      {/* Chaque écran dessine son propre en-tête (composant Entete) : l'en-tête
          natif se figeait parfois sous la barre d'état sur Android. */}
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.page },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="import" />
        <Stack.Screen name="bgg" />
        <Stack.Screen name="reglages" />
        <Stack.Screen name="modal" options={{ presentation: "modal" }} />
      </Stack>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
    </ThemeProvider>
  );
}
