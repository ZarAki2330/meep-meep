// app/manches/[jeuId].tsx — score par manches : une ligne par manche, total automatique

import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
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
import { DialogueBilan } from "@/components/dialogue-bilan";
import { DialoguePremierJoueur } from "@/components/dialogue-premier-joueur";
import { Entete } from "@/components/entete";
import { SelecteurMembres } from "@/components/selecteur-membres";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { type AppColors } from "@/constants/theme-colors";
import { useJeux } from "@/context/jeux";
import { useTheme } from "@/context/theme";
import { prefixeJoueur, usePartie } from "@/hooks/use-partie";
import { formatChrono } from "@/lib/duree";
import {
  classer,
  nettoyerEntierSigne,
  oublierJoueur,
  seuilAtteint,
  totalManches,
} from "@/lib/score";

type Scores = Record<string, Record<number, string>>; // [joueurId][numéro de manche]

const LARGEUR_LABEL = 96;
const LARGEUR_COL = 78;
const MANCHES_DEPART = 3;

export default function PartieManches() {
  const { jeuId, extensions } = useLocalSearchParams<{ jeuId: string; extensions?: string }>();
  const extensionsChoisies = extensions ? extensions.split("|").filter(Boolean) : [];
  const { colors } = useTheme();
  const { jeux } = useJeux();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(colors);
  const jeu = jeux.find((j) => j.id === jeuId);

  const sens = jeu?.scoreVictoire ?? "max";
  const seuilFin = jeu?.seuilFin;
  const prefixe = prefixeJoueur(jeu);

  const {
    joueurs,
    joueursSauvegardes,
    joueursDispo,
    nomDe,
    nomsPourTirage,
    modeEquipes,
    reprise,
    termine,
    secondes,
    extra,
    setExtra,
    membresPour,
    setMembresPour,
    tirageOuvert,
    setTirageOuvert,
    egaliteOuverte,
    setEgaliteOuverte,
    bilanOuvert,
    fermerBilan,
    noter,
    renommer,
    ajouterJoueur,
    ajouterJoueurNomme,
    supprimerJoueur: retirerJoueur,
    definirMembres,
    terminerPartie,
    continuerEdition,
  } = usePartie({
    jeuId: jeuId ?? "",
    jeu,
    extensions: extensionsChoisies,
    extraInitial: { scores: {} as Scores, nbManches: MANCHES_DEPART },
    vierge: (js, e) => {
      const aucunScore = Object.values(e.scores).every((c) =>
        Object.values(c).every((v) => v === "" || v === undefined),
      );
      return (
        aucunScore &&
        e.nbManches === MANCHES_DEPART &&
        js.length === 2 &&
        js.every((j, i) => j.nom === `${prefixe} ${i + 1}` && !j.membres?.length)
      );
    },
  });

  const { scores, nbManches } = extra;
  function majScores(maj: (s: Scores) => Scores) {
    setExtra((e) => ({ ...e, scores: maj(e.scores) }));
  }
  function ajouterManche() {
    setExtra((e) => ({ ...e, nbManches: e.nbManches + 1 }));
  }

  const [resultat, setResultat] = useState<string | null>(null);

  function definir(joueurId: string, manche: number, texte: string) {
    majScores((prev) => ({
      ...prev,
      [joueurId]: { ...(prev[joueurId] ?? {}), [manche]: nettoyerEntierSigne(texte) },
    }));
  }

  function total(joueurId: string) {
    return totalManches(scores[joueurId], nbManches);
  }

  function supprimerJoueur(id: string) {
    retirerJoueur(id);
    majScores((prev) => oublierJoueur(prev, id));
  }

  const { meilleur, pire, gagnants, tousEgaux } = classer(joueurs, (j) => total(j.id), sens);
  const seuilFranchi = seuilAtteint(pire, seuilFin);

  function terminer() {
    if (gagnants.length > 1) {
      setEgaliteOuverte(true);
      return;
    }
    finaliser(gagnants[0] ? nomDe(gagnants[0]) : "");
  }

  async function finaliser(nomGagnant: string) {
    setResultat(nomGagnant);
    await terminerPartie({
      joueurs: joueurs.map((j) => ({
        nom: nomDe(j),
        score: total(j.id),
        membres: j.membres?.length ? j.membres : undefined,
      })),
      gagnant: nomGagnant,
      scoreGagnant: meilleur,
    });
  }

  const { width } = useWindowDimensions();
  const largeurCol = Math.max(LARGEUR_COL, (width - 24 - LARGEUR_LABEL) / joueurs.length);

  return (
    <View style={styles.page}>
      <Entete
        titre={jeu ? jeu.nom : "Manches"}
        droite={
          <View style={styles.actionsEntete}>
            <TouchableOpacity
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Tirer au sort le premier joueur"
              onPress={() => setTirageOuvert(true)}
            >
              <IconSymbol name="die.face.5" size={22} color={colors.accentText} />
            </TouchableOpacity>
            <Text style={styles.chronoEntete}>⏱ {formatChrono(secondes)}</Text>
          </View>
        }
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

      {seuilFranchi && !termine && (
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
          <View style={styles.chipsContenu}>
            {joueursDispo.map((nom) => (
              <TouchableOpacity
                key={nom}
                style={styles.chip}
                onPress={() => ajouterJoueurNomme(nom)}
              >
                <Text style={styles.chipTexte}>+ {nom}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View style={styles.grille}>
            <View style={styles.ligne}>
            <View style={[styles.cellLabel, styles.cellEntete]} />
            {joueurs.map((j) => (
              <View key={j.id} style={[styles.cell, styles.cellEntete, { width: largeurCol }]}>
                <TextInput
                  style={styles.nomInput}
                  accessibilityLabel={`Nom : ${j.nom}`}
                  value={j.nom}
                  onChangeText={(t) => renommer(j.id, t)}
                  editable={!termine}
                />
                {modeEquipes && (
                  <TouchableOpacity
                    disabled={termine}
                    accessibilityRole="button"
                    accessibilityLabel={`Membres de ${j.nom}`}
                    onPress={() => setMembresPour(j.id)}
                    style={styles.membresBouton}
                  >
                    <Text style={styles.membresTexte} numberOfLines={2}>
                      {j.membres?.length ? j.membres.join(", ") : "+ membres"}
                    </Text>
                  </TouchableOpacity>
                )}
                {!termine && joueurs.length > 1 && (
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={`Retirer ${j.nom}`}
                    onPress={() => supprimerJoueur(j.id)}
                  >
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
                    // Sans libellé, un tableau de cases n'annonce que des nombres.
                    accessibilityLabel={`Manche ${m}, ${j.nom}`}
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
            <TouchableOpacity style={styles.ajoutManche} onPress={ajouterManche}>
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
          <TouchableOpacity style={styles.actionPrincipale} onPress={continuerEdition}>
            <Text style={styles.actionPrincipaleTexte}>Continuer à modifier</Text>
          </TouchableOpacity>
        )}
      </View>

      <DialogueEgalite
        visible={egaliteOuverte}
        noms={gagnants.map(nomDe)}
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

      <DialoguePremierJoueur
        visible={tirageOuvert}
        noms={nomsPourTirage}
        onFermer={() => setTirageOuvert(false)}
      />

      <DialogueBilan visible={bilanOuvert} onPasser={fermerBilan} onEnregistrer={noter} />
    </View>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    page: { flex: 1, backgroundColor: c.page },
    zoneTableau: { flex: 1 },
    grille: { padding: 12 },
    actionsEntete: { flexDirection: "row", alignItems: "center", gap: 14 },
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
    chipsContenu: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 12, paddingVertical: 10, alignItems: "center" },
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
