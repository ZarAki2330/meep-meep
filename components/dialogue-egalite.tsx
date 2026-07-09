// components/dialogue-egalite.tsx
// Quand plusieurs joueurs terminent à égalité : départager ou enregistrer l'égalité.

import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { type AppColors } from "@/constants/theme-colors";
import { useTheme } from "@/context/theme";

export function DialogueEgalite({
  visible,
  noms,
  onDepartager,
  onEgalite,
  onAnnuler,
}: {
  visible: boolean;
  noms: string[];
  onDepartager: (nom: string) => void;
  onEgalite: () => void;
  onAnnuler: () => void;
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onAnnuler}
    >
      <TouchableOpacity style={styles.fond} activeOpacity={1} onPress={onAnnuler}>
        <TouchableOpacity style={styles.carte} activeOpacity={1}>
          <View style={styles.pastille}>
            <Text style={styles.pastilleTexte}>🤝</Text>
          </View>

          <Text style={styles.titre}>Égalité !</Text>
          <Text style={styles.message}>
            {noms.join(", ")} terminent au même score. Choisis un vainqueur pour départager, ou
            enregistre le résultat comme une égalité.
          </Text>

          <ScrollView style={{ maxHeight: 240, width: "100%" }}>
            {noms.map((nom) => (
              <TouchableOpacity
                key={nom}
                style={styles.choix}
                activeOpacity={0.7}
                onPress={() => onDepartager(nom)}
              >
                <Text style={styles.choixTexte}>🏆 {nom} l&apos;emporte</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity style={styles.egalite} activeOpacity={0.8} onPress={onEgalite}>
            <Text style={styles.egaliteTexte}>Enregistrer une égalité</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.annuler} activeOpacity={0.7} onPress={onAnnuler}>
            <Text style={styles.annulerTexte}>Annuler</Text>
          </TouchableOpacity>
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
      paddingHorizontal: 26,
    },
    carte: {
      width: "100%",
      maxWidth: 400,
      backgroundColor: c.surface,
      borderRadius: 20,
      paddingHorizontal: 20,
      paddingTop: 22,
      paddingBottom: 12,
      alignItems: "center",
    },
    pastille: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: c.accentSoft,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
    },
    pastilleTexte: { fontSize: 22 },
    titre: { fontSize: 19, fontWeight: "700", color: c.textPrimary },
    message: {
      fontSize: 14,
      color: c.textSecondary,
      textAlign: "center",
      lineHeight: 20,
      marginTop: 8,
      marginBottom: 16,
    },
    choix: {
      backgroundColor: c.surfaceAlt,
      borderRadius: 12,
      paddingVertical: 13,
      alignItems: "center",
      marginBottom: 8,
    },
    choixTexte: { fontSize: 15, fontWeight: "600", color: c.textPrimary },
    egalite: {
      width: "100%",
      backgroundColor: c.accent,
      borderRadius: 12,
      paddingVertical: 13,
      alignItems: "center",
      marginTop: 6,
    },
    egaliteTexte: { fontSize: 15, fontWeight: "600", color: c.onAccent },
    annuler: { paddingVertical: 12, marginTop: 2 },
    annulerTexte: { fontSize: 14, fontWeight: "600", color: c.textMuted },
  });
}
