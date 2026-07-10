// components/dialogue-premier-joueur.tsx
// Tire au sort qui commence la partie.

import { useEffect, useRef, useState } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { type AppColors } from "@/constants/theme-colors";
import { useTheme } from "@/context/theme";

function tirer(noms: string[]): string | null {
  const valides = noms.map((n) => n.trim()).filter(Boolean);
  if (valides.length === 0) return null;
  return valides[Math.floor(Math.random() * valides.length)];
}

export function DialoguePremierJoueur({
  visible,
  noms,
  onFermer,
}: {
  visible: boolean;
  noms: string[];
  onFermer: () => void;
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [choisi, setChoisi] = useState<string | null>(null);
  const etaitVisible = useRef(false);

  // On ne tire qu'à l'ouverture : "noms" change d'identité à chaque rendu.
  useEffect(() => {
    if (visible && !etaitVisible.current) setChoisi(tirer(noms));
    etaitVisible.current = visible;
  }, [visible, noms]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onFermer}>
      <TouchableOpacity style={styles.fond} activeOpacity={1} onPress={onFermer}>
        <TouchableOpacity style={styles.carte} activeOpacity={1}>
          <View style={styles.pastille}>
            <Text style={styles.de}>🎲</Text>
          </View>

          <Text style={styles.titre}>Qui commence ?</Text>

          {choisi ? (
            <Text style={styles.nom}>{choisi}</Text>
          ) : (
            <Text style={styles.vide}>Donne d&apos;abord un nom aux joueurs.</Text>
          )}

          <View style={styles.actions}>
            <TouchableOpacity style={styles.relancer} onPress={() => setChoisi(tirer(noms))}>
              <Text style={styles.relancerTexte}>Relancer</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.fermer} onPress={onFermer}>
              <Text style={styles.fermerTexte}>C&apos;est parti</Text>
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
      paddingHorizontal: 28,
    },
    carte: {
      width: "100%",
      maxWidth: 400,
      backgroundColor: c.surface,
      borderRadius: 20,
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 16,
      alignItems: "center",
    },
    pastille: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: c.accentSoft,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 14,
    },
    de: { fontSize: 28 },
    titre: { fontSize: 16, fontWeight: "600", color: c.textSecondary },
    nom: {
      fontSize: 26,
      fontWeight: "700",
      color: c.accentText,
      textAlign: "center",
      marginTop: 8,
    },
    vide: { fontSize: 14, color: c.textMuted, textAlign: "center", marginTop: 8 },
    actions: { flexDirection: "row", gap: 10, marginTop: 22, width: "100%" },
    relancer: {
      flex: 1,
      paddingVertical: 13,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.borderStrong,
      alignItems: "center",
    },
    relancerTexte: { fontSize: 15, fontWeight: "600", color: c.textSecondary },
    fermer: {
      flex: 1,
      paddingVertical: 13,
      borderRadius: 12,
      backgroundColor: c.accent,
      alignItems: "center",
    },
    fermerTexte: { fontSize: 15, fontWeight: "600", color: c.onAccent },
  });
}
