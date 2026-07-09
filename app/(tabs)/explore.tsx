// app/(tabs)/explore.tsx — Historique des parties

import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { FlatList, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DialogueConfirmation } from "@/components/dialogue-confirmation";
import { POLICE_TITRE } from "@/constants/fonts";
import { type AppColors } from "@/constants/theme-colors";
import { useJeux } from "@/context/jeux";
import { useTheme } from "@/context/theme";
import { type Jeu } from "@/data/jeux";
import {
  listerParties,
  supprimerPartie,
  type JoueurScore,
  type PartieEnregistree,
} from "@/db/parties";

export default function Historique() {
  const { colors } = useTheme();
  const { jeux } = useJeux();
  const styles = makeStyles(colors);
  const [parties, setParties] = useState<PartieEnregistree[]>([]);
  const [detail, setDetail] = useState<PartieEnregistree | null>(null);

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
          <TouchableOpacity
            style={styles.carte}
            activeOpacity={0.7}
            onPress={() => setDetail(item)}
          >
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
              <Text style={styles.gagnant}>
                {item.gagnant ? `🏆 ${item.gagnant}` : "🤝 Égalité"}
              </Text>
              {item.score_gagnant > 0 && (
                <Text style={styles.score}>{item.score_gagnant} pts</Text>
              )}
            </View>
            <TouchableOpacity style={styles.effacer} onPress={() => setASupprimer(item)}>
              <Text style={styles.effacerTexte}>✕</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />

      <Modal
        visible={detail !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setDetail(null)}
      >
        <TouchableOpacity style={styles.fond} activeOpacity={1} onPress={() => setDetail(null)}>
          <TouchableOpacity style={styles.feuille} activeOpacity={1}>
            {detail && <DetailPartie partie={detail} jeux={jeux} styles={styles} />}
            <TouchableOpacity style={styles.fermer} onPress={() => setDetail(null)}>
              <Text style={styles.fermerTexte}>Fermer</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

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

function formatDateLongue(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function DetailPartie({
  partie,
  jeux,
  styles,
}: {
  partie: PartieEnregistree;
  jeux: Jeu[];
  styles: ReturnType<typeof makeStyles>;
}) {
  const jeu = jeux.find((j) => j.id === partie.jeu_id);
  const sens = jeu?.scoreVictoire ?? "max";
  const objectif = jeu?.scoreMode === "objectif";

  const joueurs = [...joueursDe(partie)];
  if (objectif) {
    joueurs.sort((a, b) => (a.nom === partie.gagnant ? -1 : b.nom === partie.gagnant ? 1 : 0));
  } else {
    joueurs.sort((a, b) => (sens === "min" ? a.score - b.score : b.score - a.score));
  }

  // Égalité : aucun gagnant enregistré, on met en avant tous ceux au meilleur score.
  const egalite = !partie.gagnant;

  return (
    <>
      <Text style={styles.detailTitre}>{partie.jeu_nom}</Text>
      <Text style={styles.detailDate}>{formatDateLongue(partie.date)}</Text>
      {egalite && <Text style={styles.detailEgalite}>🤝 Partie terminée sur une égalité</Text>}
      {!objectif && (
        <Text style={styles.detailSens}>
          {sens === "min" ? "Le moins de points gagne" : "Le plus de points gagne"}
        </Text>
      )}

      <ScrollView style={{ maxHeight: 340 }}>
        {joueurs.map((j, i) => {
          const estGagnant = egalite
            ? j.score === partie.score_gagnant
            : j.nom === partie.gagnant;
          return (
            <View key={`${j.nom}-${i}`} style={[styles.detailLigne, estGagnant && styles.detailGagnant]}>
              <Text style={[styles.detailRang, estGagnant && styles.detailRangGagnant]}>
                {estGagnant ? (egalite ? "🤝" : "🏆") : i + 1}
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailNom}>{j.nom}</Text>
                {j.role && <Text style={styles.detailRole}>{j.role}</Text>}
              </View>
              {!objectif && <Text style={styles.detailScore}>{j.score}</Text>}
            </View>
          );
        })}
      </ScrollView>
    </>
  );
}

function joueursDe(p: PartieEnregistree): JoueurScore[] {
  try {
    return JSON.parse(p.details) as JoueurScore[];
  } catch {
    return [];
  }
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
      paddingHorizontal: 18,
      paddingTop: 20,
      paddingBottom: 12,
    },
    detailTitre: { fontSize: 20, fontWeight: "700", color: c.textPrimary },
    detailDate: { fontSize: 13, color: c.textMuted, marginTop: 2, textTransform: "capitalize" },
    detailSens: { fontSize: 12, color: c.accentText, fontWeight: "600", marginTop: 8 },
    detailEgalite: { fontSize: 13, color: c.textSecondary, fontWeight: "600", marginTop: 8 },
    detailLigne: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 10,
      borderRadius: 10,
      marginTop: 8,
      backgroundColor: c.surfaceAlt,
    },
    detailGagnant: { backgroundColor: c.successSoft },
    detailRang: { width: 24, textAlign: "center", fontSize: 14, fontWeight: "700", color: c.textFaint },
    detailRangGagnant: { fontSize: 16 },
    detailNom: { fontSize: 15, fontWeight: "600", color: c.textPrimary },
    detailRole: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    detailScore: { fontSize: 18, fontWeight: "700", color: c.textPrimary },
    fermer: { alignItems: "center", paddingVertical: 14, marginTop: 6 },
    fermerTexte: { fontSize: 15, fontWeight: "600", color: c.accentText },
  });
}
