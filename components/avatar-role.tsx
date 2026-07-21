// components/avatar-role.tsx
// Avatar d'un personnage. Si le personnage a une photo ou un logo, on l'affiche ;
// sinon on montre une pastille colorée avec son initiale (couleur déterministe,
// tirée de son nom). Purement décoratif : le nom du personnage l'accompagne
// toujours dans un texte voisin.

import { Image } from "expo-image";
import { useState } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { type RoleJeu } from "@/data/jeux";
import { couleurRole } from "@/lib/couleur-jeu";

export function AvatarRole({
  role,
  taille = 44,
  style,
}: {
  role: RoleJeu;
  taille?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const [erreur, setErreur] = useState(false);
  const montrerImage = !!role.image && !erreur;
  const couleur = couleurRole(role.nom);
  const initiale = role.nom.trim().charAt(0).toUpperCase() || "?";

  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.base,
        {
          width: taille,
          height: taille,
          borderRadius: taille / 2,
          backgroundColor: montrerImage ? "#ffffff" : couleur,
        },
        style,
      ]}
    >
      {montrerImage ? (
        <Image
          source={{ uri: role.image }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={150}
          onError={() => setErreur(true)}
        />
      ) : (
        <Text allowFontScaling={false} style={[styles.initiale, { fontSize: Math.round(taille * 0.42) }]}>
          {initiale}
        </Text>
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
    fontWeight: "700",
  },
});
