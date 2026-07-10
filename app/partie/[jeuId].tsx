// app/partie/[jeuId].tsx — gestion des scores d'une partie en cours

import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DialogueBilan } from "@/components/dialogue-bilan";
import { DialogueEgalite } from "@/components/dialogue-egalite";
import { DialoguePremierJoueur } from "@/components/dialogue-premier-joueur";
import { Entete } from "@/components/entete";
import { SelecteurMembres } from "@/components/selecteur-membres";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { type AppColors } from "@/constants/theme-colors";
import { useJeux } from "@/context/jeux";
import { useTheme } from "@/context/theme";
import { prefixeJoueur, usePartie } from "@/hooks/use-partie";
import { formatChrono } from "@/lib/duree";

const COULEURS = ["#7a5195", "#1d9e75", "#378add", "#d85a30", "#c4457e"];

export default function Partie() {
  const { jeuId, extensions } = useLocalSearchParams<{ jeuId: string; extensions?: string }>();
  const { colors } = useTheme();
  const { jeux } = useJeux();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(colors);
  const jeu = jeux.find((j) => j.id === jeuId);

  const extensionsChoisies = extensions ? extensions.split("|").filter(Boolean) : [];
  const prefixe = prefixeJoueur(jeu);

  const {
    joueurs,
    setJoueurs,
    joueursSauvegardes,
    joueursDispo,
    modeEquipes,
    reprise,
    termine,
    secondes,
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
    supprimerJoueur,
    definirMembres,
    terminerPartie,
    reinitialiser,
  } = usePartie({
    jeuId: jeuId ?? "",
    jeu,
    extraInitial: {},
    vierge: (js) =>
      js.length === 2 &&
      js.every((j, i) => j.score === 0 && j.nom === `${prefixe} ${i + 1}` && !j.membres?.length),
  });

  const sens = jeu?.scoreVictoire ?? "max";
  const seuilFin = jeu?.seuilFin;

  const scores = joueurs.map((j) => j.score);
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const tousEgaux = min === max;
  const meilleur = sens === "min" ? min : max;
  const seuilAtteint = seuilFin !== undefined && max >= seuilFin;

  function modifierScore(id: string, delta: number) {
    setJoueurs((prev) =>
      prev.map((j) => (j.id === id ? { ...j, score: Math.max(0, j.score + delta) } : j)),
    );
  }

  function definirScore(id: string, texte: string) {
    const n = parseInt(texte.replace(/[^0-9]/g, ""), 10);
    setJoueurs((prev) => prev.map((j) => (j.id === id ? { ...j, score: isNaN(n) ? 0 : n } : j)));
  }

  function nouvellePartie() {
    setJoueurs((prev) => prev.map((j) => ({ ...j, score: 0 })));
    setResultat(null);
    reinitialiser();
  }

  // Tous les joueurs au meilleur score : plus d'un = égalité.
  const gagnants = joueurs.filter((j) => j.score === meilleur);
  // "" signifie une égalité enregistrée.
  const [resultat, setResultat] = useState<string | null>(null);

  function terminer() {
    if (gagnants.length > 1) {
      setEgaliteOuverte(true);
      return;
    }
    finaliser(gagnants[0]?.nom ?? "");
  }

  async function finaliser(nomGagnant: string) {
    setResultat(nomGagnant);
    await terminerPartie({
      joueurs: joueurs.map((j) => ({
        nom: j.nom,
        score: j.score,
        membres: j.membres?.length ? j.membres : undefined,
      })),
      gagnant: nomGagnant,
      scoreGagnant: meilleur,
    });
  }

  return (
    <View style={styles.page}>
      <Entete
        titre={jeu ? jeu.nom : "Partie"}
        droite={
          <View style={styles.actionsEntete}>
            <TouchableOpacity hitSlop={8} onPress={() => setTirageOuvert(true)}>
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

      {extensionsChoisies.length > 0 && (
        <View style={styles.extensions}>
          <Text style={styles.extensionsTexte}>Extensions : {extensionsChoisies.join(", ")}</Text>
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
            Seuil de {seuilFin} atteint — vous pouvez terminer la partie.
          </Text>
        </View>
      )}

      {termine && resultat !== null && (
        <View style={styles.banniere}>
          <Text style={styles.banniereTexte}>
            {resultat
              ? `🏆 ${resultat} remporte la partie !`
              : `🤝 Égalité entre ${gagnants.map((g) => g.nom).join(", ")}`}
          </Text>
          <Text style={styles.banniereScore}>
            {meilleur} points{sens === "min" ? " (le moins)" : ""}
          </Text>
        </View>
      )}

      {!termine && joueursDispo.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chips}
          contentContainerStyle={styles.chipsContenu}
        >
          {joueursDispo.map((nom) => (
            <TouchableOpacity key={nom} style={styles.chip} onPress={() => ajouterJoueurNomme(nom)}>
              <Text style={styles.chipTexte}>+ {nom}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <FlatList
        data={joueurs}
        keyExtractor={(j) => j.id}
        contentContainerStyle={styles.liste}
        renderItem={({ item, index }) => {
          const enTete = !tousEgaux && item.score === meilleur;
          const couleur = COULEURS[index % COULEURS.length];
          return (
            <View style={[styles.carte, enTete && styles.carteEnTete]}>
              <View style={styles.ligneHaut}>
                <View style={[styles.pastille, { backgroundColor: couleur }]}>
                  <Text style={styles.pastilleTexte}>{item.nom.charAt(0).toUpperCase()}</Text>
                </View>
                <TextInput
                  style={styles.nomInput}
                  value={item.nom}
                  onChangeText={(t) => renommer(item.id, t)}
                  editable={!termine}
                />
                {!termine && joueurs.length > 1 && (
                  <TouchableOpacity onPress={() => supprimerJoueur(item.id)}>
                    <Text style={styles.supprimer}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>

              {modeEquipes && (
                <TouchableOpacity
                  style={styles.membresBouton}
                  disabled={termine}
                  onPress={() => setMembresPour(item.id)}
                >
                  <Text
                    style={item.membres?.length ? styles.membresTexte : styles.membresVide}
                    numberOfLines={1}
                  >
                    {item.membres?.length ? item.membres.join(", ") : "+ Ajouter des membres"}
                  </Text>
                </TouchableOpacity>
              )}

              <View style={styles.ligneScore}>
                <TouchableOpacity
                  style={styles.bouton}
                  onPress={() => modifierScore(item.id, -1)}
                  disabled={termine}
                >
                  <Text style={styles.boutonTexte}>–</Text>
                </TouchableOpacity>
                <TextInput
                  style={styles.score}
                  value={String(item.score)}
                  onChangeText={(t) => definirScore(item.id, t)}
                  keyboardType="number-pad"
                  editable={!termine}
                  selectTextOnFocus
                  textAlign="center"
                />
                {!termine && (
                  <TouchableOpacity style={styles.raccourci} onPress={() => modifierScore(item.id, 5)}>
                    <Text style={styles.raccourciTexte}>+5</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.bouton, styles.boutonPlus]}
                  onPress={() => modifierScore(item.id, 1)}
                  disabled={termine}
                >
                  <Text style={[styles.boutonTexte, styles.boutonTextePlus]}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      <View style={[styles.barreBas, { paddingBottom: 16 + insets.bottom }]}>
        {!termine ? (
          <>
            <TouchableOpacity style={styles.actionSecondaire} onPress={ajouterJoueur}>
              <Text style={styles.actionSecondaireTexte}>+ {prefixe}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionPrincipale} onPress={terminer}>
              <Text style={styles.actionPrincipaleTexte}>Terminer la partie</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={styles.actionPrincipale} onPress={nouvellePartie}>
            <Text style={styles.actionPrincipaleTexte}>Nouvelle partie</Text>
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

      <DialoguePremierJoueur
        visible={tirageOuvert}
        noms={joueurs.map((j) => j.nom)}
        onFermer={() => setTirageOuvert(false)}
      />

      <DialogueBilan visible={bilanOuvert} onPasser={fermerBilan} onEnregistrer={noter} />
    </View>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    page: { flex: 1, backgroundColor: c.page },
    liste: { padding: 16, paddingBottom: 24 },
    chips: { flexGrow: 0 },
    chipsContenu: { gap: 8, paddingHorizontal: 16, paddingVertical: 10, alignItems: "center" },
    chip: {
      borderWidth: 1,
      borderColor: c.accent,
      backgroundColor: c.accentSoft,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    chipTexte: { color: c.accentText, fontSize: 13, fontWeight: "600", lineHeight: 18 },
    actionsEntete: { flexDirection: "row", alignItems: "center", gap: 14 },
    chronoEntete: {
      fontSize: 15,
      fontWeight: "700",
      color: c.textSecondary,
      marginRight: 12,
      fontVariant: ["tabular-nums"],
    },
    reprise: { backgroundColor: c.successSoft, paddingVertical: 8, paddingHorizontal: 16, alignItems: "center" },
    repriseTexte: { color: c.textSecondary, fontSize: 13, fontWeight: "600" },
    extensions: { backgroundColor: c.surfaceAlt, paddingVertical: 8, paddingHorizontal: 16 },
    extensionsTexte: { color: c.textSecondary, fontSize: 13, fontWeight: "600" },
    info: { backgroundColor: c.accentSoft, paddingVertical: 8, paddingHorizontal: 16, alignItems: "center" },
    infoTexte: { color: c.accentText, fontSize: 13, fontWeight: "600" },
    avertissement: { backgroundColor: c.warningSoft, paddingVertical: 8, paddingHorizontal: 16, alignItems: "center" },
    avertissementTexte: { color: c.warningText, fontSize: 13, fontWeight: "600" },
    banniere: { backgroundColor: c.success, padding: 16, alignItems: "center" },
    banniereTexte: { color: c.onSuccess, fontSize: 18, fontWeight: "600" },
    banniereScore: { color: c.onSuccess, fontSize: 14, marginTop: 2, opacity: 0.9 },
    carte: {
      backgroundColor: c.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      padding: 14,
      marginBottom: 12,
    },
    carteEnTete: { borderColor: c.success, borderWidth: 2 },
    ligneHaut: { flexDirection: "row", alignItems: "center", gap: 10 },
    pastille: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
    pastilleTexte: { color: "#fff", fontWeight: "600" },
    nomInput: { flex: 1, fontSize: 16, fontWeight: "600", color: c.textPrimary, paddingVertical: 4 },
    supprimer: { color: c.textFaint, fontSize: 16, paddingHorizontal: 6 },
    membresBouton: {
      marginTop: 10,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 10,
      backgroundColor: c.surfaceAlt,
    },
    membresTexte: { fontSize: 13, color: c.accentText, fontWeight: "600" },
    membresVide: { fontSize: 13, color: c.textMuted },
    ligneScore: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16, marginTop: 10 },
    raccourci: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: c.surfaceAlt },
    raccourciTexte: { fontSize: 14, color: c.textSecondary, fontWeight: "600" },
    bouton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: c.borderStrong,
      alignItems: "center",
      justifyContent: "center",
    },
    boutonPlus: { borderColor: c.accent },
    boutonTexte: { fontSize: 24, color: c.textSecondary },
    boutonTextePlus: { color: c.accentText },
    score: {
      fontSize: 30,
      fontWeight: "700",
      color: c.textPrimary,
      minWidth: 64,
      textAlign: "center",
      borderBottomWidth: 2,
      borderBottomColor: c.border,
      paddingVertical: 2,
    },
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
