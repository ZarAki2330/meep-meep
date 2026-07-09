import { Fredoka_600SemiBold, useFonts } from "@expo-google-fonts/fredoka";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

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
    <AppThemeProvider>
      <JeuxProvider>
        <Navigation />
      </JeuxProvider>
    </AppThemeProvider>
  );
}

function Navigation() {
  const { mode, colors } = useTheme();

  return (
    <ThemeProvider value={mode === "dark" ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.textPrimary,
          contentStyle: { backgroundColor: colors.page },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="import" options={{ title: "Ajouter un jeu" }} />
        <Stack.Screen name="bgg" options={{ title: "BoardGameGeek" }} />
        <Stack.Screen name="reglages" options={{ title: "Réglages" }} />
        <Stack.Screen name="modal" options={{ presentation: "modal", title: "Modal" }} />
      </Stack>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
    </ThemeProvider>
  );
}
