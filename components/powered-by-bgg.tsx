// components/powered-by-bgg.tsx
// Attribution BoardGameGeek, exigée par les conditions de l'API dès que l'app
// affiche des données issues de BGG. Le logo est cliquable et renvoie vers
// BoardGameGeek : la page du jeu si une URL est fournie, sinon l'accueil.
//
// NB : assets/images/powered-by-bgg.png est un placeholder. Remplace-le par le
// logo officiel « Powered by BGG » (téléchargeable sur BoardGameGeek), en
// gardant le même nom de fichier — il s'affichera automatiquement.

import { Image, Linking, StyleSheet, TouchableOpacity } from "react-native";

const LOGO = require("@/assets/images/powered-by-bgg.png");

export function PoweredByBgg({ url = "https://boardgamegeek.com" }: { url?: string }) {
  return (
    <TouchableOpacity
      accessibilityRole="link"
      accessibilityLabel="Powered by BoardGameGeek — ouvrir BoardGameGeek"
      onPress={() => Linking.openURL(url).catch(() => {})}
      hitSlop={8}
      style={styles.conteneur}
    >
      <Image
        source={LOGO}
        style={styles.logo}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  conteneur: { alignItems: "center", paddingVertical: 12 },
  logo: { width: 168, height: 25 },
});
