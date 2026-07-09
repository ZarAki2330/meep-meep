// context/theme.tsx
// Fournit le thème (clair/sombre) à toute l'app + une fonction pour basculer.
// Le choix manuel est mémorisé sur l'appareil (AsyncStorage).

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useColorScheme } from "react-native";

import { darkColors, lightColors, type AppColors } from "@/constants/theme-colors";

type Mode = "light" | "dark";

type ThemeContexte = {
  mode: Mode;
  colors: AppColors;
  toggle: () => void;
};

const CLE_STOCKAGE = "meepmeep-theme";

const Contexte = createContext<ThemeContexte | null>(null);

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const systeme = useColorScheme();
  const [mode, setMode] = useState<Mode>(systeme === "dark" ? "dark" : "light");

  // Au démarrage, on recharge le choix mémorisé s'il existe.
  useEffect(() => {
    AsyncStorage.getItem(CLE_STOCKAGE).then((v) => {
      if (v === "light" || v === "dark") setMode(v);
    });
  }, []);

  function appliquer(nouveau: Mode) {
    setMode(nouveau);
    AsyncStorage.setItem(CLE_STOCKAGE, nouveau).catch(() => {});
  }

  const valeur = useMemo<ThemeContexte>(
    () => ({
      mode,
      colors: mode === "dark" ? darkColors : lightColors,
      toggle: () => appliquer(mode === "dark" ? "light" : "dark"),
    }),
    [mode],
  );

  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
}

export function useTheme() {
  const v = useContext(Contexte);
  if (!v) throw new Error("useTheme doit être utilisé à l'intérieur de AppThemeProvider");
  return v;
}
