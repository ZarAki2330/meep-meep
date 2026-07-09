// app/manches/[jeuId].tsx — score par manches : une ligne par manche, total automatique

import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DialogueEgalite } from "@/components/dialogue-egalite";
import { Entete } from "@/components/entete";
import { SelecteurMembres } from "@/components/selecteur-membres";
import { type AppColors } from "@/constants/theme-colors";
import { useJeux } from "@/context/jeux";
import { useTheme } from "@/context/theme";
import { listerJoueurs } from "@/db/joueurs";
import { chargerEtat, effacerEtat, sauvegarderEtat } from "@/db/partie-en-cours";
import { enregistrerPartie } from "@/db/parties";
import { useChrono } from "@/hooks/use-chrono";
import { formatChrono } from "@/lib/duree";

type Joueur = { id: string; nom: string; membres?: string[] };
type Scores = Record<string, Record<number, string>>; // [joueurId][numéro de manche]
type Styles = ReturnType<typeof makeStyles>;
type EtatSauve = { joueurs: Joueur[]; scores: Scores; nbManches: number; duree?: number };

const LARGEUR_LABEL = 96;
const LARGEUR_COL = 78;
const MANCHES_DEPART = 3;

function estVierge(joueurs: Joueur[], scores: Scores, nbManches: number, prefixe: string) {
  const aucunScore = Object.values(scores).every((c) =>
    Object.values(c).every((v) => v === "" || v === undefined),
  );
  return (
    aucunScore &&
    nbManches === MANCHES_DEPART &&
    joueurs.length === 2 &&
    joueurs.every((j, i) => j.nom === `${prefixe} ${i + 1}` && !j.membres?.length)
  );
}

export default function PartieManches() {
  const { jeuId } = useLocalSearchParams<{ jeuId: string }>();
  const { colors } = useTheme();
  const { jeux } = useJeux();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(colors);
  const jeu = jeux.find((j) => j.id === jeuId);

  const sens = jeu?.scoreVictoire ?? "max";
  const seuilFin = jeu?.seuilFin;
  const modeEquipes = jeu?.equipes === true;
  const prefixe = modeEquipes ? "Équipe" : "Joueur";

  const [joueurs, setJoueurs] = useState<Joueur[]>([
    { id: "j1", nom: `${modeEquipes ? "Équipe" : "Joueur"} 1` },
    { id: "j2", nom: `${modeEquipes ? "Équipe" : "Joueur"} 2` },
  ]);
  const [membresPour, setMembresPour] = useState<string | null>(null);
  const [scores, setScores] = useState<Scores>({});
  const [nbManches, setNbManches] = useState(MANCHES_DEPART);
  const [termine, setTermine] = useState(false);
  const [resultat, setResultat] = useState<string | null>(null);
  const [egaliteOuverte, setEgaliteOuverte] = useState(false);
  const [joueursSauvegardes, setJoueursSauvegardes] = useState<string[]>([]);
  const [charge, setCharge] = useState(false);
  const [reprise, setReprise] = useState(false);

  const { secondes, demarrer, pause, initialiser } = useChrono();
  const secondesRef = useRef(0);
  secondesRef.current = secondes;
  const termineRef = useRef(false);
  termineRef.current = termine;

  useEffect(() => {
    listerJoueurs()
      .then((js) => setJoueursSauvegardes(js.map((j) => j.nom)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    chargerEtat<EtatSauve>(jeuId ?? "")
      .then((e) => {
        if (e?.joueurs?.length) {
          setJoueurs(e.joueurs);
          setScores(e.scores ?? {});
          setNbManches(e.nbManches ?? MANCHES_DEPART);
          if (e.duree) initialiser(e.duree);
          setReprise(true);
        }
      })
      .finally(() => setCharge(true));
  }, [jeuId, initialiser]);

  useFocusEffect(
    useCallback(() => {
      if (!termineRef.current) demarrer();
      return () => {
        pause();
      };
    }, [demarrer, pause]),
  );

  useEffect(() => {
    if (termine) pause();
  }, [termine, pause]);

  useEffect(() => {
    if (!charge || termine) return;
    if (estVierge(joueurs, scores, nbManches, prefixe)) effacerEtat(jeuId ?? "").catch(() => {});
    else
      sauvegarderEtat(jeuId ?? "", {
        joueurs,
        scores,
        nbManches,
        duree: secondesRef.current,
      }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [charge, termine, joueurs, scores, nbManches, jeuId]);

  function valeur(joueurId: string, manche: number): number {
    const n = parseInt(scores[joueurId]?.[manche] ?? "", 10);
    return isNaN(n) ? 0 : n;
  }

  function definir(joueurId: string, manche: number, texte: string) {
    const negatif = texte.trimStart().startsWith("-");
    const propre = (negatif ? "-" : "") + texte.replace(/[^0-9]/g, "");
    setScores((prev) => ({
      ...prev,
      [joueurId]: { ...(prev[joueurId] ?? {}), [manche]: propre },
    }));
  }

  function total(joueurId: string) {
    let s = 0;
    for (let m = 1; m <= nbManches; m++) s += valeur(joueurId, m);
    return s;
  }

  function renommer(id: string, nom: string) {
    setJoueurs((prev) => prev.map((j) => (j.id === id ? { ...j, nom } : j)));
  }
  function ajouterJoueur() {
    setJoueurs((prev) => [...prev, { id: `j${Date.now()}`, nom: `${prefixe} ${prev.length + 1}` }]);
  }
  function ajouterJoueurNomme(nom: string) {
    setJoueurs((prev) => [...prev, { id: `j${Date.now()}`, nom }]);
  }
  function definirMembres(id: string, membres: string[]) {
    setJoueurs((prev) => prev.map((j) => (j.id === id ? { ...j, membres } : j)));
    setMembresPour(null);
  }
  function supprimerJoueur(id: string) {
    setJoueurs((prev) => prev.filter((j) => j.id !== id));
    setScores((prev) => {
      const copie = { ...prev };
      delete copie[id];
      return copie;
    });
  }

  const totaux = joueurs.map((j) => total(j.id));
  const meilleur = totaux.length
    ? sens === "min"
      ? Math.min(...totaux)
      : Math.max(...totaux)
    : 0;
  const pire = totaux.length ? Math.max(...totaux) : 0;
  const tousEgaux = totaux.every((t) => t === totaux[0]);
  const gagnants = joueurs.filter((j) => total(j.id) === meilleur);
  const seuilAtteint = seuilFin !== undefined && pire >= seuilFin;

  function terminer() {
    if (gagnants.length > 1) {
      setEgaliteOuverte(true);
      return;
    }
    finaliser(gagnants[0]?.nom ?? "");
  }

  function finaliser(nomGagnant: string) {
    const duree = pause();
    setEgaliteOuverte(false);
    setResultat(nomGagnant);
    setTermine(true);
    setReprise(false);
    effacerEtat(jeuId ?? "").catch(() => {});
    enregistrerPartie({
      jeuId: jeuId ?? "",
      jeuNom: jeu ? jeu.nom : "Partie",
      joueurs: joueurs.map((j) => ({
        nom: j.nom,
        score: total(j.id),
        membres: j.membres?.length ? j.membres : undefined,
      })),
      gagnant: nomGagnant,
      scoreGagnant: meilleur,
      duree,
    }).catch(() => {});
  }

  const { width } = useWindowDimensions();
  const largeurCol = Math.max(LARGEUR_COL, (width - 24 - LARGEUR_LABEL) / joueurs.length);
  const joueursDispo = joueursSauvegardes.filter((n) => !joueurs.some((j) => j.nom === n));

  return (
    <View style={styles.page}>
      <Entete
        titre={jeu ? jeu.nom : "Manches"}
        droite={<Text style={styles.chronoEntete}>⏱ {formatChrono(secondes)}</Text>}
      />

      {reprise && !termine && (
        <View style={styles.reprise}>
          <Text style={styles.repriseTexte}>Partie reprise là où tu t&apos;étais arrêté</Text>
        </View>
      )}

      {sens === "min" && (
        <View style={styles.info}>
          <Text style={styles.infoTexte}>
            Points de pénalité — le moins de points gagne
            {seuilFin ? ` · fin à ${seuilFin}` : ""}
          </Text>
        </View>
      )}

      {seuilAtteint && !termine && (
        <View style={styles.avertissement}>
          <Text style={styles.avertissementTexte}>
            Seuil de {seuilFin} atteint — tu peux terminer la partie.
          </Text>
        </View>
      )}

      {termine && resultat !== null && (
        <View style={styles.banniere}>
          <Text style={styles.banniereTexte}>
            {resultat
              ? `🏆 ${resultat} gagne avec ${meilleur} points !`
              : `🤝 Égalité à ${meilleur} points entre ${gagnants.map((g) => g.nom).join(", ")}`}
          </Text>
        </View>
      )}

      <ScrollView
        style={styles.zoneTableau}
        showsVerticalScrollIndicator
        keyboardShouldPersistTaps="handled"
      >
        {!termine && joueursDispo.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chips}
            contentContainerStyle={styles.chipsContenu}
          >
            {joueursDispo.map((nom) => (
              <TouchableOpacity
                key={nom}
                style={styles.chip}
                onPress={() => ajouterJoueurNomme(nom)}
              >
                <Text style={styles.chipTexte}>+ {nom}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View style={styles.grille}>
            <View style={styles.ligne}>
            <View style={[styles.cellLabel, styles.cellEntete]} />
            {joueurs.map((j) => (
              <View key={j.id} style={[styles.cell, styles.cellEntete, { width: largeurCol }]}>
                <TextInput
                  style={styles.nomInput}
                  value={j.nom}
                  onChangeText={(t) => renommer(j.id, t)}
                  editable={!termine}
                />
                {modeEquipes && (
                  <TouchableOpacity
                    disabled={termine}
                    onPress={() => setMembresPour(j.id)}
                    style={styles.membresBouton}
                  >
                    <Text style={styles.membresTexte} numberOfLines={2}>
                      {j.membres?.length ? j.membres.join(", ") : "+ membres"}
                    </Text>
                  </TouchableOpacity>
                )}
                {!termine && joueurs.length > 1 && (
                  <TouchableOpacity onPress={() => supprimerJoueur(j.id)}>
                    <Text style={styles.supprimer}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>

          {Array.from({ length: nbManches }, (_, i) => i + 1).map((m) => (
            <View key={m} style={styles.ligne}>
              <View style={styles.cellLabel}>
                <Text style={styles.labelTexte}>Manche {m}</Text>
              </View>
              {joueurs.map((j) => (
                <View key={j.id} style={[styles.cell, { width: largeurCol }]}>
                  <TextInput
                    style={styles.caseInput}
                    value={scores[j.id]?.[m] ?? ""}
                    onChangeText={(t) => definir(j.id, m, t)}
                    keyboardType={Platform.OS === "ios" ? "numbers-and-punctuation" : "numeric"}
                    editable={!termine}
                    textAlign="center"
                    placeholder="—"
                    placeholderTextColor={colors.placeholder}
                  />
                </View>
              ))}
            </View>
          ))}

          {!termine && (
            <TouchableOpacity style={styles.ajoutManche} onPress={() => setNbManches((n) => n + 1)}>
              <Text style={styles.ajoutMancheTexte}>+ Ajouter une manche</Text>
            </TouchableOpacity>
          )}

            <View style={[styles.ligne, styles.ligneTotal]}>
              <View style={styles.cellLabel}>
                <Text style={styles.totalLabel}>TOTAL</Text>
              </View>
              {joueurs.map((j) => {
                const t = total(j.id);
                const enTete = !tousEgaux && t === meilleur;
                return (
                  <View
                    key={j.id}
                    style={[styles.cell, { width: largeurCol }, enTete && styles.cellGagnant]}
                  >
                    <Text style={styles.totalValeur}>{t}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </ScrollView>

      <View style={[styles.barreBas, { paddingBottom: 16 + insets.bottom }]}>
        {!termine ? (
          <>
            <TouchableOpacity style={styles.actionSecondaire} onPress={ajouterJoueur}>
              <Text style={styles.actionSecondaireTexte}>+ {prefixe}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionPrincipale} onPress={terminer}>
              <Text style={styles.actionPrincipaleTexte}>Terminer</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={styles.actionPrincipale} onPress={() => setTermine(false)}>
            <Text style={styles.actionPrincipaleTexte}>Continuer à modifier</Text>
          </TouchableOpacity>
        )}
      </View>

      <DialogueEgalite
        visible={egaliteOuverte}
        noms={gagnants.map((g) => g.nom)}
        onDepartager={finaliser}
        onEgalite={() => finaliser("")}
        onAnnuler={() => setEgaliteOuverte(false)}
      />

      <SelecteurMembres
        visible={membresPour !== null}
        equipe={joueurs.find((j) => j.id === membresPour)?.nom ?? ""}
        membres={joueurs.find((j) => j.id === membresPour)?.membres ?? []}
        joueursConnus={joueursSauvegardes}
        onValider={(m) => membresPour && definirMembres(membresPour, m)}
        onAnnuler={() => setMembresPour(null)}
      />
    </View>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    page: { flex: 1, backgroundColor: c.page },
    zoneTableau: { flex: 1 },
    grille: { padding: 12 },
    chronoEntete: {
      fontSize: 15,
      fontWeight: "700",
      color: c.textSecondary,
      marginRight: 12,
      fontVariant: ["tabular-nums"],
    },
    reprise: { backgroundColor: c.successSoft, paddingVertical: 8, alignItems: "center" },
    repriseTexte: { color: c.textSecondary, fontSize: 13, fontWeight: "600" },
    info: { backgroundColor: c.accentSoft, paddingVertical: 8, alignItems: "center" },
    infoTexte: { color: c.accentText, fontSize: 13, fontWeight: "600" },
    avertissement: { backgroundColor: c.warningSoft, paddingVertical: 8, alignItems: "center" },
    avertissementTexte: { color: c.warningText, fontSize: 13, fontWeight: "600" },
    banniere: { backgroundColor: c.success, padding: 14, alignItems: "center" },
    banniereTexte: { color: c.onSuccess, fontSize: 16, fontWeight: "600" },
    chips: { flexGrow: 0 },
    chipsContenu: { gap: 8, paddingHorizontal: 12, paddingVertical: 10, alignItems: "center" },
    chip: {
      borderWidth: 1,
      borderColor: c.accent,
      backgroundColor: c.accentSoft,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    chipTexte: { color: c.accentText, fontSize: 13, fontWeight: "600", lineHeight: 18 },
    ligne: { flexDirection: "row", alignItems: "stretch" },
    ligneTotal: { marginTop: 6, borderTopWidth: 2, borderTopColor: c.borderStrong, paddingTop: 6 },
    cellLabel: { width: LARGEUR_LABEL, paddingVertical: 8, paddingRight: 8, justifyContent: "center" },
    cell: {
      width: LARGEUR_COL,
      paddingVertical: 6,
      paddingHorizontal: 3,
      alignItems: "center",
      justifyContent: "center",
      borderLeftWidth: 1,
      borderLeftColor: c.border,
    },
    cellEntete: { borderBottomWidth: 2, borderBottomColor: c.borderStrong, paddingBottom: 6 },
    cellGagnant: { backgroundColor: c.successSoft, borderRadius: 8 },
    nomInput: { fontSize: 13, fontWeight: "600", color: c.textPrimary, textAlign: "center", width: "100%" },
    supprimer: { color: c.textFaint, fontSize: 12, marginTop: 2 },
    membresBouton: { marginTop: 3, paddingHorizontal: 2 },
    membresTexte: { fontSize: 10, color: c.accentText, textAlign: "center", fontWeight: "600" },
    labelTexte: { fontSize: 14, color: c.textSecondary },
    caseInput: {
      fontSize: 16,
      color: c.textPrimary,
      width: "100%",
      paddingVertical: 4,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 6,
      backgroundColor: c.surface,
    },
    ajoutManche: {
      marginTop: 8,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: c.accent,
      alignItems: "center",
    },
    ajoutMancheTexte: { color: c.accentText, fontSize: 13, fontWeight: "600" },
    totalLabel: { fontSize: 15, fontWeight: "700", color: c.textPrimary },
    totalValeur: { fontSize: 18, fontWeight: "700", color: c.textPrimary },
    barreBas: {
      flexDirection: "row",
      gap: 10,
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: c.border,
      backgroundColor: c.surface,
    },
    actionSecondaire: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.borderStrong,
      alignItems: "center",
    },
    actionSecondaireTexte: { fontSize: 15, color: c.textSecondary, fontWeight: "600" },
    actionPrincipale: { flex: 2, paddingVertical: 14, borderRadius: 12, backgroundColor: c.accent, alignItems: "center" },
    actionPrincipaleTexte: { fontSize: 15, color: c.onAccent, fontWeight: "600" },
  });
}
