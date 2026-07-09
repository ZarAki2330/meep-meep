// components/selecteur-membres.tsx
// Choisir les joueurs qui composent une équipe.

import { useEffect, useRef, useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { type AppColors } from "@/constants/theme-colors";
import { useTheme } from "@/context/theme";

export function SelecteurMembres({
  visible,
  equipe,
  membres,
  joueursConnus,
  onValider,
  onAnnuler,
}: {
  visible: boolean;
  equipe: string;
  membres: string[];
  joueursConnus: string[];
  onValider: (membres: string[]) => void;
  onAnnuler: () => void;
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [choisis, setChoisis] = useState<string[]>(membres);
  const [nouveau, setNouveau] = useState("");
  const etaitVisible = useRef(false);

  // On ne recharge la sélection qu'à l'ouverture : le tableau "membres" change
  // d'identité à chaque rendu du parent, il ne doit pas déclencher de remise à zéro.
  useEffect(() => {
    if (visible && !etaitVisible.current) {
      setChoisis(membres);
      setNouveau("");
    }
    etaitVisible.current = visible;
  }, [visible, membres]);

  function basculer(nom: string) {
    setChoisis((prev) => (prev.includes(nom) ? prev.filter((n) => n !== nom) : [...prev, nom]));
  }

  function ajouter() {
    const nom = nouveau.trim();
    if (!nom || choisis.includes(nom)) return;
    setChoisis((prev) => [...prev, nom]);
    setNouveau("");
  }

  const suggestions = joueursConnus.filter((n) => !choisis.includes(n));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onAnnuler}
    >
      <TouchableOpacity style={styles.fond} activeOpacity={1} onPress={onAnnuler}>
        <TouchableOpacity style={styles.carte} activeOpacity={1}>
          <Text style={styles.titre}>Membres de {equipe}</Text>
          <Text style={styles.aide}>
            Les victoires de l&apos;équipe seront créditées à chacun de ses membres.
          </Text>

          <ScrollView style={{ maxHeight: 260 }}>
            {choisis.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitre}>Dans l&apos;équipe</Text>
                <View style={styles.chipsWrap}>
                  {choisis.map((nom) => (
                    <TouchableOpacity key={nom} style={styles.chipActif} onPress={() => basculer(nom)}>
                      <Text style={styles.chipTexteActif}>{nom} ✕</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {suggestions.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitre}>Joueurs enregistrés</Text>
                <View style={styles.chipsWrap}>
                  {suggestions.map((nom) => (
                    <TouchableOpacity key={nom} style={styles.chip} onPress={() => basculer(nom)}>
                      <Text style={styles.chipTexte}>+ {nom}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.ajoutLigne}>
            <TextInput
              style={styles.input}
              value={nouveau}
              onChangeText={setNouveau}
              placeholder="Nouveau joueur"
              placeholderTextColor={colors.placeholder}
              onSubmitEditing={ajouter}
              returnKeyType="done"
            />
            <TouchableOpacity style={styles.ajoutBouton} onPress={ajouter}>
              <Text style={styles.ajoutBoutonTexte}>Ajouter</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.annuler} onPress={onAnnuler}>
              <Text style={styles.annulerTexte}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.valider} onPress={() => onValider(choisis)}>
              <Text style={styles.validerTexte}>Valider</Text>
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
    carte: {
      width: "100%",
      maxWidth: 420,
      backgroundColor: c.surface,
      borderRadius: 18,
      padding: 18,
    },
    titre: { fontSize: 18, fontWeight: "700", color: c.textPrimary },
    aide: { fontSize: 12, color: c.textMuted, marginTop: 4, marginBottom: 12, lineHeight: 17 },
    section: { marginBottom: 12 },
    sectionTitre: { fontSize: 12, fontWeight: "700", color: c.textSecondary, marginBottom: 8 },
    chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: {
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surfaceAlt,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    chipTexte: { fontSize: 13, color: c.textSecondary, fontWeight: "600" },
    chipActif: {
      borderWidth: 1,
      borderColor: c.accent,
      backgroundColor: c.accent,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    chipTexteActif: { fontSize: 13, color: c.onAccent, fontWeight: "600" },
    ajoutLigne: { flexDirection: "row", gap: 8, marginTop: 4 },
    input: {
      flex: 1,
      backgroundColor: c.surfaceAlt,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: c.textPrimary,
    },
    ajoutBouton: {
      backgroundColor: c.accentSoft,
      borderRadius: 10,
      paddingHorizontal: 14,
      justifyContent: "center",
    },
    ajoutBoutonTexte: { color: c.accentText, fontWeight: "600", fontSize: 14 },
    actions: { flexDirection: "row", gap: 10, marginTop: 16 },
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
