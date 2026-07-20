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
  // "danger" (rouge, défaut) pour une suppression ; "accent" pour une action
  // positive comme un ajout.
  variante = "danger",
  onConfirmer,
  onAnnuler,
  // Fermeture sans choisir (fond ou bouton retour). Par défaut, revient à
  // « annuler » ; on peut le distinguer pour ne rien faire quand aucun bouton
  // n'a été pressé (ex. proposition d'ajout/suppression facultative).
  onFermer,
}: {
  visible: boolean;
  titre: string;
  message?: string;
  texteConfirmer?: string;
  texteAnnuler?: string;
  variante?: "danger" | "accent";
  onConfirmer: () => void;
  onAnnuler: () => void;
  onFermer?: () => void;
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const confirmerFond = variante === "accent" ? colors.accent : colors.danger;
  const confirmerTexte = variante === "accent" ? colors.onAccent : colors.onDanger;
  const fermer = onFermer ?? onAnnuler;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={fermer}
    >
      <TouchableOpacity
        style={styles.fond}
        activeOpacity={1}
        accessibilityRole="button"
        accessibilityLabel="Fermer"
        onPress={fermer}
      >
        {/* Tant que le dialogue est là, le reste de l'écran n'existe pas. */}
        <TouchableOpacity style={styles.carte} activeOpacity={1} accessibilityViewIsModal>
          <View style={styles.pastille} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Text style={styles.pastilleTexte}>!</Text>
          </View>

          <Text style={styles.titre} accessibilityRole="header">
            {titre}
          </Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.annuler}
              activeOpacity={0.7}
              accessibilityRole="button"
              onPress={onAnnuler}
            >
              <Text style={styles.annulerTexte}>{texteAnnuler}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmer, { backgroundColor: confirmerFond }]}
              activeOpacity={0.8}
              accessibilityRole="button"
              onPress={onConfirmer}
            >
              <Text style={[styles.confirmerTexte, { color: confirmerTexte }]}>
                {texteConfirmer}
              </Text>
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
      minHeight: 48,
      paddingVertical: 12,
      paddingHorizontal: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.borderStrong,
      alignItems: "center",
      justifyContent: "center",
    },
    annulerTexte: {
      fontSize: 15,
      fontWeight: "600",
      color: c.textSecondary,
      textAlign: "center",
    },
    confirmer: {
      flex: 1,
      minHeight: 48,
      paddingVertical: 12,
      paddingHorizontal: 10,
      borderRadius: 12,
      backgroundColor: c.danger,
      alignItems: "center",
      justifyContent: "center",
    },
    confirmerTexte: { fontSize: 15, fontWeight: "600", color: c.onDanger, textAlign: "center" },
  });
}
