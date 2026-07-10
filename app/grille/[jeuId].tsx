// app/grille/[jeuId].tsx — feuille de score générique, pilotée par les catégories du jeu

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
import { type CategorieScore } from "@/data/jeux";
import { prefixeJoueur, usePartie, type JoueurPartie } from "@/hooks/use-partie";
import { formatChrono } from "@/lib/duree";

type Joueur = JoueurPartie;
type Scores = Record<string, Record<string, string>>;
type Styles = ReturnType<typeof makeStyles>;

const LARGEUR_LABEL = 130;
const LARGEUR_COL = 68;

export default function FeuilleGrille() {
  const { jeuId } = useLocalSearchParams<{ jeuId: string }>();
  const { colors } = useTheme();
  const { jeux } = useJeux();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(colors);
  const jeu = jeux.find((j) => j.id === jeuId);

  const categories: CategorieScore[] = jeu?.categories ?? [];
  const bonus = jeu?.bonus;
  const prefixe = prefixeJoueur(jeu);

  const {
    joueurs,
    joueursSauvegardes,
    joueursDispo,
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
    extraInitial: { scores: {} as Scores },
    vierge: (js, e) => {
      const aucunScore = Object.values(e.scores).every((c) =>
        Object.values(c).every((v) => v === ""),
      );
      return (
        aucunScore &&
        js.length === 2 &&
        js.every((j, i) => j.nom === `${prefixe} ${i + 1}` && !j.membres?.length)
      );
    },
  });

  const scores = extra.scores;
  function majScores(maj: (s: Scores) => Scores) {
    setExtra((e) => ({ ...e, scores: maj(e.scores) }));
  }

  function valeur(joueurId: string, cle: string): number {
    const n = parseInt(scores[joueurId]?.[cle] ?? "", 10);
    return isNaN(n) ? 0 : n;
  }

  // Autorise un signe moins en tête (scores négatifs, ex. le militaire à 7 Wonders).
  function definir(joueurId: string, cle: string, texte: string) {
    const negatif = texte.trimStart().startsWith("-");
    const propre = (negatif ? "-" : "") + texte.replace(/[^0-9]/g, "");
    majScores((prev) => ({
      ...prev,
      [joueurId]: { ...(prev[joueurId] ?? {}), [cle]: propre },
    }));
  }

  function sommeCles(joueurId: string, cles: string[]) {
    return cles.reduce((s, c) => s + valeur(joueurId, c), 0);
  }

  function bonusGagne(joueurId: string) {
    if (!bonus) return 0;
    return sommeCles(joueurId, bonus.surCles) >= bonus.seuil ? bonus.points : 0;
  }

  function total(joueurId: string) {
    const base = sommeCles(joueurId, categories.map((c) => c.cle));
    return base + bonusGagne(joueurId);
  }

  function supprimerJoueur(id: string) {
    retirerJoueur(id);
    majScores((prev) => {
      const copie = { ...prev };
      delete copie[id];
      return copie;
    });
  }

  const totaux = joueurs.map((j) => total(j.id));
  const meilleurTotal = totaux.length ? Math.max(...totaux) : 0;
  const tousEgaux = totaux.every((t) => t === totaux[0]);
  const gagnants = joueurs.filter((j) => total(j.id) === meilleurTotal);
  const [resultat, setResultat] = useState<string | null>(null);

  function terminer() {
    if (gagnants.length > 1) {
      setEgaliteOuverte(true);
      return;
    }
    finaliser(gagnants[0]?.nom ?? "");
  }

  // Rappelée après un « continuer à modifier », elle ne recrée pas de ligne
  // d'historique : le hook sait que la partie est déjà enregistrée.
  async function finaliser(nomGagnant: string) {
    setResultat(nomGagnant);
    await terminerPartie({
      joueurs: joueurs.map((j) => ({
        nom: j.nom,
        score: total(j.id),
        membres: j.membres?.length ? j.membres : undefined,
      })),
      gagnant: nomGagnant,
      scoreGagnant: meilleurTotal,
    });
  }

  const { width } = useWindowDimensions();
  const largeurCol = Math.max(LARGEUR_COL, (width - 24 - LARGEUR_LABEL) / joueurs.length);

  // Regroupe les catégories par section, en gardant l'ordre.
  const sections: { nom: string | null; cats: CategorieScore[] }[] = [];
  for (const cat of categories) {
    const nom = cat.section ?? null;
    const derniere = sections[sections.length - 1];
    if (derniere && derniere.nom === nom) derniere.cats.push(cat);
    else sections.push({ nom, cats: [cat] });
  }

  return (
    <View style={styles.page}>
      <Entete
        titre={jeu ? jeu.nom : "Feuille de score"}
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

      {termine && resultat !== null && (
        <View style={styles.banniere}>
          <Text style={styles.banniereTexte}>
            {resultat
              ? `🏆 ${resultat} gagne avec ${meilleurTotal} points !`
              : `🤝 Égalité à ${meilleurTotal} points entre ${gagnants.map((g) => g.nom).join(", ")}`}
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

          {sections.map((section, si) => {
            const clesSection = section.cats.map((c) => c.cle);
            const bonusIci =
              bonus && bonus.surCles.every((c) => clesSection.includes(c)) ? bonus : null;
            return (
              <View key={si}>
                {section.nom && (
                  <SectionLigne
                    titre={section.nom}
                    nbJoueurs={joueurs.length}
                    largeurCol={largeurCol}
                    styles={styles}
                  />
                )}
                {section.cats.map((cat) => (
                  <LigneCategorie
                    key={cat.cle}
                    label={cat.label}
                    aide={cat.aide}
                    joueurs={joueurs}
                    cle={cat.cle}
                    scores={scores}
                    definir={definir}
                    termine={termine}
                    largeurCol={largeurCol}
                    styles={styles}
                  />
                ))}
                {bonusIci && (
                  <>
                    <LigneTotal
                      label={section.nom ? `Total ${section.nom.toLowerCase()}` : "Sous-total"}
                      joueurs={joueurs}
                      calcul={(id) => sommeCles(id, clesSection)}
                      largeurCol={largeurCol}
                      styles={styles}
                    />
                    <LigneTotal
                      label={bonusIci.label}
                      joueurs={joueurs}
                      calcul={bonusGagne}
                      largeurCol={largeurCol}
                      styles={styles}
                    />
                  </>
                )}
              </View>
            );
          })}

            <LigneTotal
              label="TOTAL"
              joueurs={joueurs}
              calcul={total}
              fort
              meilleur={meilleurTotal}
              surligner={!tousEgaux}
              largeurCol={largeurCol}
              styles={styles}
            />
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

function SectionLigne({
  titre,
  nbJoueurs,
  largeurCol,
  styles,
}: {
  titre: string;
  nbJoueurs: number;
  largeurCol: number;
  styles: Styles;
}) {
  return (
    <View style={styles.ligneSection}>
      <View style={styles.cellLabel}>
        <Text style={styles.sectionTexte}>{titre}</Text>
      </View>
      {Array.from({ length: nbJoueurs }).map((_, i) => (
        <View key={i} style={[styles.cell, { width: largeurCol }]} />
      ))}
    </View>
  );
}

function LigneCategorie({
  label,
  aide,
  joueurs,
  cle,
  scores,
  definir,
  termine,
  largeurCol,
  styles,
}: {
  label: string;
  aide?: string;
  joueurs: Joueur[];
  cle: string;
  scores: Scores;
  definir: (j: string, c: string, t: string) => void;
  termine: boolean;
  largeurCol: number;
  styles: Styles;
}) {
  return (
    <View style={styles.ligne}>
      <View style={styles.cellLabel}>
        <Text style={styles.labelTexte}>{label}</Text>
        {aide && <Text style={styles.aideTexte}>{aide}</Text>}
      </View>
      {joueurs.map((j) => (
        <View key={j.id} style={[styles.cell, { width: largeurCol }]}>
          <TextInput
            style={styles.caseInput}
            value={scores[j.id]?.[cle] ?? ""}
            onChangeText={(t) => definir(j.id, cle, t)}
            keyboardType={Platform.OS === "ios" ? "numbers-and-punctuation" : "numeric"}
            editable={!termine}
            textAlign="center"
            placeholder="—"
            placeholderTextColor={styles.placeholderColor.color}
          />
        </View>
      ))}
    </View>
  );
}

function LigneTotal({
  label,
  joueurs,
  calcul,
  fort,
  meilleur,
  surligner,
  largeurCol,
  styles,
}: {
  label: string;
  joueurs: Joueur[];
  calcul: (id: string) => number;
  fort?: boolean;
  meilleur?: number;
  surligner?: boolean;
  largeurCol: number;
  styles: Styles;
}) {
  return (
    <View style={[styles.ligne, styles.ligneTotal]}>
      <View style={styles.cellLabel}>
        <Text style={[styles.totalLabel, fort && styles.totalLabelFort]}>{label}</Text>
      </View>
      {joueurs.map((j) => {
        const v = calcul(j.id);
        const gagnant = fort && surligner && meilleur !== undefined && v === meilleur;
        return (
          <View key={j.id} style={[styles.cell, { width: largeurCol }, gagnant && styles.cellGagnant]}>
            <Text style={[styles.totalValeur, fort && styles.totalValeurFort]}>{v}</Text>
          </View>
        );
      })}
    </View>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    page: { flex: 1, backgroundColor: c.page },
    zoneTableau: { flex: 1 },
    grille: { padding: 12 },
    banniere: { backgroundColor: c.success, padding: 14, alignItems: "center" },
    banniereTexte: { color: c.onSuccess, fontSize: 16, fontWeight: "600" },
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
    ligneSection: { flexDirection: "row", marginTop: 6 },
    ligneTotal: { marginTop: 2 },
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
    sectionTexte: { fontSize: 13, fontWeight: "700", color: c.accentText },
    labelTexte: { fontSize: 14, color: c.textSecondary },
    aideTexte: { fontSize: 11, color: c.textFaint },
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
    placeholderColor: { color: c.placeholder },
    totalLabel: { fontSize: 13, fontWeight: "600", color: c.textSecondary },
    totalLabelFort: { fontSize: 15, fontWeight: "700", color: c.textPrimary },
    totalValeur: { fontSize: 15, fontWeight: "600", color: c.textSecondary },
    totalValeurFort: { fontSize: 18, fontWeight: "700", color: c.textPrimary },
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
