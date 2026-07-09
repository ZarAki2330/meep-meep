// context/theme.tsx
// Fournit le thème (clair/sombre) et la couleur d'accent à toute l'app.
// Les deux choix sont mémorisés sur l'appareil (AsyncStorage).

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useColorScheme } from "react-native";

import {
  ACCENTS,
  construireCouleurs,
  type AppColors,
  type CleAccent,
} from "@/constants/theme-colors";

type Mode = "light" | "dark";

type ThemeContexte = {
  mode: Mode;
  colors: AppColors;
  toggle: () => void;
  accent: CleAccent;
  definirAccent: (cle: CleAccent) => void;
};

const CLE_THEME = "meepmeep-theme";
const CLE_ACCENT = "meepmeep-accent";

const Contexte = createContext<ThemeContexte | null>(null);

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const systeme = useColorScheme();
  const [mode, setMode] = useState<Mode>(systeme === "dark" ? "dark" : "light");
  const [accent, setAccent] = useState<CleAccent>("violet");

  useEffect(() => {
    AsyncStorage.getItem(CLE_THEME).then((v) => {
      if (v === "light" || v === "dark") setMode(v);
    });
    AsyncStorage.getItem(CLE_ACCENT).then((v) => {
      if (v && v in ACCENTS) setAccent(v as CleAccent);
    });
  }, []);

  function appliquerMode(nouveau: Mode) {
    setMode(nouveau);
    AsyncStorage.setItem(CLE_THEME, nouveau).catch(() => {});
  }

  function definirAccent(cle: CleAccent) {
    setAccent(cle);
    AsyncStorage.setItem(CLE_ACCENT, cle).catch(() => {});
  }

  const valeur = useMemo<ThemeContexte>(
    () => ({
      mode,
      colors: construireCouleurs(mode, accent),
      toggle: () => appliquerMode(mode === "dark" ? "light" : "dark"),
      accent,
      definirAccent,
    }),
    [mode, accent],
  );

  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
}

export function useTheme() {
  const v = useContext(Contexte);
  if (!v) throw new Error("useTheme doit être utilisé à l'intérieur de AppThemeProvider");
  return v;
}
