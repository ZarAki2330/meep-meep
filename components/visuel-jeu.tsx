// components/visuel-jeu.tsx
// Affiche l'image d'un jeu. Si aucune URL n'est fournie (ou si elle ne charge pas),
// on affiche un joli visuel de secours coloré avec l'initiale du jeu.

import { Image } from "expo-image";
import { useState } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { type Jeu } from "@/data/jeux";

const COULEURS_CATEGORIE: Record<string, string> = {
  Stratégie: "#378ADD",
  Cartes: "#1D9E75",
  Famille: "#EF9F27",
  Dés: "#7a5195",
};

export function VisuelJeu({ jeu, style }: { jeu: Jeu; style?: StyleProp<ViewStyle> }) {
  const [erreur, setErreur] = useState(false);
  const couleur = COULEURS_CATEGORIE[jeu.categorie] ?? "#7a5195";
  const montrerImage = !!jeu.image && !erreur;

  return (
    <View style={[styles.base, { backgroundColor: couleur }, style]}>
      {!montrerImage && <Text style={styles.initiale}>{jeu.nom.charAt(0)}</Text>}
      {montrerImage && (
        <Image
          source={{ uri: jeu.image }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={200}
          onError={() => setErreur(true)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  initiale: {
    color: "#ffffff",
    fontSize: 44,
    fontWeight: "700",
    opacity: 0.9,
  },
});
