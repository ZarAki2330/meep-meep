// components/aucun-joueur.tsx
// État vide d'une partie : tant qu'aucun joueur n'a été ajouté, on affiche au
// centre une invitation claire (icône + texte + bouton), plutôt qu'une liste ou
// un tableau vide. Les joueurs déjà enregistrés sont proposés en accès rapide.

import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { type AppColors } from "@/constants/theme-colors";
import { useTheme } from "@/context/theme";

export function AucunJoueur({
  prefixe,
  onAjouter,
  joueursDispo = [],
  onAjouterNomme,
}: {
  /** « Joueur » ou « Équipe », selon le jeu. */
  prefixe: string;
  onAjouter: () => void;
  /** Noms de joueurs déjà enregistrés, proposés en un tap. */
  joueursDispo?: string[];
  onAjouterNomme?: (nom: string) => void;
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  // « Équipe » est féminin : « Aucune équipe », « Ajouter une équipe ».
  const feminin = prefixe === "Équipe";
  const min = prefixe.toLowerCase(); // « joueur » / « équipe »
  const article = feminin ? "une" : "un";
  const aucun = feminin ? "Aucune" : "Aucun";
  const pluriel = feminin ? "les équipes" : "les joueurs";

  return (
    <View style={styles.zone}>
      <View style={styles.rond}>
        <IconSymbol name="person.2.fill" size={28} color={colors.accentText} />
      </View>
      <Text style={styles.titre}>
        {aucun} {min} pour l&apos;instant
      </Text>
      <Text style={styles.sous}>Ajoute {pluriel} qui participent à la partie.</Text>

      <TouchableOpacity
        style={styles.bouton}
        activeOpacity={0.85}
        onPress={onAjouter}
        accessibilityRole="button"
        accessibilityLabel={`Ajouter ${article} ${min}`}
      >
        <IconSymbol name="plus" size={18} color={colors.onAccent} />
        <Text style={styles.boutonTexte}>
          Ajouter {article} {min}
        </Text>
      </TouchableOpacity>

      {onAjouterNomme && joueursDispo.length > 0 && (
        <View style={styles.dispoBloc}>
          <Text style={styles.dispoLabel}>Déjà enregistrés</Text>
          <View style={styles.chips}>
            {joueursDispo.map((nom) => (
              <TouchableOpacity
                key={nom}
                style={styles.chip}
                onPress={() => onAjouterNomme(nom)}
                accessibilityRole="button"
                accessibilityLabel={`Ajouter ${nom}`}
              >
                <Text style={styles.chipTexte}>+ {nom}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    zone: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
    rond: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: c.accentSoft,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
    },
    titre: { fontSize: 17, fontWeight: "700", color: c.textPrimary, textAlign: "center" },
    sous: {
      fontSize: 14,
      color: c.textMuted,
      textAlign: "center",
      lineHeight: 20,
      marginTop: 4,
      marginBottom: 18,
      maxWidth: 280,
    },
    bouton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: c.accent,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 12,
    },
    boutonTexte: { color: c.onAccent, fontSize: 15, fontWeight: "600" },
    dispoBloc: { marginTop: 26, alignItems: "center" },
    dispoLabel: {
      fontSize: 12,
      color: c.textMuted,
      fontWeight: "600",
      marginBottom: 10,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" },
    chip: {
      borderWidth: 1,
      borderColor: c.accent,
      backgroundColor: c.accentSoft,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    chipTexte: { color: c.accentText, fontSize: 13, fontWeight: "600", lineHeight: 18 },
  });
}
