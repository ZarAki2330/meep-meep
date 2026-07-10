// components/liste-depliable.tsx
// Une liste qui ne montre que ses premières lignes, et se déplie à la demande.
//
// Les tableaux de statistiques s'allongent avec la ludothèque : vingt jeux,
// quinze joueurs, et l'écran devient un rouleau. Ici, on en montre cinq.

import { useState, type ReactNode } from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";

import { type AppColors } from "@/constants/theme-colors";
import { useTheme } from "@/context/theme";

export function ListeDepliable<T>({
  items,
  limite = 5,
  singulier = "autre",
  pluriel = "autres",
  rendu,
}: {
  items: T[];
  /** Nombre de lignes visibles tant qu'on n'a pas déplié. */
  limite?: number;
  /** Pour le libellé : « Voir le jeu suivant » / « Voir les 12 autres jeux ». */
  singulier?: string;
  pluriel?: string;
  rendu: (item: T, index: number) => ReactNode;
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [deplie, setDeplie] = useState(false);

  // Une liste à peine plus longue que la limite ne mérite pas de bouton :
  // cacher une seule ligne demanderait autant de place que de l'afficher.
  const depliable = items.length > limite + 1;
  const visibles = depliable && !deplie ? items.slice(0, limite) : items;
  const caches = items.length - limite;

  return (
    <>
      {visibles.map((item, i) => rendu(item, i))}

      {depliable && (
        <TouchableOpacity
          style={styles.bouton}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityState={{ expanded: deplie }}
          accessibilityLabel={
            deplie ? "Réduire" : `Voir les ${caches} ${caches > 1 ? pluriel : singulier}`
          }
          onPress={() => setDeplie((d) => !d)}
        >
          <Text style={styles.texte}>
            {deplie ? "Réduire" : `Voir les ${caches} ${caches > 1 ? pluriel : singulier}`}
          </Text>
          {/* Le chevron redit le texte : muet pour le lecteur d'écran. */}
          <Text style={styles.chevron} accessibilityElementsHidden importantForAccessibility="no">
            {deplie ? "▴" : "▾"}
          </Text>
        </TouchableOpacity>
      )}
    </>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    bouton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingTop: 10,
      marginTop: 2,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    texte: { fontSize: 13, fontWeight: "600", color: c.accentText },
    chevron: { fontSize: 11, color: c.accentText },
  });
}
