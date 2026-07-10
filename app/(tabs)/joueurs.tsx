// app/(tabs)/joueurs.tsx — joueurs récurrents + statistiques par joueur

import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import {
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DialogueConfirmation } from "@/components/dialogue-confirmation";
import { POLICE_TITRE } from "@/constants/fonts";
import { type AppColors } from "@/constants/theme-colors";
import { useTheme } from "@/context/theme";
import {
  ajouterJoueur,
  listerJoueurs,
  renommerJoueur,
  supprimerJoueur,
  type JoueurEnregistre,
} from "@/db/joueurs";
import { listerParties, type JoueurScore, type PartieEnregistree } from "@/db/parties";

type Stat = { jouees: number; victoires: number; favori: string | null };

export default function Joueurs() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [joueurs, setJoueurs] = useState<JoueurEnregistre[]>([]);
  const [parties, setParties] = useState<PartieEnregistree[]>([]);
  const [nouveau, setNouveau] = useState("");

  const charger = useCallback(() => {
    listerJoueurs().then(setJoueurs).catch(() => setJoueurs([]));
    listerParties().then(setParties).catch(() => setParties([]));
  }, []);

  useFocusEffect(
    useCallback(() => {
      charger();
    }, [charger]),
  );

  async function ajouter() {
    const nom = nouveau.trim();
    if (!nom) return;
    setNouveau("");
    await ajouterJoueur(nom).catch(() => {});
    charger();
  }

  const [aRetirer, setARetirer] = useState<JoueurEnregistre | null>(null);
  const [aModifier, setAModifier] = useState<JoueurEnregistre | null>(null);
  const [nouveauNom, setNouveauNom] = useState("");

  function joueursDe(p: PartieEnregistree): JoueurScore[] {
    try {
      return JSON.parse(p.details) as JoueurScore[];
    } catch {
      return [];
    }
  }

  const nomCible = nouveauNom.trim();
  const autresJoueurs = joueurs.filter((j) => j.id !== aModifier?.id);
  const cibleExistante = autresJoueurs.find(
    (j) => j.nom.toLowerCase() === nomCible.toLowerCase(),
  );
  // Parties où les deux joueurs apparaissent : la fusion y créerait un doublon.
  const conflits =
    aModifier && cibleExistante
      ? parties.filter((p) => {
          const noms = joueursDe(p).map((j) => j.nom);
          return noms.includes(aModifier.nom) && noms.includes(cibleExistante.nom);
        }).length
      : 0;

  function ouvrirModification(j: JoueurEnregistre) {
    setAModifier(j);
    setNouveauNom(j.nom);
  }

  async function validerModification() {
    if (!aModifier || !nomCible || nomCible === aModifier.nom) {
      setAModifier(null);
      return;
    }
    const ancien = aModifier.nom;
    setAModifier(null);
    await renommerJoueur(ancien, nomCible).catch(() => {});
    charger();
  }

  async function retirer() {
    if (!aRetirer) return;
    const id = aRetirer.id;
    setARetirer(null);
    await supprimerJoueur(id).catch(() => {});
    charger();
  }

  function statsPour(nom: string): Stat {
    let jouees = 0;
    let victoires = 0;
    const jeux: Record<string, number> = {};
    for (const p of parties) {
      let lignes: JoueurScore[] = [];
      try {
        lignes = JSON.parse(p.details) as JoueurScore[];
      } catch {
        lignes = [];
      }
      // Une ligne peut être un joueur, ou une équipe dont il est membre.
      const sienne = lignes.find((l) =>
        l.membres?.length ? l.membres.includes(nom) : l.nom === nom,
      );
      if (sienne) {
        jouees++;
        jeux[p.jeu_nom] = (jeux[p.jeu_nom] ?? 0) + 1;
        // En coopératif, la victoire est celle de toute la table.
        if (p.resultat ? p.resultat === "victoire" : p.gagnant === sienne.nom) victoires++;
      }
    }
    const favori = Object.entries(jeux).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    return { jouees, victoires, favori };
  }

  return (
    <SafeAreaView style={styles.page} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.titre}>Joueurs</Text>
        <Text style={styles.sousTitre}>Tes joueurs et leurs statistiques</Text>
      </View>

      <View style={styles.ajoutLigne}>
        <TextInput
          style={styles.input}
          value={nouveau}
          onChangeText={setNouveau}
          placeholder="Nom d'un joueur"
          placeholderTextColor={colors.placeholder}
          onSubmitEditing={ajouter}
          returnKeyType="done"
        />
        <TouchableOpacity style={styles.ajoutBouton} onPress={ajouter}>
          <Text style={styles.ajoutBoutonTexte}>Ajouter</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={joueurs}
        keyExtractor={(j) => String(j.id)}
        contentContainerStyle={styles.liste}
        ListEmptyComponent={
          <View style={styles.vide}>
            <Text style={styles.videTitre}>Aucun joueur enregistré</Text>
            <Text style={styles.videTexte}>
              Ajoute un joueur ci-dessus, ou termine une partie : les noms utilisés
              apparaîtront ici automatiquement.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const s = statsPour(item.nom);
          return (
            <TouchableOpacity
              style={styles.carte}
              activeOpacity={0.7}
              onPress={() => ouvrirModification(item)}
            >
              <View style={styles.pastille}>
                <Text style={styles.pastilleTexte}>{item.nom.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.nom}>{item.nom}</Text>
                <Text style={styles.stat}>
                  {s.jouees} partie{s.jouees > 1 ? "s" : ""} · {s.victoires} victoire
                  {s.victoires > 1 ? "s" : ""}
                </Text>
                {s.favori && <Text style={styles.favori}>Jeu favori : {s.favori}</Text>}
              </View>
              <TouchableOpacity style={styles.retirer} onPress={() => setARetirer(item)}>
                <Text style={styles.retirerTexte}>✕</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
      />

      <Modal
        visible={aModifier !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setAModifier(null)}
      >
        <TouchableOpacity style={styles.fond} activeOpacity={1} onPress={() => setAModifier(null)}>
          <TouchableOpacity style={styles.feuille} activeOpacity={1}>
            <Text style={styles.feuilleTitre}>Renommer ou fusionner</Text>
            <Text style={styles.feuilleTexte}>
              Le nouveau nom sera appliqué à tout l&apos;historique. Si tu saisis le nom d&apos;un
              joueur existant, les deux seront fusionnés.
            </Text>

            <TextInput
              style={styles.inputModal}
              value={nouveauNom}
              onChangeText={setNouveauNom}
              placeholder="Nom du joueur"
              placeholderTextColor={colors.placeholder}
              autoFocus
            />

            {autresJoueurs.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.chips}
                contentContainerStyle={styles.chipsContenu}
              >
                {autresJoueurs.map((j) => (
                  <TouchableOpacity
                    key={j.id}
                    style={styles.chip}
                    onPress={() => setNouveauNom(j.nom)}
                  >
                    <Text style={styles.chipTexte}>{j.nom}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {cibleExistante && (
              <View style={styles.avertissement}>
                <Text style={styles.avertissementTexte}>
                  « {cibleExistante.nom} » existe déjà : les deux joueurs seront fusionnés, et leurs
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

            <View style={styles.actionsModal}>
              <TouchableOpacity style={styles.annuler} onPress={() => setAModifier(null)}>
                <Text style={styles.annulerTexte}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.valider} onPress={validerModification}>
                <Text style={styles.validerTexte}>
                  {cibleExistante ? "Fusionner" : "Renommer"}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <DialogueConfirmation
        visible={aRetirer !== null}
        titre="Retirer ce joueur ?"
        message={
          aRetirer
            ? `${aRetirer.nom} sera retiré de ta liste. Ses parties passées restent dans l'historique.`
            : undefined
        }
        texteConfirmer="Retirer"
        onConfirmer={retirer}
        onAnnuler={() => setARetirer(null)}
      />
    </SafeAreaView>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    page: { flex: 1, backgroundColor: c.page },
    header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
    titre: { fontSize: 30, fontFamily: POLICE_TITRE, color: c.accentText },
    sousTitre: { fontSize: 15, color: c.textMuted, marginTop: 2 },
    ajoutLigne: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginBottom: 12 },
    input: {
      flex: 1,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      color: c.textPrimary,
    },
    ajoutBouton: {
      backgroundColor: c.accent,
      borderRadius: 10,
      paddingHorizontal: 16,
      justifyContent: "center",
    },
    ajoutBoutonTexte: { color: c.onAccent, fontWeight: "600", fontSize: 15 },
    liste: { paddingHorizontal: 16, paddingBottom: 24, flexGrow: 1 },
    carte: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: c.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      padding: 14,
      marginBottom: 10,
    },
    pastille: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.accentSoft,
      alignItems: "center",
      justifyContent: "center",
    },
    pastilleTexte: { color: c.accentText, fontWeight: "700", fontSize: 16 },
    nom: { fontSize: 16, fontWeight: "600", color: c.textPrimary },
    stat: { fontSize: 13, color: c.textSecondary, marginTop: 2 },
    favori: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    retirer: { padding: 6 },
    retirerTexte: { color: c.textFaint, fontSize: 15 },
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
    inputModal: {
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
    avertissement: {
      backgroundColor: c.warningSoft,
      borderRadius: 10,
      padding: 12,
      marginTop: 12,
    },
    avertissementTexte: { fontSize: 12, color: c.warningText, lineHeight: 17 },
    avertissementFort: {
      fontSize: 12,
      color: c.warningText,
      fontWeight: "700",
      marginTop: 6,
      lineHeight: 17,
    },
    actionsModal: { flexDirection: "row", gap: 10, marginTop: 18 },
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
    vide: { alignItems: "center", justifyContent: "center", paddingTop: 80, paddingHorizontal: 24 },
    videTitre: { fontSize: 17, fontWeight: "600", color: c.textPrimary, marginBottom: 6 },
    videTexte: { fontSize: 14, color: c.textMuted, textAlign: "center", lineHeight: 20 },
  });
}
