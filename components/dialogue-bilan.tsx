// components/dialogue-bilan.tsx
// À la fin d'une partie : lui donner une note et consigner une anecdote.

import { useEffect, useRef, useState } from "react";
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { type AppColors } from "@/constants/theme-colors";
import { useTheme } from "@/context/theme";
import { IconSymbol } from "./ui/icon-symbol";

const LIBELLES = ["", "Décevante", "Moyenne", "Bonne", "Très bonne", "Mémorable"];

export function DialogueBilan({
  visible,
  evaluationInitiale = 0,
  noteInitiale = "",
  onEnregistrer,
  onPasser,
}: {
  visible: boolean;
  evaluationInitiale?: number;
  noteInitiale?: string;
  onEnregistrer: (evaluation: number, note: string) => void;
  onPasser: () => void;
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [evaluation, setEvaluation] = useState(evaluationInitiale);
  const [note, setNote] = useState(noteInitiale);
  const etaitVisible = useRef(false);

  useEffect(() => {
    if (visible && !etaitVisible.current) {
      setEvaluation(evaluationInitiale);
      setNote(noteInitiale);
    }
    etaitVisible.current = visible;
  }, [visible, evaluationInitiale, noteInitiale]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onPasser}>
      <TouchableOpacity style={styles.fond} activeOpacity={1} onPress={onPasser}>
        <TouchableOpacity style={styles.carte} activeOpacity={1}>
          <Text style={styles.titre}>Comment était cette partie ?</Text>

          <View style={styles.etoiles}>
            {[1, 2, 3, 4, 5].map((n) => (
              <TouchableOpacity
                key={n}
                hitSlop={4}
                onPress={() => setEvaluation(evaluation === n ? 0 : n)}
              >
                <IconSymbol
                  name={n <= evaluation ? "star.fill" : "star"}
                  size={34}
                  color={n <= evaluation ? colors.accent : colors.textFaint}
                />
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.libelle}>
            {evaluation > 0 ? LIBELLES[evaluation] : "Touche une étoile (facultatif)"}
          </Text>

          <TextInput
            style={styles.note}
            value={note}
            onChangeText={setNote}
            placeholder="Une anecdote à retenir ? Un coup de génie, une trahison…"
            placeholderTextColor={colors.placeholder}
            multiline
          />

          <View style={styles.actions}>
            <TouchableOpacity style={styles.passer} onPress={onPasser}>
              <Text style={styles.passerTexte}>Passer</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.valider}
              onPress={() => onEnregistrer(evaluation, note)}
            >
              <Text style={styles.validerTexte}>Enregistrer</Text>
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
      paddingHorizontal: 26,
    },
    carte: {
      width: "100%",
      maxWidth: 420,
      backgroundColor: c.surface,
      borderRadius: 20,
      paddingHorizontal: 20,
      paddingTop: 22,
      paddingBottom: 14,
    },
    titre: { fontSize: 18, fontWeight: "700", color: c.textPrimary, textAlign: "center" },
    etoiles: {
      flexDirection: "row",
      justifyContent: "center",
      gap: 10,
      marginTop: 16,
    },
    libelle: {
      fontSize: 13,
      color: c.textMuted,
      textAlign: "center",
      marginTop: 8,
      marginBottom: 16,
    },
    note: {
      backgroundColor: c.surfaceAlt,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      padding: 12,
      minHeight: 90,
      textAlignVertical: "top",
      fontSize: 14,
      color: c.textPrimary,
      lineHeight: 20,
    },
    actions: { flexDirection: "row", gap: 10, marginTop: 16 },
    passer: {
      flex: 1,
      paddingVertical: 13,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.borderStrong,
      alignItems: "center",
    },
    passerTexte: { fontSize: 15, fontWeight: "600", color: c.textSecondary },
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
