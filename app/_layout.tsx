import { Fredoka_600SemiBold, useFonts } from "@expo-google-fonts/fredoka";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import * as NavigationBar from "expo-navigation-bar";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect } from "react";
import { AppState, Platform } from "react-native";
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

  // Barre système (Android) au thème interne de l'app. Le voile de contraste
  // blanc de la barre de navigation est désactivé au build
  // (androidNavigationBar.enforceContrast = false dans app.json) : la barre
  // reste transparente et laisse voir le fond derrière elle. On n'adapte donc
  // que la couleur des icônes (claires en sombre, sombres en clair).
  //
  // Au tout premier lancement, appliquer ce style trop tôt (avant que la fenêtre
  // native soit prête) ne « prenait » pas : la barre restait opaque jusqu'à ce
  // qu'on quitte puis revienne dans l'app. On le repose donc : au montage, une
  // fois juste après (fenêtre prête), et à chaque retour au premier plan.
  useEffect(() => {
    const appliquer = () => {
      SystemUI.setBackgroundColorAsync(colors.page).catch(() => {});
      if (Platform.OS === "android") {
        NavigationBar.setButtonStyleAsync(mode === "dark" ? "light" : "dark").catch(() => {});
      }
    };

    appliquer();
    // Reposé une fois la fenêtre native prête (corrige le cold launch, où
    // AppState est déjà « active » et n'émet donc aucun événement).
    const minuterie = setTimeout(appliquer, 300);
    // …et à chaque retour de l'arrière-plan.
    const sub = AppState.addEventListener("change", (etat) => {
      if (etat === "active") appliquer();
    });

    return () => {
      clearTimeout(minuterie);
      sub.remove();
    };
  }, [mode, colors.page]);

  // Le fond révélé par la barre transparente est celui de React Navigation.
  // Ses thèmes par défaut ont un fond blanc (clair) ou noir (sombre), qui ne
  // suit pas notre thème crème/sombre : on le remplace par `colors.page` pour
  // que la barre laisse toujours voir le fond au thème, sur tous les écrans.
  const themeBase = mode === "dark" ? DarkTheme : DefaultTheme;
  const themeNavigation = {
    ...themeBase,
    colors: { ...themeBase.colors, background: colors.page, card: colors.page },
  };

  return (
    <ThemeProvider value={themeNavigation}>
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
