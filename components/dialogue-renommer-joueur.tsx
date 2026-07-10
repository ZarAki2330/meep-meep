// components/dialogue-renommer-joueur.tsx
// Renommer un joueur, ou le fusionner avec un autre. Le nouveau nom se propage
// à tout l'historique — c'est db/joueurs.ts qui s'en charge.
//
// Le dialogue vivait dans l'onglet Joueurs ; il sert maintenant depuis la fiche
// d'un joueur, d'où l'extraction.

import { useEffect, useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { type AppColors } from "@/constants/theme-colors";
import { useTheme } from "@/context/theme";
import { renommerJoueur, type JoueurEnregistre } from "@/db/joueurs";
import { type JoueurScore, type PartieEnregistree } from "@/db/parties";
import { supprimerImage } from "@/lib/images";

function lignesDe(p: PartieEnregistree): JoueurScore[] {
  try {
    return JSON.parse(p.details) as JoueurScore[];
  } catch {
    return [];
  }
}

export function DialogueRenommerJoueur({
  visible,
  nom,
  joueurs,
  parties,
  onAnnuler,
  onRenomme,
}: {
  visible: boolean;
  nom: string;
  joueurs: JoueurEnregistre[];
  parties: PartieEnregistree[];
  onAnnuler: () => void;
  /** Appelé après le renommage, avec le nom retenu. */
  onRenomme: (nouveauNom: string) => void;
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [saisie, setSaisie] = useState(nom);

  // Le dialogue se rouvre sur le nom courant, pas sur la saisie précédente.
  useEffect(() => {
    if (visible) setSaisie(nom);
  }, [visible, nom]);

  const cible = saisie.trim();
  const autres = joueurs.filter((j) => j.nom !== nom);
  const existant = autres.find((j) => j.nom.toLowerCase() === cible.toLowerCase());

  // Parties où les deux joueurs apparaissent : la fusion y créerait un doublon.
  const conflits = existant
    ? parties.filter((p) => {
        const noms = lignesDe(p).flatMap((l) => (l.membres?.length ? l.membres : [l.nom]));
        return noms.includes(nom) && noms.includes(existant.nom);
      }).length
    : 0;

  async function valider() {
    if (!cible || cible === nom) {
      onAnnuler();
      return;
    }
    // Une fusion peut laisser un portrait sans propriétaire : la base nous le rend.
    const res = await renommerJoueur(nom, cible).catch(() => null);
    await supprimerImage(res?.photoOrpheline);
    onRenomme(cible);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onAnnuler}>
      <TouchableOpacity style={styles.fond} activeOpacity={1} onPress={onAnnuler}>
        <TouchableOpacity style={styles.feuille} activeOpacity={1}>
          <Text style={styles.feuilleTitre}>Renommer ou fusionner</Text>
          <Text style={styles.feuilleTexte}>
            Le nouveau nom sera appliqué à tout l&apos;historique. Si tu saisis le nom d&apos;un
            joueur existant, les deux seront fusionnés.
          </Text>

          <TextInput
            style={styles.input}
            value={saisie}
            onChangeText={setSaisie}
            placeholder="Nom du joueur"
            placeholderTextColor={colors.placeholder}
            autoFocus
          />

          {autres.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chips}
              contentContainerStyle={styles.chipsContenu}
            >
              {autres.map((j) => (
                <TouchableOpacity key={j.id} style={styles.chip} onPress={() => setSaisie(j.nom)}>
                  <Text style={styles.chipTexte}>{j.nom}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {existant && (
            <View style={styles.avertissement}>
              <Text style={styles.avertissementTexte}>
                « {existant.nom} » existe déjà : les deux joueurs seront fusionnés, et leurs
                statistiques additionnées.
              </Text>
              {conflits > 0 && (
                <Text style={styles.avertissementFort}>
                  Attention : {conflits} partie{conflits > 1 ? "s" : ""} compte
                  {conflits > 1 ? "nt" : ""} les deux joueurs. Ils y apparaîtront deux fois.
                </Text>
              )}
            </View>
          )}

          <View style={styles.actions}>
            <TouchableOpacity style={styles.annuler} onPress={onAnnuler}>
              <Text style={styles.annulerTexte}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.valider} onPress={valider}>
              <Text style={styles.validerTexte}>{existant ? "Fusionner" : "Renommer"}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    fond: {
      flex: 1,
      backgroundColor: c.ombre,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 24,
    },
    feuille: {
      width: "100%",
      maxWidth: 420,
      backgroundColor: c.surface,
      borderRadius: 18,
      padding: 18,
    },
    feuilleTitre: { fontSize: 18, fontWeight: "700", color: c.textPrimary },
    feuilleTexte: { fontSize: 13, color: c.textMuted, marginTop: 6, lineHeight: 19 },
    input: {
      backgroundColor: c.surfaceAlt,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 11,
      fontSize: 16,
      color: c.textPrimary,
      marginTop: 14,
    },
    chips: { maxHeight: 44, marginTop: 10, flexGrow: 0 },
    chipsContenu: { gap: 8, alignItems: "center" },
    chip: {
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surfaceAlt,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    chipTexte: { fontSize: 13, color: c.textSecondary, fontWeight: "600" },
    avertissement: { backgroundColor: c.warningSoft, borderRadius: 10, padding: 12, marginTop: 12 },
    avertissementTexte: { fontSize: 12, color: c.warningText, lineHeight: 17 },
    avertissementFort: {
      fontSize: 12,
      color: c.warningText,
      fontWeight: "700",
      marginTop: 6,
      lineHeight: 17,
    },
    actions: { flexDirection: "row", gap: 10, marginTop: 18 },
    annuler: {
      flex: 1,
      paddingVertical: 13,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.borderStrong,
      alignItems: "center",
    },
    annulerTexte: { fontSize: 15, fontWeight: "600", color: c.textSecondary },
    valider: {
      flex: 1,
      paddingVertical: 13,
      borderRadius: 12,
      backgroundColor: c.accent,
      alignItems: "center",
    },
    validerTexte: { fontSize: 15, fontWeight: "600", color: c.onAccent },
  });
}
