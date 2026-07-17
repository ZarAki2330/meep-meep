import { Fredoka_600SemiBold, useFonts } from "@expo-google-fonts/fredoka";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import * as NavigationBar from "expo-navigation-bar";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Platform } from "react-native";
import "react-native-reanimated";
import { initialWindowMetrics, SafeAreaProvider } from "react-native-safe-area-context";

import { JeuxProvider } from "@/context/jeux";
import { AppThemeProvider, useTheme } from "@/context/theme";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const [policesChargees] = useFonts({ Fredoka_600SemiBold });

  if (!policesChargees) {
    return null;
  }

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

  // Barre de navigation système (Android) : en edge-to-edge elle est
  // transparente, le fond suit donc le contenu de l'app. On adapte seulement la
  // couleur de ses icônes au thème interne (claires en sombre, sombres en clair)
  // pour qu'elles restent lisibles, même si le thème système diffère.
  useEffect(() => {
    if (Platform.OS !== "android") return;
    NavigationBar.setButtonStyleAsync(mode === "dark" ? "light" : "dark").catch(() => {});
  }, [mode]);

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
        <Stack.Screen name="bibliotheque" />
        <Stack.Screen name="bgg" />
        <Stack.Screen name="reglages" />
        <Stack.Screen name="aide" />
      </Stack>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
    </ThemeProvider>
  );
}
