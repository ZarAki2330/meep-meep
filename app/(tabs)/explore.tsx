// app/(tabs)/explore.tsx — Historique des parties

import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import {
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DialogueConfirmation } from "@/components/dialogue-confirmation";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { POLICE_TITRE } from "@/constants/fonts";
import { type AppColors } from "@/constants/theme-colors";
import { useJeux } from "@/context/jeux";
import { useTheme } from "@/context/theme";
import { type Jeu } from "@/data/jeux";
import { formatDuree } from "@/lib/duree";
import {
  listerParties,
  modifierPartie,
  noterPartie,
  supprimerPartie,
  type JoueurScore,
  type PartieEnregistree,
  type Resultat,
} from "@/db/parties";

type PeriodeCle = "mois" | "trimestre" | "annee";

const PERIODES: Record<PeriodeCle, { label: string; jours: number }> = {
  mois: { label: "30 derniers jours", jours: 30 },
  trimestre: { label: "3 derniers mois", jours: 91 },
  annee: { label: "12 derniers mois", jours: 365 },
};

const CLES_PERIODE = Object.keys(PERIODES) as PeriodeCle[];

export default function Historique() {
  const { colors } = useTheme();
  const { jeux } = useJeux();
  const styles = makeStyles(colors);
  const [parties, setParties] = useState<PartieEnregistree[]>([]);
  const [detail, setDetail] = useState<PartieEnregistree | null>(null);

  const [recherche, setRecherche] = useState("");
  const [jeuFiltre, setJeuFiltre] = useState<string | null>(null);
  const [joueurFiltre, setJoueurFiltre] = useState<string | null>(null);
  const [periode, setPeriode] = useState<PeriodeCle | null>(null);
  const [filtresOuverts, setFiltresOuverts] = useState(false);

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

  // Listes proposées dans les filtres, tirées de l'historique.
  const jeuxDispo = useMemo(() => {
    const compte: Record<string, number> = {};
    for (const p of parties) compte[p.jeu_nom] = (compte[p.jeu_nom] ?? 0) + 1;
    return Object.entries(compte).sort((a, b) => b[1] - a[1]);
  }, [parties]);

  const joueursDispo = useMemo(() => {
    const noms = new Set<string>();
    for (const p of parties) for (const j of joueursDe(p)) noms.add(j.nom);
    return Array.from(noms).sort((a, b) => a.localeCompare(b, "fr"));
  }, [parties]);

  const nbFiltres = (jeuFiltre ? 1 : 0) + (joueurFiltre ? 1 : 0) + (periode ? 1 : 0);

  const partiesFiltrees = useMemo(() => {
    const texte = recherche.trim().toLowerCase();
    const limite = periode ? Date.now() - PERIODES[periode].jours * 86400000 : 0;

    return parties.filter((p) => {
      const noms = joueursDe(p).map((j) => j.nom);

      if (texte) {
        const dansJeu = p.jeu_nom.toLowerCase().includes(texte);
        const dansJoueurs = noms.some((n) => n.toLowerCase().includes(texte));
        if (!dansJeu && !dansJoueurs) return false;
      }
      if (jeuFiltre && p.jeu_nom !== jeuFiltre) return false;
      if (joueurFiltre && !noms.includes(joueurFiltre)) return false;
      if (periode && new Date(p.date).getTime() < limite) return false;
      return true;
    });
  }, [parties, recherche, jeuFiltre, joueurFiltre, periode]);

  function reinitialiser() {
    setJeuFiltre(null);
    setJoueurFiltre(null);
    setPeriode(null);
  }

  const total = partiesFiltrees.length;
  const victoiresParJoueur: Record<string, number> = {};
  for (const p of partiesFiltrees) {
    if (p.resultat === "victoire") {
      // Coopératif gagné : la victoire revient à toute la table.
      for (const j of joueursDe(p)) {
        for (const nom of j.membres?.length ? j.membres : [j.nom]) {
          victoiresParJoueur[nom] = (victoiresParJoueur[nom] ?? 0) + 1;
        }
      }
    } else if (!p.resultat && p.gagnant) {
      victoiresParJoueur[p.gagnant] = (victoiresParJoueur[p.gagnant] ?? 0) + 1;
    }
  }
  const meilleur = Object.entries(victoiresParJoueur).sort((a, b) => b[1] - a[1])[0];

  return (
    <SafeAreaView style={styles.page} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.titre}>Historique</Text>
        <Text style={styles.sousTitre}>Tes parties enregistrées</Text>
      </View>

      {parties.length > 0 && (
        <>
          <View style={styles.rechercheLigne}>
            <View style={styles.rechercheChamp}>
              <IconSymbol name="magnifyingglass" size={18} color={colors.textMuted} />
              <TextInput
                style={styles.rechercheInput}
                value={recherche}
                onChangeText={setRecherche}
                placeholder="Jeu ou joueur"
                placeholderTextColor={colors.placeholder}
              />
              {recherche.length > 0 && (
                <TouchableOpacity onPress={() => setRecherche("")}>
                  <IconSymbol name="xmark" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={[styles.filtreBouton, nbFiltres > 0 && styles.filtreBoutonActif]}
              onPress={() => setFiltresOuverts((o) => !o)}
            >
              <IconSymbol
                name="slider.horizontal.3"
                size={20}
                color={nbFiltres > 0 ? colors.onAccent : colors.textSecondary}
              />
              {nbFiltres > 0 && (
                <View style={styles.filtreBadge}>
                  <Text style={styles.filtreBadgeTexte}>{nbFiltres}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {filtresOuverts && (
            <View style={styles.panneau}>
              <Groupe titre="Jeu" styles={styles}>
                {jeuxDispo.map(([nom, nb]) => (
                  <Chip
                    key={nom}
                    label={`${nom} (${nb})`}
                    actif={jeuFiltre === nom}
                    onPress={() => setJeuFiltre((v) => (v === nom ? null : nom))}
                    styles={styles}
                  />
                ))}
              </Groupe>

              <Groupe titre="Joueur" styles={styles}>
                {joueursDispo.map((nom) => (
                  <Chip
                    key={nom}
                    label={nom}
                    actif={joueurFiltre === nom}
                    onPress={() => setJoueurFiltre((v) => (v === nom ? null : nom))}
                    styles={styles}
                  />
                ))}
              </Groupe>

              <Groupe titre="Période" styles={styles}>
                {CLES_PERIODE.map((cle) => (
                  <Chip
                    key={cle}
                    label={PERIODES[cle].label}
                    actif={periode === cle}
                    onPress={() => setPeriode((v) => (v === cle ? null : cle))}
                    styles={styles}
                  />
                ))}
              </Groupe>

              {nbFiltres > 0 && (
                <TouchableOpacity onPress={reinitialiser}>
                  <Text style={styles.reset}>Réinitialiser les filtres</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </>
      )}

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
        data={partiesFiltrees}
        keyExtractor={(p) => String(p.id)}
        contentContainerStyle={styles.liste}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.vide}>
            <Text style={styles.videTitre}>
              {parties.length === 0 ? "Aucune partie pour l'instant" : "Aucun résultat"}
            </Text>
            <Text style={styles.videTexte}>
              {parties.length === 0
                ? "Termine une partie depuis un jeu et elle apparaîtra ici."
                : "Aucune partie ne correspond à ta recherche."}
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
                {item.duree ? ` · ${formatDuree(item.duree)}` : ""}
              </Text>
              <Text style={styles.joueurs} numberOfLines={2}>
                {nomsJoueurs(item)}
              </Text>
            </View>
            <View style={styles.droite}>
              <Text style={[styles.gagnant, item.resultat === "defaite" && styles.perdue]}>
                {issueCourte(item)}
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
        onRequestClose={() => setDetail(null)}
      >
        <TouchableOpacity style={styles.fond} activeOpacity={1} onPress={() => setDetail(null)}>
          <TouchableOpacity style={styles.feuille} activeOpacity={1}>
            {detail && (
              <DetailPartie
                partie={detail}
                jeux={jeux}
                styles={styles}
                onFermer={() => setDetail(null)}
                onEnregistre={() => {
                  setDetail(null);
                  charger();
                }}
              />
            )}
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

/** Résumé de l'issue, en quelques caractères, pour la liste. */
function issueCourte(p: PartieEnregistree) {
  if (p.resultat === "victoire") return "🏆 Tous";
  if (p.resultat === "defaite") return "Défaite";
  return p.gagnant ? `🏆 ${p.gagnant}` : "🤝 Égalité";
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
  onFermer,
  onEnregistre,
}: {
  partie: PartieEnregistree;
  jeux: Jeu[];
  styles: ReturnType<typeof makeStyles>;
  onFermer: () => void;
  onEnregistre: () => void;
}) {
  const jeu = jeux.find((j) => j.id === partie.jeu_id);
  const sens = jeu?.scoreVictoire ?? "max";
  // Une partie coopérative se reconnaît à son issue, même si le jeu a été supprimé.
  const coop = partie.resultat !== null;
  const objectif = coop || jeu?.scoreMode === "objectif";

  const [edition, setEdition] = useState(false);
  const [lignes, setLignes] = useState<JoueurScore[]>(joueursDe(partie));
  const [gagnant, setGagnant] = useState(partie.gagnant);
  const [resultat, setResultat] = useState<Resultat | null>(partie.resultat);
  const [evaluation, setEvaluation] = useState(partie.evaluation ?? 0);
  const [note, setNote] = useState(partie.note ?? "");

  function definirScore(index: number, texte: string) {
    const negatif = texte.trimStart().startsWith("-");
    const propre = (negatif ? "-" : "") + texte.replace(/[^0-9]/g, "");
    const n = parseInt(propre, 10);
    setLignes((prev) =>
      prev.map((l, i) => (i === index ? { ...l, score: isNaN(n) ? 0 : n } : l)),
    );
  }

  async function enregistrer() {
    const scores = lignes.map((l) => l.score);
    const scoreGagnant = gagnant
      ? (lignes.find((l) => l.nom === gagnant)?.score ?? 0)
      : objectif || scores.length === 0
        ? 0
        : sens === "min"
          ? Math.min(...scores)
          : Math.max(...scores);
    await modifierPartie(partie.id, lignes, coop ? "" : gagnant, scoreGagnant, resultat).catch(
      () => {},
    );
    await noterPartie(partie.id, evaluation, note).catch(() => {});
    onEnregistre();
  }

  // Affichage : tri et mise en avant du (ou des) vainqueur(s).
  const affichees = [...lignes];
  if (coop) {
    // Personne ne devance personne : on garde l'ordre de la table.
  } else if (objectif) {
    affichees.sort((a, b) => (a.nom === gagnant ? -1 : b.nom === gagnant ? 1 : 0));
  } else {
    affichees.sort((a, b) => (sens === "min" ? a.score - b.score : b.score - a.score));
  }
  const egalite = !coop && !gagnant;
  const meilleur = affichees.length ? affichees[0].score : 0;

  return (
    <>
      <Text style={styles.detailTitre}>{partie.jeu_nom}</Text>
      <Text style={styles.detailDate}>
        {formatDateLongue(partie.date)}
        {partie.duree ? ` · ⏱ ${formatDuree(partie.duree)}` : ""}
      </Text>
      {!edition && egalite && (
        <Text style={styles.detailEgalite}>🤝 Partie terminée sur une égalité</Text>
      )}
      {coop && !edition && (
        <Text style={styles.detailEgalite}>
          {resultat === "victoire"
            ? "🏆 Victoire de toute la table"
            : "Le jeu l'a emporté ce jour-là"}
        </Text>
      )}
      {!objectif && (
        <Text style={styles.detailSens}>
          {sens === "min" ? "Le moins de points gagne" : "Le plus de points gagne"}
        </Text>
      )}

      {edition && (
        <Text style={styles.detailAide}>
          {coop
            ? "Corrige l'issue de la partie ci-dessous."
            : "Corrige les scores, puis touche un joueur pour désigner le vainqueur."}
        </Text>
      )}

      <ScrollView style={{ maxHeight: 320 }}>
        {(edition ? lignes : affichees).map((j, i) => {
          const estGagnant = coop
            ? resultat === "victoire"
            : edition
              ? j.nom === gagnant
              : egalite
                ? j.score === meilleur
                : j.nom === gagnant;
          const Conteneur = edition && !coop ? TouchableOpacity : View;
          return (
            <Conteneur
              key={`${j.nom}-${i}`}
              style={[styles.detailLigne, estGagnant && styles.detailGagnant]}
              activeOpacity={0.7}
              onPress={edition && !coop ? () => setGagnant(j.nom) : undefined}
            >
              <Text style={[styles.detailRang, estGagnant && styles.detailRangGagnant]}>
                {coop
                  ? estGagnant
                    ? "🏆"
                    : "·"
                  : estGagnant
                    ? egalite && !edition
                      ? "🤝"
                      : "🏆"
                    : edition
                      ? "·"
                      : i + 1}
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailNom}>{j.nom}</Text>
                {j.membres?.length ? (
                  <Text style={styles.detailRole}>{j.membres.join(" · ")}</Text>
                ) : j.role ? (
                  <Text style={styles.detailRole}>{j.role}</Text>
                ) : null}
              </View>
              {!objectif &&
                (edition ? (
                  <TextInput
                    style={styles.detailInput}
                    value={String(j.score)}
                    onChangeText={(t) => definirScore(i, t)}
                    keyboardType={Platform.OS === "ios" ? "numbers-and-punctuation" : "numeric"}
                    textAlign="center"
                    selectTextOnFocus
                  />
                ) : (
                  <Text style={styles.detailScore}>{j.score}</Text>
                ))}
            </Conteneur>
          );
        })}
      </ScrollView>

      {edition && coop && (
        <View style={styles.issues}>
          <TouchableOpacity
            style={[styles.egaliteChip, { flex: 1 }, resultat === "defaite" && styles.egaliteChipActif]}
            onPress={() => setResultat("defaite")}
          >
            <Text
              style={[
                styles.egaliteChipTexte,
                resultat === "defaite" && styles.egaliteChipTexteActif,
              ]}
            >
              Défaite
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.egaliteChip, { flex: 1 }, resultat === "victoire" && styles.egaliteChipActif]}
            onPress={() => setResultat("victoire")}
          >
            <Text
              style={[
                styles.egaliteChipTexte,
                resultat === "victoire" && styles.egaliteChipTexteActif,
              ]}
            >
              🏆 Victoire
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {edition && !coop && (
        <TouchableOpacity
          style={[styles.egaliteChip, !gagnant && styles.egaliteChipActif]}
          onPress={() => setGagnant("")}
        >
          <Text style={[styles.egaliteChipTexte, !gagnant && styles.egaliteChipTexteActif]}>
            🤝 Enregistrer comme une égalité
          </Text>
        </TouchableOpacity>
      )}

      {edition ? (
        <View style={styles.bilanBloc}>
          <Text style={styles.bilanTitre}>Note et souvenir</Text>
          <View style={styles.etoiles}>
            {[1, 2, 3, 4, 5].map((n) => (
              <TouchableOpacity
                key={n}
                hitSlop={4}
                onPress={() => setEvaluation(evaluation === n ? 0 : n)}
              >
                <IconSymbol
                  name={n <= evaluation ? "star.fill" : "star"}
                  size={26}
                  color={n <= evaluation ? styles.etoilePleine.color : styles.etoileVide.color}
                />
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder="Une anecdote à retenir ?"
            placeholderTextColor={styles.etoileVide.color}
            multiline
          />
        </View>
      ) : (
        (partie.evaluation || partie.note) && (
          <View style={styles.bilanBloc}>
            {partie.evaluation ? (
              <View style={styles.etoiles}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <IconSymbol
                    key={n}
                    name={n <= (partie.evaluation ?? 0) ? "star.fill" : "star"}
                    size={18}
                    color={
                      n <= (partie.evaluation ?? 0)
                        ? styles.etoilePleine.color
                        : styles.etoileVide.color
                    }
                  />
                ))}
              </View>
            ) : null}
            {partie.note ? <Text style={styles.noteTexte}>« {partie.note} »</Text> : null}
          </View>
        )
      )}

      {edition ? (
        <View style={styles.actionsDetail}>
          <TouchableOpacity
            style={styles.annulerDetail}
            onPress={() => {
              setLignes(joueursDe(partie));
              setGagnant(partie.gagnant);
              setResultat(partie.resultat);
              setEdition(false);
            }}
          >
            <Text style={styles.annulerDetailTexte}>Annuler</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.validerDetail} onPress={enregistrer}>
            <Text style={styles.validerDetailTexte}>Enregistrer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.actionsDetail}>
          <TouchableOpacity style={styles.annulerDetail} onPress={onFermer}>
            <Text style={styles.annulerDetailTexte}>Fermer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.validerDetail} onPress={() => setEdition(true)}>
            <Text style={styles.validerDetailTexte}>Modifier</Text>
          </TouchableOpacity>
        </View>
      )}
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

function Groupe({
  titre,
  children,
  styles,
}: {
  titre: string;
  children: ReactNode;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.groupe}>
      <Text style={styles.groupeLabel}>{titre}</Text>
      <View style={styles.chipsWrap}>{children}</View>
    </View>
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
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <TouchableOpacity style={[styles.chip, actif && styles.chipActif]} onPress={onPress}>
      <Text style={[styles.chipTexte, actif && styles.chipTexteActif]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function nomsJoueurs(p: PartieEnregistree) {
  try {
    const joueurs = JSON.parse(p.details) as JoueurScore[];
    return joueurs
      .map((j) => {
        if (j.membres?.length) return `${j.nom} (${j.membres.join(", ")})`;
        return j.role ? `${j.nom} (${j.role})` : j.nom;
      })
      .join(", ");
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
    rechercheLigne: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginBottom: 8 },
    rechercheChamp: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      height: 42,
    },
    rechercheInput: { flex: 1, fontSize: 15, color: c.textPrimary },
    filtreBouton: {
      width: 42,
      height: 42,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    filtreBoutonActif: { backgroundColor: c.accent, borderColor: c.accent },
    filtreBadge: {
      position: "absolute",
      top: -6,
      right: -6,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: c.accent,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 4,
    },
    filtreBadgeTexte: { color: c.onAccent, fontSize: 11, fontWeight: "700" },
    panneau: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      marginHorizontal: 16,
      marginBottom: 10,
      padding: 12,
    },
    groupe: { marginBottom: 10 },
    groupeLabel: { fontSize: 13, fontWeight: "600", color: c.textSecondary, marginBottom: 6 },
    chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: {
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surfaceAlt,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 6,
      maxWidth: 220,
    },
    chipActif: { backgroundColor: c.accent, borderColor: c.accent },
    chipTexte: { fontSize: 13, color: c.textSecondary, fontWeight: "600" },
    chipTexteActif: { color: c.onAccent },
    reset: { fontSize: 13, color: c.accentText, fontWeight: "600", marginTop: 2 },

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
    perdue: { color: c.textMuted },
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
    detailAide: { fontSize: 12, color: c.textMuted, marginTop: 8, lineHeight: 17 },
    detailInput: {
      minWidth: 62,
      fontSize: 17,
      fontWeight: "700",
      color: c.textPrimary,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.borderStrong,
      borderRadius: 8,
      paddingVertical: 6,
    },
    issues: { flexDirection: "row", gap: 10 },
    egaliteChip: {
      marginTop: 10,
      paddingVertical: 11,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surfaceAlt,
      alignItems: "center",
    },
    egaliteChipActif: { backgroundColor: c.successSoft, borderColor: c.success },
    egaliteChipTexte: { fontSize: 13, fontWeight: "600", color: c.textSecondary },
    egaliteChipTexteActif: { color: c.textPrimary },
    bilanBloc: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    bilanTitre: { fontSize: 12, fontWeight: "700", color: c.textSecondary, marginBottom: 8 },
    etoiles: { flexDirection: "row", gap: 6 },
    etoilePleine: { color: c.accent },
    etoileVide: { color: c.textFaint },
    noteInput: {
      marginTop: 10,
      backgroundColor: c.surfaceAlt,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      padding: 10,
      minHeight: 70,
      textAlignVertical: "top",
      fontSize: 14,
      color: c.textPrimary,
    },
    noteTexte: {
      fontSize: 14,
      color: c.textSecondary,
      fontStyle: "italic",
      lineHeight: 20,
      marginTop: 8,
    },
    actionsDetail: { flexDirection: "row", gap: 10, marginTop: 14, marginBottom: 4 },
    annulerDetail: {
      flex: 1,
      paddingVertical: 13,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.borderStrong,
      alignItems: "center",
    },
    annulerDetailTexte: { fontSize: 15, fontWeight: "600", color: c.textSecondary },
    validerDetail: {
      flex: 1,
      paddingVertical: 13,
      borderRadius: 12,
      backgroundColor: c.accent,
      alignItems: "center",
    },
    validerDetailTexte: { fontSize: 15, fontWeight: "600", color: c.onAccent },
  });
}
