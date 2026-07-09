// app/(tabs)/explore.tsx — Historique des parties

import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DialogueConfirmation } from "@/components/dialogue-confirmation";
import { POLICE_TITRE } from "@/constants/fonts";
import { type AppColors } from "@/constants/theme-colors";
import { useTheme } from "@/context/theme";
import {
  listerParties,
  supprimerPartie,
  type JoueurScore,
  type PartieEnregistree,
} from "@/db/parties";

export default function Historique() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [parties, setParties] = useState<PartieEnregistree[]>([]);

  const charger = useCallback(() => {
    listerParties()
      .then(setParties)
      .catch(() => setParties([]));
  }, []);

  // Recharge à chaque fois qu'on ouvre l'onglet.
  useFocusEffect(
    useCallback(() => {
      charger();
    }, [charger]),
  );

  const [aSupprimer, setASupprimer] = useState<PartieEnregistree | null>(null);

  async function effacer() {
    if (!aSupprimer) return;
    const id = aSupprimer.id;
    setASupprimer(null);
    await supprimerPartie(id).catch(() => {});
    charger();
  }

  const total = parties.length;
  const victoiresParJoueur: Record<string, number> = {};
  for (const p of parties) {
    if (p.gagnant) victoiresParJoueur[p.gagnant] = (victoiresParJoueur[p.gagnant] ?? 0) + 1;
  }
  const meilleur = Object.entries(victoiresParJoueur).sort((a, b) => b[1] - a[1])[0];

  return (
    <SafeAreaView style={styles.page} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.titre}>Historique</Text>
        <Text style={styles.sousTitre}>Tes parties enregistrées</Text>
      </View>

      {total > 0 && (
        <View style={styles.stats}>
          <View style={styles.statBloc}>
            <Text style={styles.statValeur}>{total}</Text>
            <Text style={styles.statLabel}>parties jouées</Text>
          </View>
          <View style={styles.statBloc}>
            <Text style={styles.statValeur}>{meilleur ? meilleur[0] : "—"}</Text>
            <Text style={styles.statLabel}>
              {meilleur ? `${meilleur[1]} victoire${meilleur[1] > 1 ? "s" : ""}` : "meilleur joueur"}
            </Text>
          </View>
        </View>
      )}

      <FlatList
        data={parties}
        keyExtractor={(p) => String(p.id)}
        contentContainerStyle={styles.liste}
        ListEmptyComponent={
          <View style={styles.vide}>
            <Text style={styles.videTitre}>Aucune partie pour l'instant</Text>
            <Text style={styles.videTexte}>
              Termine une partie depuis un jeu et elle apparaîtra ici.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.carte}>
            <View style={{ flex: 1 }}>
              <Text style={styles.jeuNom}>{item.jeu_nom}</Text>
              <Text style={styles.meta}>
                {formatDate(item.date)} · {item.nb_joueurs} joueurs
              </Text>
              <Text style={styles.joueurs} numberOfLines={2}>
                {nomsJoueurs(item)}
              </Text>
            </View>
            <View style={styles.droite}>
              <Text style={styles.gagnant}>🏆 {item.gagnant}</Text>
              {item.score_gagnant > 0 && (
                <Text style={styles.score}>{item.score_gagnant} pts</Text>
              )}
            </View>
            <TouchableOpacity style={styles.effacer} onPress={() => setASupprimer(item)}>
              <Text style={styles.effacerTexte}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      <DialogueConfirmation
        visible={aSupprimer !== null}
        titre="Supprimer cette partie ?"
        message={
          aSupprimer ? `${aSupprimer.jeu_nom} · ${formatDate(aSupprimer.date)}` : undefined
        }
        onConfirmer={effacer}
        onAnnuler={() => setASupprimer(null)}
      />
    </SafeAreaView>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function nomsJoueurs(p: PartieEnregistree) {
  try {
    const joueurs = JSON.parse(p.details) as JoueurScore[];
    return joueurs.map((j) => (j.role ? `${j.nom} (${j.role})` : j.nom)).join(", ");
  } catch {
    return "";
  }
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    page: { flex: 1, backgroundColor: c.page },
    header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
    titre: { fontSize: 30, fontFamily: POLICE_TITRE, color: c.accentText },
    sousTitre: { fontSize: 15, color: c.textMuted, marginTop: 2 },
    stats: { flexDirection: "row", gap: 12, paddingHorizontal: 16, marginBottom: 8 },
    statBloc: { flex: 1, backgroundColor: c.surfaceAlt, borderRadius: 12, padding: 12 },
    statValeur: { fontSize: 20, fontWeight: "700", color: c.textPrimary },
    statLabel: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    liste: { paddingHorizontal: 16, paddingBottom: 24, flexGrow: 1 },
    carte: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      padding: 14,
      marginBottom: 10,
    },
    jeuNom: { fontSize: 16, fontWeight: "600", color: c.textPrimary },
    meta: { fontSize: 13, color: c.textMuted, marginTop: 2 },
    joueurs: { fontSize: 12, color: c.textFaint, marginTop: 3 },
    droite: { alignItems: "flex-end", marginRight: 8 },
    gagnant: { fontSize: 13, color: c.accentText, fontWeight: "600" },
    score: { fontSize: 13, color: c.textMuted, marginTop: 2 },
    effacer: { padding: 6 },
    effacerTexte: { color: c.textFaint, fontSize: 15 },
    vide: { alignItems: "center", justifyContent: "center", paddingTop: 80, paddingHorizontal: 24 },
    videTitre: { fontSize: 17, fontWeight: "600", color: c.textPrimary, marginBottom: 6 },
    videTexte: { fontSize: 14, color: c.textMuted, textAlign: "center", lineHeight: 20 },
  });
}
