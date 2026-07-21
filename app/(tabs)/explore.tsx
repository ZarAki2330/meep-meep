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
import { lignesDe, participantsDe, vainqueursDe } from "@/lib/lignes-partie";
import {
  listerParties,
  modifierPartie,
  noterPartie,
  supprimerPartie,
  supprimerParties,
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

  // null : mode normal. Un tableau, même vide : on est en train de cocher.
  const [selection, setSelection] = useState<number[] | null>(null);
  const [lotOuvert, setLotOuvert] = useState(false);
  const enSelection = selection !== null;

  async function effacer() {
    if (!aSupprimer) return;
    const id = aSupprimer.id;
    setASupprimer(null);
    await supprimerPartie(id).catch(() => {});
    charger();
  }

  function basculerSelection(id: number) {
    setSelection((prev) => {
      if (!prev) return [id];
      return prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
    });
  }

  // Listes proposées dans les filtres, tirées de l'historique.
  /**
   * Les lignes de chaque partie, lues une seule fois.
   *
   * La recherche et les filtres relisaient le JSON de toutes les parties à
   * chaque frappe. Cinq cents parties, cinq cents analyses JSON par lettre.
   */
  const lignesParPartie = useMemo(
    () => new Map(parties.map((p) => [p.id, lignesDe(p.details)])),
    [parties],
  );
  const lignesPartie = useCallback(
    (p: PartieEnregistree) => lignesParPartie.get(p.id) ?? [],
    [lignesParPartie],
  );

  const jeuxDispo = useMemo(() => {
    const compte: Record<string, number> = {};
    for (const p of parties) compte[p.jeu_nom] = (compte[p.jeu_nom] ?? 0) + 1;
    return Object.entries(compte).sort((a, b) => b[1] - a[1]);
  }, [parties]);

  // Les membres d'une équipe sont des joueurs ; « Équipe 1 » n'en est pas un.
  const joueursDispo = useMemo(() => {
    const noms = new Set<string>();
    for (const p of parties) for (const nom of participantsDe(lignesPartie(p))) noms.add(nom);
    return Array.from(noms).sort((a, b) => a.localeCompare(b, "fr"));
  }, [parties, lignesPartie]);

  const nbFiltres = (jeuFiltre ? 1 : 0) + (joueurFiltre ? 1 : 0) + (periode ? 1 : 0);

  const partiesFiltrees = useMemo(() => {
    const texte = recherche.trim().toLowerCase();
    const limite = periode ? Date.now() - PERIODES[periode].jours * 86400000 : 0;

    return parties.filter((p) => {
      // Les noms cherchés incluent les membres d'équipe, et le nom de l'équipe :
      // on doit pouvoir retrouver une partie par « Chloé » comme par « Rouge ».
      const lignes = lignesPartie(p);
      const membres = participantsDe(lignes);
      const noms = [...membres, ...lignes.map((l) => l.nom)];

      if (texte) {
        const dansJeu = p.jeu_nom.toLowerCase().includes(texte);
        const dansJoueurs = noms.some((n) => n.toLowerCase().includes(texte));
        if (!dansJeu && !dansJoueurs) return false;
      }
      if (jeuFiltre && p.jeu_nom !== jeuFiltre) return false;
      if (joueurFiltre && !membres.includes(joueurFiltre)) return false;
      if (periode && new Date(p.date).getTime() < limite) return false;
      return true;
    });
  }, [parties, recherche, jeuFiltre, joueurFiltre, periode, lignesPartie]);

  // On ne supprime jamais ce qu'un filtre cache : la sélection se lit
  // toujours à travers la liste affichée.
  const cochees = useMemo(() => {
    if (!selection) return [];
    const visibles = new Set(partiesFiltrees.map((p) => p.id));
    return selection.filter((id) => visibles.has(id));
  }, [selection, partiesFiltrees]);

  const toutCoche = partiesFiltrees.length > 0 && cochees.length === partiesFiltrees.length;

  function toutSelectionner() {
    setSelection(toutCoche ? [] : partiesFiltrees.map((p) => p.id));
  }

  async function effacerLot() {
    setLotOuvert(false);
    await supprimerParties(cochees).catch(() => {});
    setSelection(null);
    charger();
  }

  function reinitialiser() {
    setJeuFiltre(null);
    setJoueurFiltre(null);
    setPeriode(null);
  }

  const total = partiesFiltrees.length;

  // `vainqueursDe` gère les trois cas : coopératif gagné, égalité, et victoire
  // d'équipe — qui revient à ses membres, non au nom de l'équipe.
  const meilleur = useMemo(() => {
    const victoires: Record<string, number> = {};
    for (const p of partiesFiltrees) {
      for (const nom of vainqueursDe(p)) victoires[nom] = (victoires[nom] ?? 0) + 1;
    }
    return Object.entries(victoires).sort((a, b) => b[1] - a[1])[0];
  }, [partiesFiltrees]);

  // Nombre de jeux distincts parmi les parties affichées.
  const nbJeux = useMemo(
    () => new Set(partiesFiltrees.map((p) => p.jeu_nom)).size,
    [partiesFiltrees],
  );

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
              accessibilityRole="button"
              accessibilityLabel={nbFiltres > 0 ? `Filtres, ${nbFiltres} actifs` : "Filtres"}
              accessibilityState={{ expanded: filtresOuverts }}
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
            <IconSymbol name="clock.fill" size={16} color={colors.accentText} />
            <Text style={styles.statValeur}>{total}</Text>
            <Text style={styles.statLabel}>partie{total > 1 ? "s" : ""}</Text>
          </View>
          <View style={styles.statBloc}>
            <IconSymbol name="die.face.5" size={16} color={colors.accentText} />
            <Text style={styles.statValeur}>{nbJeux}</Text>
            <Text style={styles.statLabel}>jeu{nbJeux > 1 ? "x" : ""}</Text>
          </View>
          <View style={styles.statBloc}>
            <IconSymbol name="star.fill" size={16} color={colors.accentText} />
            <Text style={styles.statValeur} numberOfLines={1}>
              {meilleur ? meilleur[0] : "—"}
            </Text>
            <Text style={styles.statLabel} numberOfLines={1}>
              {meilleur ? `${meilleur[1]} victoire${meilleur[1] > 1 ? "s" : ""}` : "meilleur joueur"}
            </Text>
          </View>
        </View>
      )}

      {enSelection && (
        <View style={styles.barreSelection}>
          <Text style={styles.barreCompte}>
            {cochees.length === 0
              ? "Aucune partie cochée"
              : `${cochees.length} partie${cochees.length > 1 ? "s" : ""} cochée${cochees.length > 1 ? "s" : ""}`}
          </Text>
          <TouchableOpacity onPress={toutSelectionner} hitSlop={8} accessibilityRole="button">
            <Text style={styles.barreAction}>{toutCoche ? "Tout décocher" : "Tout cocher"}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setSelection(null)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Quitter la sélection"
          >
            <Text style={styles.barreAnnuler}>Annuler</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={partiesFiltrees}
        keyExtractor={(p) => String(p.id)}
        contentContainerStyle={styles.liste}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.vide}>
            <View style={styles.videIcone} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <IconSymbol name="clock.fill" size={38} color={colors.accentText} />
            </View>
            <Text style={styles.videTitre}>
              {parties.length === 0 ? "Aucune partie pour l'instant" : "Aucun résultat"}
            </Text>
            <Text style={styles.videTexte}>
              {parties.length === 0
                ? "Termine une partie depuis un jeu et elle apparaîtra ici, avec tes statistiques."
                : "Aucune partie ne correspond à ta recherche."}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const coche = cochees.includes(item.id);
          return (
          <TouchableOpacity
            style={[styles.carte, coche && styles.carteCochee]}
            activeOpacity={0.7}
            accessibilityRole={enSelection ? "checkbox" : "button"}
            accessibilityState={enSelection ? { checked: coche } : undefined}
            accessibilityLabel={`${item.jeu_nom}, ${formatDate(item.date)}, ${issueCourte(item)}`}
            // L'appui long ne se devine pas à l'oreille.
            accessibilityHint={enSelection ? undefined : "Appui long pour sélectionner"}
            onLongPress={() => basculerSelection(item.id)}
            delayLongPress={250}
            onPress={() => (enSelection ? basculerSelection(item.id) : setDetail(item))}
          >
            {enSelection && (
              <View
                style={[styles.case, coche && styles.caseActive]}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                {coche && <Text style={styles.caseCoche}>✓</Text>}
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.jeuNom}>{item.jeu_nom}</Text>
              <Text style={styles.meta}>
                {formatDate(item.date)} · {item.nb_joueurs} joueurs
                {item.duree ? ` · ${formatDuree(item.duree)}` : ""}
              </Text>
              <Text style={styles.joueurs} numberOfLines={2}>
                {nomsJoueurs(lignesPartie(item))}
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
            {!enSelection && (
              <TouchableOpacity
                style={styles.effacer}
                accessibilityRole="button"
                accessibilityLabel={`Supprimer cette partie de ${item.jeu_nom}`}
                onPress={() => setASupprimer(item)}
              >
                <Text style={styles.effacerTexte}>✕</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
          );
        }}
      />

      {enSelection && cochees.length > 0 && (
        <TouchableOpacity
          style={styles.boutonLot}
          activeOpacity={0.8}
          accessibilityRole="button"
          onPress={() => setLotOuvert(true)}
        >
          <Text style={styles.boutonLotTexte}>
            Supprimer {cochees.length} partie{cochees.length > 1 ? "s" : ""}
          </Text>
        </TouchableOpacity>
      )}

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

      <DialogueConfirmation
        visible={lotOuvert}
        titre={`Supprimer ${cochees.length} partie${cochees.length > 1 ? "s" : ""} ?`}
        message="Elles disparaîtront de l'historique et des statistiques. C'est sans retour."
        onConfirmer={effacerLot}
        onAnnuler={() => setLotOuvert(false)}
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
  const [lignes, setLignes] = useState<JoueurScore[]>(lignesDe(partie.details));
  const [gagnant, setGagnant] = useState(partie.gagnant);
  const [resultat, setResultat] = useState<Resultat | null>(partie.resultat);
  const [evaluation, setEvaluation] = useState(partie.evaluation ?? 0);
  const [note, setNote] = useState(partie.note ?? "");

  // Extensions jouées, mémorisées avec la partie.
  const extensions = (() => {
    if (!partie.extensions) return [] as string[];
    try {
      const v = JSON.parse(partie.extensions);
      return Array.isArray(v) ? (v as string[]) : [];
    } catch {
      return [] as string[];
    }
  })();

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
    // Une ligne à membres trahit une partie en équipes : sans cela, l'édition
    // inscrirait « Équipe 1 » dans la liste des joueurs.
    const equipes = lignes.some((l) => !!l.membres?.length);
    await modifierPartie(
      partie.id,
      lignes,
      coop ? "" : gagnant,
      scoreGagnant,
      resultat,
      undefined,
      equipes,
    ).catch(() => {});
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
      <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ paddingBottom: 6 }}>
      <Text style={styles.detailTitre}>{partie.jeu_nom}</Text>
      <Text style={styles.detailDate}>
        {formatDateLongue(partie.date)}
        {partie.duree ? ` · ⏱ ${formatDuree(partie.duree)}` : ""}
      </Text>
      {extensions.length > 0 && (
        <Text style={styles.detailExtensions}>Extensions : {extensions.join(", ")}</Text>
      )}
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
      </ScrollView>

      {edition ? (
        <View style={styles.actionsDetail}>
          <TouchableOpacity
            style={styles.annulerDetail}
            onPress={() => {
              setLignes(lignesDe(partie.details));
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
    <TouchableOpacity
      style={[styles.chip, actif && styles.chipActif]}
      accessibilityRole="switch"
      accessibilityState={{ checked: actif }}
      accessibilityLabel={label}
      onPress={onPress}
    >
      <Text style={[styles.chipTexte, actif && styles.chipTexteActif]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/** Reçoit les lignes déjà lues : c'est l'écran qui garde le JSON analysé. */
function nomsJoueurs(lignes: JoueurScore[]) {
  return lignes
    .map((j) => {
      if (j.membres?.length) return `${j.nom} (${j.membres.join(", ")})`;
      return j.role ? `${j.nom} (${j.role})` : j.nom;
    })
    .join(", ");
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
    statValeur: { fontSize: 20, fontWeight: "700", color: c.textPrimary, marginTop: 6 },
    statLabel: { fontSize: 12, color: c.textMuted, marginTop: 2 },
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
    carteCochee: { borderColor: c.accent, backgroundColor: c.accentSoft },
    barreSelection: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      marginHorizontal: 16,
      marginBottom: 10,
      paddingVertical: 10,
      paddingHorizontal: 14,
      backgroundColor: c.surfaceAlt,
      borderRadius: 12,
    },
    barreCompte: { flex: 1, fontSize: 13, fontWeight: "600", color: c.textSecondary },
    barreAction: { fontSize: 13, fontWeight: "600", color: c.accentText },
    barreAnnuler: { fontSize: 13, fontWeight: "600", color: c.textMuted },
    case: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: c.borderStrong,
      alignItems: "center",
      justifyContent: "center",
    },
    caseActive: { backgroundColor: c.accent, borderColor: c.accent },
    caseCoche: { color: c.onAccent, fontSize: 13, fontWeight: "700" },
    boutonLot: {
      backgroundColor: c.danger,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
      marginHorizontal: 16,
      marginBottom: 12,
    },
    boutonLotTexte: { color: c.onDanger, fontSize: 15, fontWeight: "600" },
    jeuNom: { fontSize: 16, fontWeight: "600", color: c.textPrimary },
    meta: { fontSize: 13, color: c.textMuted, marginTop: 2 },
    joueurs: { fontSize: 12, color: c.textMuted, marginTop: 3 },
    droite: { alignItems: "flex-end", marginRight: 8 },
    gagnant: { fontSize: 13, color: c.accentText, fontWeight: "600" },
    perdue: { color: c.textMuted },
    score: { fontSize: 13, color: c.textMuted, marginTop: 2 },
    effacer: { padding: 6 },
    effacerTexte: { color: c.textFaint, fontSize: 15 },
    vide: { alignItems: "center", justifyContent: "center", paddingTop: 72, paddingHorizontal: 24 },
    videIcone: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: c.accentSoft,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
    },
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
      maxHeight: "85%",
      backgroundColor: c.surface,
      borderRadius: 18,
      paddingHorizontal: 18,
      paddingTop: 20,
      paddingBottom: 12,
    },
    detailTitre: { fontSize: 20, fontWeight: "700", color: c.textPrimary },
    detailDate: { fontSize: 13, color: c.textMuted, marginTop: 2, textTransform: "capitalize" },
    detailExtensions: { fontSize: 13, color: c.textSecondary, marginTop: 6, lineHeight: 18 },
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
    detailRang: { width: 24, textAlign: "center", fontSize: 14, fontWeight: "700", color: c.textMuted },
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
