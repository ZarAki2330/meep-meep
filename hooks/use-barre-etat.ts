// hooks/use-barre-etat.ts
// Hauteur de la barre d'état. En mode edge-to-edge sur Android, les zones sûres
// peuvent valoir 0 : on combine les mesures disponibles, avec un plancher.

import { Platform, StatusBar } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PLANCHER_ANDROID = 28;

export function useHauteurBarreEtat(): number {
  const insets = useSafeAreaInsets();
  const systeme = Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0;
  const mesure = Math.max(insets.top, systeme);
  if (mesure > 0) return mesure;
  return Platform.OS === "android" ? PLANCHER_ANDROID : 0;
}
