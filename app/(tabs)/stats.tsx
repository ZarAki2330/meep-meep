// app/(tabs)/stats.tsx — tableau de bord des statistiques

import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ListeDepliable } from "@/components/liste-depliable";
import { POLICE_TITRE } from "@/constants/fonts";
import { type AppColors } from "@/constants/theme-colors";
import { useJeux } from "@/context/jeux";
import { useTheme } from "@/context/theme";
import { listerParties, type PartieEnregistree } from "@/db/parties";
import { formatDuree } from "@/lib/duree";
import { lignesDe, personnesDe, vainqueursDe } from "@/lib/lignes-partie";

type Styles = ReturnType<typeof makeStyles>;
type StatJoueur = { nom: string; parties: number; victoires: number; meilleurScore: number };

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

/** Une note se lit « 4,3 » et jamais « 4.3 ». */
function formatNote(n: number) {
  return n.toFixed(1).replace(".", ",");
}

/** Les parties non notées ne comptent pas : une soirée oubliée n'est pas une mauvaise soirée. */
function notesDe(parties: PartieEnregistree[]): number[] {
  return parties
    .map((p) => p.evaluation)
    .filter((e): e is number => typeof e === "number" && e > 0);
}

function moyenne(notes: number[]): number | null {
  return notes.length ? notes.reduce((s, n) => s + n, 0) / notes.length : null;
}

export default function Statistiques() {
  const { colors } = useTheme();
  // Le catalogue dit si le moins de points gagne : les meilleurs scores en dépendent.
  const { jeux } = useJeux();
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
  const jeuxDispo = useMemo(() => {
    const comptes: Record<string, number> = {};
    for (const p of parties) comptes[p.jeu_nom] = (comptes[p.jeu_nom] ?? 0) + 1;
    return Object.entries(comptes).sort((a, b) => b[1] - a[1]);
  }, [parties]);

  const partiesFiltrees = useMemo(
    () => (jeuFiltre ? parties.filter((p) => p.jeu_nom === jeuFiltre) : parties),
    [parties, jeuFiltre],
  );
  const total = partiesFiltrees.length;

  // Un seul passage sur l'historique, refait seulement quand le filtre bouge.
  // Sans cela, le JSON de chaque partie était relu à chaque rendu de l'écran.
  const { jeuxTries, joueursTries, sommeJoueurs } = useMemo(() => {
    const parJeu: Record<string, number> = {};
    const parJoueur: Record<string, StatJoueur> = {};
    let somme = 0;

    for (const p of partiesFiltrees) {
      parJeu[p.jeu_nom] = (parJeu[p.jeu_nom] ?? 0) + 1;
      somme += p.nb_joueurs;

      const gagnants = new Set(vainqueursDe(p));
      const vus = new Set<string>();

      for (const j of lignesDe(p.details)) {
        // En mode équipes, la ligne représente une équipe : on crédite chaque membre.
        for (const nom of personnesDe(j)) {
          const s = (parJoueur[nom] ??= { nom, parties: 0, victoires: 0, meilleurScore: 0 });
          if (j.score > s.meilleurScore) s.meilleurScore = j.score;
          // Un joueur inscrit dans deux équipes n'a joué qu'une partie.
          if (vus.has(nom)) continue;
          vus.add(nom);
          s.parties++;
          if (gagnants.has(nom)) s.victoires++;
        }
      }
    }

    return {
      jeuxTries: Object.entries(parJeu).sort((a, b) => b[1] - a[1]),
      joueursTries: Object.values(parJoueur).sort(
        (a, b) => b.victoires - a.victoires || b.parties - a.parties,
      ),
      sommeJoueurs: somme,
    };
  }, [partiesFiltrees]);
  const jeuTop = jeuxTries[0];
  const joueurTop = joueursTries[0];
  const moyenneJoueurs = total ? String(Math.round(sommeJoueurs / total)) : "0";

  // Durées : seules les parties chronométrées comptent.
  const durees = partiesFiltrees.map((p) => p.duree ?? 0).filter((d) => d > 0);
  const dureeMoyenne = durees.length
    ? formatDuree(durees.reduce((s, d) => s + d, 0) / durees.length)
    : "—";
  const plusLongue = durees.length ? formatDuree(Math.max(...durees)) : "—";

  // Notes : la moyenne du filtre courant, et le classement des jeux.
  const notes = notesDe(partiesFiltrees);
  const noteMoyenne = moyenne(notes);

  const notesParJeu: Record<string, number[]> = {};
  for (const p of partiesFiltrees) {
    if (typeof p.evaluation === "number" && p.evaluation > 0) {
      (notesParJeu[p.jeu_nom] ??= []).push(p.evaluation);
    }
  }
  const jeuxNotes = Object.entries(notesParJeu)
    .map(([nom, ns]) => ({ nom, note: moyenne(ns) as number, nb: ns.length }))
    .sort((a, b) => b.note - a.note || b.nb - a.nb);

  /**
   * Meilleurs scores. Deux pièges :
   *  - au 6 qui prend, le MOINS de points gagne : le plus grand total y est le
   *    pire résultat. On ne connaît le sens que si un jeu est filtré.
   *  - un score peut être négatif (Skull King, militaire de 7 Wonders). Seul
   *    zéro est écarté : c'est le score des jeux sans points.
   */
  const jeuCourant = jeuFiltre
    ? jeux.find((j) => j.id === partiesFiltrees[0]?.jeu_id)
    : undefined;
  const sens = jeuCourant?.scoreVictoire ?? "max";

  const scores = partiesFiltrees
    .flatMap((p) => lignesDe(p.details).map((j) => ({ nom: j.nom, score: j.score, date: p.date })))
    .filter((s) => s.score !== 0)
    .sort((a, b) => (sens === "min" ? a.score - b.score : b.score - a.score))
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
          <Metrique
            valeur={noteMoyenne === null ? "—" : `${formatNote(noteMoyenne)} ★`}
            label={
              notes.length === 0
                ? "aucune partie notée"
                : `note moyenne · ${notes.length} partie${notes.length > 1 ? "s" : ""} notée${notes.length > 1 ? "s" : ""}`
            }
            styles={styles}
          />
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
            <ListeDepliable
              items={jeuxTries}
              singulier="jeu suivant"
              pluriel="autres jeux"
              rendu={([nom, nb]) => (
                <Barre key={nom} label={nom} valeur={nb} max={maxJeu} styles={styles} />
              )}
            />
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
          <ListeDepliable
            items={joueursTries}
            singulier="joueur suivant"
            pluriel="autres joueurs"
            rendu={(j, i) => {
              const taux = j.parties ? Math.round((j.victoires / j.parties) * 100) : 0;
              return (
                <View
                  key={j.nom}
                  style={styles.ligneJoueur}
                  accessible
                  accessibilityLabel={`${i + 1}. ${j.nom}, ${j.parties} parties, ${j.victoires} victoires, ${taux} pour cent`}
                >
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
            }}
          />
        </Section>

        {!jeuFiltre && jeuxNotes.length > 0 && (
          <Section titre="Jeux les mieux notés" styles={styles}>
            <ListeDepliable
              items={jeuxNotes}
              singulier="jeu suivant"
              pluriel="autres jeux"
              rendu={(j) => (
                <View
                  key={j.nom}
                  style={styles.ligneNote}
                  accessible
                  accessibilityLabel={`${j.nom}, ${formatNote(j.note)} sur 5, ${j.nb} parties notées`}
                >
                  <Text style={styles.noteNom} numberOfLines={1}>
                    {j.nom}
                  </Text>
                  <View style={styles.pisteNote}>
                    <View style={[styles.remplissageNote, { width: `${(j.note / 5) * 100}%` }]} />
                  </View>
                  <Text style={styles.noteValeur}>{formatNote(j.note)} ★</Text>
                  <Text style={styles.noteCompte}>({j.nb})</Text>
                </View>
              )}
            />
            <Text style={styles.noteAide}>
              Sur 5 étoiles. Entre parenthèses, le nombre de parties notées : une seule note pèse
              peu.
            </Text>
          </Section>
        )}

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
    // Une ligne se lit d'un bloc : « Catan, 5 ». Trois éléments séparés
    // obligeraient à balayer la barre décorative au passage.
    <View
      style={styles.barreLigne}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max, now: valeur, text: `${valeur} parties` }}
    >
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

    // Pas de maxHeight : les chips doivent pouvoir grandir avec la police.
    chips: { flexGrow: 0, marginBottom: 12 },
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

    ligneNote: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
    noteNom: { width: 96, fontSize: 13, color: c.textSecondary },
    pisteNote: { flex: 1, height: 10, borderRadius: 5, backgroundColor: c.surfaceAlt },
    remplissageNote: { height: 10, borderRadius: 5, backgroundColor: c.accent },
    noteValeur: { fontSize: 13, fontWeight: "700", color: c.accentText },
    noteCompte: { width: 28, textAlign: "right", fontSize: 12, color: c.textMuted },
    noteAide: { fontSize: 11, color: c.textMuted, lineHeight: 16, marginTop: 2 },

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
    rang: { width: 18, fontSize: 13, fontWeight: "700", color: c.textMuted },
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
