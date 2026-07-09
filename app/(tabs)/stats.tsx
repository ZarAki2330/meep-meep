// app/(tabs)/stats.tsx — tableau de bord des statistiques

import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState, type ReactNode } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { POLICE_TITRE } from "@/constants/fonts";
import { type AppColors } from "@/constants/theme-colors";
import { useTheme } from "@/context/theme";
import { listerParties, type JoueurScore, type PartieEnregistree } from "@/db/parties";
import { formatDuree } from "@/lib/duree";

type Styles = ReturnType<typeof makeStyles>;
type StatJoueur = { nom: string; parties: number; victoires: number; meilleurScore: number };

function joueursDe(p: PartieEnregistree): JoueurScore[] {
  try {
    return JSON.parse(p.details) as JoueurScore[];
  } catch {
    return [];
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export default function Statistiques() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [parties, setParties] = useState<PartieEnregistree[]>([]);
  const [jeuFiltre, setJeuFiltre] = useState<string | null>(null);

  const charger = useCallback(() => {
    listerParties()
      .then(setParties)
      .catch(() => setParties([]));
  }, []);

  useFocusEffect(
    useCallback(() => {
      charger();
    }, [charger]),
  );

  // Liste des jeux présents dans l'historique, du plus joué au moins joué.
  const comptesJeux: Record<string, number> = {};
  for (const p of parties) comptesJeux[p.jeu_nom] = (comptesJeux[p.jeu_nom] ?? 0) + 1;
  const jeuxDispo = Object.entries(comptesJeux).sort((a, b) => b[1] - a[1]);

  const partiesFiltrees = jeuFiltre ? parties.filter((p) => p.jeu_nom === jeuFiltre) : parties;
  const total = partiesFiltrees.length;

  const parJeu: Record<string, number> = {};
  const parJoueur: Record<string, StatJoueur> = {};
  let sommeJoueurs = 0;

  for (const p of partiesFiltrees) {
    parJeu[p.jeu_nom] = (parJeu[p.jeu_nom] ?? 0) + 1;
    sommeJoueurs += p.nb_joueurs;
    for (const j of joueursDe(p)) {
      // En mode équipes, la ligne représente une équipe : on crédite chaque membre.
      const noms = j.membres?.length ? j.membres : [j.nom];
      for (const nom of noms) {
        const s = (parJoueur[nom] ??= { nom, parties: 0, victoires: 0, meilleurScore: 0 });
        s.parties++;
        if (j.score > s.meilleurScore) s.meilleurScore = j.score;
        if (p.gagnant === j.nom) s.victoires++;
      }
    }
  }

  const jeuxTries = Object.entries(parJeu).sort((a, b) => b[1] - a[1]);
  const joueursTries = Object.values(parJoueur).sort(
    (a, b) => b.victoires - a.victoires || b.parties - a.parties,
  );
  const jeuTop = jeuxTries[0];
  const joueurTop = joueursTries[0];
  const moyenneJoueurs = total ? String(Math.round(sommeJoueurs / total)) : "0";

  // Durées : seules les parties chronométrées comptent.
  const durees = partiesFiltrees.map((p) => p.duree ?? 0).filter((d) => d > 0);
  const dureeMoyenne = durees.length
    ? formatDuree(durees.reduce((s, d) => s + d, 0) / durees.length)
    : "—";
  const plusLongue = durees.length ? formatDuree(Math.max(...durees)) : "—";

  // Meilleurs scores (uniquement pertinent pour les jeux à points)
  const scores = partiesFiltrees
    .flatMap((p) => joueursDe(p).map((j) => ({ nom: j.nom, score: j.score, date: p.date })))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  // Activité des 6 derniers mois
  const mois: { label: string; nb: number }[] = [];
  const maintenant = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(maintenant.getFullYear(), maintenant.getMonth() - i, 1);
    const nb = partiesFiltrees.filter((p) => {
      const dp = new Date(p.date);
      return dp.getFullYear() === d.getFullYear() && dp.getMonth() === d.getMonth();
    }).length;
    mois.push({ label: d.toLocaleDateString("fr-FR", { month: "short" }), nb });
  }
  const maxMois = Math.max(...mois.map((m) => m.nb), 1);
  const maxJeu = jeuxTries.length ? jeuxTries[0][1] : 1;

  const entete = (
    <View style={styles.header}>
      <Text style={styles.titre}>Statistiques</Text>
      <Text style={styles.sousTitre}>
        {jeuFiltre ? jeuFiltre : "Tous les jeux confondus"}
      </Text>
    </View>
  );

  if (parties.length === 0) {
    return (
      <SafeAreaView style={styles.page} edges={["top"]}>
        {entete}
        <View style={styles.vide}>
          <Text style={styles.videTitre}>Pas encore de données</Text>
          <Text style={styles.videTexte}>
            Termine quelques parties et tes statistiques apparaîtront ici.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.page} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.contenu}>
        {entete}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chips}
          contentContainerStyle={styles.chipsContenu}
        >
          <Chip
            label="Tous les jeux"
            actif={jeuFiltre === null}
            onPress={() => setJeuFiltre(null)}
            styles={styles}
          />
          {jeuxDispo.map(([nom, nb]) => (
            <Chip
              key={nom}
              label={`${nom} (${nb})`}
              actif={jeuFiltre === nom}
              onPress={() => setJeuFiltre(jeuFiltre === nom ? null : nom)}
              styles={styles}
            />
          ))}
        </ScrollView>

        <View style={styles.grilleCartes}>
          <Metrique valeur={String(total)} label="parties jouées" styles={styles} />
          <Metrique valeur={String(joueursTries.length)} label="joueurs différents" styles={styles} />
          <Metrique valeur={moyenneJoueurs} label="joueurs en moyenne" styles={styles} />
          <Metrique
            valeur={jeuFiltre ? String(scores[0]?.score ?? 0) : String(jeuxTries.length)}
            label={jeuFiltre ? "meilleur score" : "jeux différents"}
            styles={styles}
          />
          <Metrique valeur={dureeMoyenne} label="durée moyenne" styles={styles} />
          <Metrique valeur={plusLongue} label="partie la plus longue" styles={styles} />
        </View>

        <View style={styles.miseEnAvant}>
          {!jeuFiltre && jeuTop && (
            <View style={styles.miseEnAvantBloc}>
              <Text style={styles.miseEnAvantLabel}>Jeu le plus joué</Text>
              <Text style={styles.miseEnAvantValeur} numberOfLines={1}>
                {jeuTop[0]}
              </Text>
              <Text style={styles.miseEnAvantDetail}>
                {jeuTop[1]} partie{jeuTop[1] > 1 ? "s" : ""}
              </Text>
            </View>
          )}
          {joueurTop && (
            <View style={styles.miseEnAvantBloc}>
              <Text style={styles.miseEnAvantLabel}>
                {jeuFiltre ? "Meilleur joueur sur ce jeu" : "Meilleur joueur"}
              </Text>
              <Text style={styles.miseEnAvantValeur} numberOfLines={1}>
                🏆 {joueurTop.nom}
              </Text>
              <Text style={styles.miseEnAvantDetail}>
                {joueurTop.victoires} victoire{joueurTop.victoires > 1 ? "s" : ""}
              </Text>
            </View>
          )}
        </View>

        {!jeuFiltre && (
          <Section titre="Parties par jeu" styles={styles}>
            {jeuxTries.map(([nom, nb]) => (
              <Barre key={nom} label={nom} valeur={nb} max={maxJeu} styles={styles} />
            ))}
          </Section>
        )}

        <Section
          titre={jeuFiltre ? `Classement — ${jeuFiltre}` : "Classement des joueurs"}
          styles={styles}
        >
          <View style={styles.entete}>
            <Text style={[styles.enteteTexte, { flex: 1 }]}>Joueur</Text>
            <Text style={styles.enteteCol}>Parties</Text>
            <Text style={styles.enteteCol}>Vict.</Text>
            <Text style={styles.enteteCol}>Taux</Text>
          </View>
          {joueursTries.map((j, i) => {
            const taux = j.parties ? Math.round((j.victoires / j.parties) * 100) : 0;
            return (
              <View key={j.nom} style={styles.ligneJoueur}>
                <View style={styles.rangEtNom}>
                  <Text style={[styles.rang, i === 0 && styles.rangPremier]}>{i + 1}</Text>
                  <Text style={styles.nomJoueur} numberOfLines={1}>
                    {j.nom}
                  </Text>
                </View>
                <Text style={styles.valeurCol}>{j.parties}</Text>
                <Text style={styles.valeurCol}>{j.victoires}</Text>
                <Text style={[styles.valeurCol, styles.taux]}>{taux}%</Text>
              </View>
            );
          })}
        </Section>

        {scores.length > 0 && (
          <Section titre="Meilleurs scores" styles={styles}>
            {scores.map((s, i) => (
              <View key={`${s.nom}-${i}`} style={styles.ligneScore}>
                <Text style={[styles.rang, i === 0 && styles.rangPremier]}>{i + 1}</Text>
                <Text style={styles.nomJoueur} numberOfLines={1}>
                  {s.nom}
                </Text>
                <Text style={styles.dateScore}>{formatDate(s.date)}</Text>
                <Text style={styles.grosScore}>{s.score}</Text>
              </View>
            ))}
          </Section>
        )}

        <Section titre="Activité des 6 derniers mois" styles={styles}>
          <View style={styles.histogramme}>
            {mois.map((m, i) => (
              <View key={i} style={styles.colonneMois}>
                <Text style={styles.nbMois}>{m.nb || ""}</Text>
                <View style={styles.pisteMois}>
                  <View
                    style={[
                      styles.barreMois,
                      { height: `${Math.max((m.nb / maxMois) * 100, m.nb ? 6 : 2)}%` },
                    ]}
                  />
                </View>
                <Text style={styles.labelMois}>{m.label.replace(".", "")}</Text>
              </View>
            ))}
          </View>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Chip({
  label,
  actif,
  onPress,
  styles,
}: {
  label: string;
  actif: boolean;
  onPress: () => void;
  styles: Styles;
}) {
  return (
    <TouchableOpacity style={[styles.chip, actif && styles.chipActif]} onPress={onPress}>
      <Text style={[styles.chipTexte, actif && styles.chipTexteActif]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function Metrique({ valeur, label, styles }: { valeur: string; label: string; styles: Styles }) {
  return (
    <View style={styles.carteMetrique}>
      <Text style={styles.metriqueValeur}>{valeur}</Text>
      <Text style={styles.metriqueLabel}>{label}</Text>
    </View>
  );
}

function Section({
  titre,
  children,
  styles,
}: {
  titre: string;
  children: ReactNode;
  styles: Styles;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitre}>{titre}</Text>
      <View style={styles.carte}>{children}</View>
    </View>
  );
}

function Barre({
  label,
  valeur,
  max,
  styles,
}: {
  label: string;
  valeur: number;
  max: number;
  styles: Styles;
}) {
  return (
    <View style={styles.barreLigne}>
      <Text style={styles.barreLabel} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.piste}>
        <View style={[styles.remplissage, { width: `${(valeur / max) * 100}%` }]} />
      </View>
      <Text style={styles.barreValeur}>{valeur}</Text>
    </View>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    page: { flex: 1, backgroundColor: c.page },
    contenu: { paddingBottom: 28 },
    header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10 },
    titre: { fontSize: 30, fontFamily: POLICE_TITRE, color: c.accentText },
    sousTitre: { fontSize: 15, color: c.textMuted, marginTop: 2 },

    chips: { maxHeight: 46, flexGrow: 0, marginBottom: 12 },
    chipsContenu: { gap: 8, paddingHorizontal: 16, alignItems: "center" },
    chip: {
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surfaceAlt,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 7,
      maxWidth: 200,
    },
    chipActif: { backgroundColor: c.accent, borderColor: c.accent },
    chipTexte: { fontSize: 13, color: c.textSecondary, fontWeight: "600" },
    chipTexteActif: { color: c.onAccent },

    grilleCartes: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingHorizontal: 16 },
    carteMetrique: {
      flexGrow: 1,
      flexBasis: "45%",
      backgroundColor: c.surfaceAlt,
      borderRadius: 12,
      padding: 14,
    },
    metriqueValeur: { fontSize: 24, fontWeight: "700", color: c.textPrimary },
    metriqueLabel: { fontSize: 12, color: c.textMuted, marginTop: 2 },

    miseEnAvant: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginTop: 10 },
    miseEnAvantBloc: { flex: 1, backgroundColor: c.accentSoft, borderRadius: 12, padding: 14 },
    miseEnAvantLabel: { fontSize: 12, color: c.accentText, fontWeight: "600" },
    miseEnAvantValeur: { fontSize: 16, fontWeight: "700", color: c.textPrimary, marginTop: 4 },
    miseEnAvantDetail: { fontSize: 12, color: c.textMuted, marginTop: 2 },

    section: { marginTop: 22, paddingHorizontal: 16 },
    sectionTitre: { fontSize: 17, fontWeight: "600", color: c.textPrimary, marginBottom: 10 },
    carte: {
      backgroundColor: c.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      padding: 14,
    },

    barreLigne: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
    barreLabel: { width: 96, fontSize: 13, color: c.textSecondary },
    piste: { flex: 1, height: 10, borderRadius: 5, backgroundColor: c.surfaceAlt },
    remplissage: { height: 10, borderRadius: 5, backgroundColor: c.accent },
    barreValeur: { width: 22, textAlign: "right", fontSize: 13, fontWeight: "600", color: c.textPrimary },

    entete: {
      flexDirection: "row",
      alignItems: "center",
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    enteteTexte: { fontSize: 12, color: c.textMuted, fontWeight: "600" },
    enteteCol: { width: 52, textAlign: "right", fontSize: 12, color: c.textMuted, fontWeight: "600" },
    ligneJoueur: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    rangEtNom: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
    rang: { width: 18, fontSize: 13, fontWeight: "700", color: c.textFaint },
    rangPremier: { color: c.accentText },
    nomJoueur: { flex: 1, fontSize: 14, fontWeight: "600", color: c.textPrimary },
    valeurCol: { width: 52, textAlign: "right", fontSize: 14, color: c.textSecondary },
    taux: { fontWeight: "700", color: c.accentText },

    ligneScore: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    dateScore: { fontSize: 12, color: c.textMuted },
    grosScore: { fontSize: 16, fontWeight: "700", color: c.accentText, width: 52, textAlign: "right" },

    histogramme: { flexDirection: "row", alignItems: "flex-end", height: 150, gap: 8 },
    colonneMois: { flex: 1, alignItems: "center", height: "100%" },
    nbMois: { fontSize: 11, color: c.textMuted, marginBottom: 4, height: 14 },
    pisteMois: { flex: 1, width: "100%", justifyContent: "flex-end" },
    barreMois: { width: "100%", borderRadius: 6, backgroundColor: c.accent, minHeight: 3 },
    labelMois: { fontSize: 11, color: c.textMuted, marginTop: 6 },

    vide: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
    videTitre: { fontSize: 17, fontWeight: "600", color: c.textPrimary, marginBottom: 6 },
    videTexte: { fontSize: 14, color: c.textMuted, textAlign: "center", lineHeight: 20 },
  });
}
