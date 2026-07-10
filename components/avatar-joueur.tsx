// components/avatar-joueur.tsx
// Le portrait d'un joueur, ou son initiale sur fond coloré. Même composant dans
// la liste et sur sa fiche : seule la taille change.

import { Image } from "expo-image";
import { useState } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { useTheme } from "@/context/theme";

export function AvatarJoueur({
  nom,
  photo,
  taille = 40,
  couleur,
  couleurTexte,
  style,
}: {
  nom: string;
  photo?: string | null;
  taille?: number;
  /** Fond du visuel de secours. Les écrans de partie donnent une couleur par joueur. */
  couleur?: string;
  couleurTexte?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  // Une photo effacée hors de l'app laisse un chemin mort : on retombe sur l'initiale.
  const [erreur, setErreur] = useState(false);
  const montrerPhoto = !!photo && !erreur;

  return (
    <View
      // Décoratif : le nom du joueur est toujours écrit juste à côté. Sans cela,
      // le lecteur d'écran annoncerait l'initiale avant le nom.
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.base,
        {
          width: taille,
          height: taille,
          borderRadius: taille / 2,
          backgroundColor: couleur ?? colors.accentSoft,
        },
        style,
      ]}
    >
      {montrerPhoto ? (
        <Image
          source={{ uri: photo }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={150}
          onError={() => setErreur(true)}
        />
      ) : (
        <Text
          // L'initiale est calibrée sur un cercle de taille fixe : la laisser
          // grandir avec les réglages du système la ferait déborder. Elle est
          // décorative, sa taille n'apporte rien.
          allowFontScaling={false}
          style={{
            color: couleurTexte ?? (couleur ? "#ffffff" : colors.accentText),
            fontWeight: "700",
            fontSize: taille * 0.4,
          }}
        >
          {nom.charAt(0).toUpperCase()}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
});
