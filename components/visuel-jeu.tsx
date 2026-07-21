// components/visuel-jeu.tsx
// Affiche l'image d'un jeu. Si aucune URL n'est fournie (ou si elle ne charge pas),
// on affiche un joli visuel de secours coloré avec l'initiale du jeu.

import { Image } from "expo-image";
import { useState } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { type Jeu } from "@/data/jeux";
import { couleurJeu } from "@/lib/couleur-jeu";

export function VisuelJeu({ jeu, style }: { jeu: Jeu; style?: StyleProp<ViewStyle> }) {
  const [erreur, setErreur] = useState(false);
  // L'initiale suit la taille du visuel : le même composant sert de bannière,
  // de vignette dans le catalogue et de miniature dans la bibliothèque.
  const [cote, setCote] = useState(0);
  // Faute de photo, chaque jeu reçoit une tuile colorée selon sa catégorie,
  // pour rester distinct dans les listes.
  const couleur = couleurJeu(jeu);
  const montrerImage = !!jeu.image && !erreur;
  // Toutes les images sont affichées en entier (« contain »), dézoomées, pour
  // voir l'ensemble de la boîte — comme les packshots Gigamic — plutôt que
  // rognées. Le fond est alors blanc : les bandes autour de l'image et les zones
  // transparentes (certains packshots Gigamic sont détourés, servis en .jpg)
  // sont blanches, jamais la tuile colorée de la catégorie.
  const fond = montrerImage ? "#ffffff" : couleur;

  return (
    <View
      // Décoratif : le nom du jeu accompagne toujours son visuel.
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.base, { backgroundColor: fond }, style]}
      onLayout={(e) => setCote(e.nativeEvent.layout.height)}
    >
      {!montrerImage && (
        <Text
          // Calibrée sur la vignette, et purement décorative : elle ne suit pas
          // les réglages de taille de police.
          allowFontScaling={false}
          style={[styles.initiale, cote > 0 && { fontSize: Math.round(cote * 0.45) }]}
        >
          {jeu.nom.charAt(0)}
        </Text>
      )}
      {montrerImage && (
        <Image
          source={{ uri: jeu.image }}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
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
