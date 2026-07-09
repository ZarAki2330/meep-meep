// components/dialogue-confirmation.tsx
// Dialogue de confirmation personnalisé, aux couleurs de l'app.

import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { type AppColors } from "@/constants/theme-colors";
import { useTheme } from "@/context/theme";

export function DialogueConfirmation({
  visible,
  titre,
  message,
  texteConfirmer = "Supprimer",
  texteAnnuler = "Annuler",
  onConfirmer,
  onAnnuler,
}: {
  visible: boolean;
  titre: string;
  message?: string;
  texteConfirmer?: string;
  texteAnnuler?: string;
  onConfirmer: () => void;
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
            <Text style={styles.pastilleTexte}>!</Text>
          </View>

          <Text style={styles.titre}>{titre}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}

          <View style={styles.actions}>
            <TouchableOpacity style={styles.annuler} activeOpacity={0.7} onPress={onAnnuler}>
              <Text style={styles.annulerTexte}>{texteAnnuler}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmer} activeOpacity={0.8} onPress={onConfirmer}>
              <Text style={styles.confirmerTexte}>{texteConfirmer}</Text>
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
      paddingHorizontal: 22,
      paddingTop: 24,
      paddingBottom: 18,
      alignItems: "center",
    },
    pastille: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: c.accentSoft,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 14,
    },
    pastilleTexte: { fontSize: 24, fontWeight: "700", color: c.accentText },
    titre: {
      fontSize: 18,
      fontWeight: "700",
      color: c.textPrimary,
      textAlign: "center",
    },
    message: {
      fontSize: 14,
      color: c.textSecondary,
      textAlign: "center",
      lineHeight: 20,
      marginTop: 8,
    },
    actions: { flexDirection: "row", gap: 10, marginTop: 22, width: "100%" },
    annuler: {
      flex: 1,
      paddingVertical: 13,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.borderStrong,
      alignItems: "center",
    },
    annulerTexte: { fontSize: 15, fontWeight: "600", color: c.textSecondary },
    confirmer: {
      flex: 1,
      paddingVertical: 13,
      borderRadius: 12,
      backgroundColor: c.danger,
      alignItems: "center",
    },
    confirmerTexte: { fontSize: 15, fontWeight: "600", color: c.onDanger },
  });
}
