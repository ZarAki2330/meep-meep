// app/bibliotheque.tsx — ajouter un jeu tout prêt
//
// La bibliothèque livrée avec l'app. Un jeu choisi ici atterrit dans le catalogue
// comme n'importe quel autre : on peut ensuite le modifier ou le supprimer.

import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { DialogueConfirmation } from "@/components/dialogue-confirmation";
import { Entete } from "@/components/entete";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { VisuelJeu } from "@/components/visuel-jeu";
import { type AppColors } from "@/constants/theme-colors";
import { useJeux } from "@/context/jeux";
import { useTheme } from "@/context/theme";
import { type Jeu } from "@/data/jeux";
import { useBibliotheque } from "@/hooks/use-bibliotheque";
import { ajouterJeu } from "@/db/jeux";
import { TRIS_BIBLIO, trierBibliotheque, type TriBiblioCle } from "@/lib/tri-bibliotheque";

const LIBELLES_MODE: Record<NonNullable<Jeu["scoreMode"]>, string> = {
  compteur: "Compteur",
  objectif: "Objectif",
  grille: "Feuille de score",
  manches: "Manches",
  cooperatif: "Coopératif",
};

// Étiquette affichée sur les extensions et éditions, pour les distinguer d'un jeu de base.
const LIBELLE_TYPE = { extension: "Extension", edition: "Édition" } as const;

function joueurs(j: Jeu): string {
  const unite = j.equipes ? "équipes" : "joueurs";
  const nombre = j.joueursMin === j.joueursMax ? `${j.joueursMin}` : `${j.joueursMin}–${j.joueursMax}`;
  return `${nombre} ${unite}`;
}

export default function Bibliotheque() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const router = useRouter();
  const { jeux, rafraichir } = useJeux();
  const bibliotheque = useBibliotheque();

  const [recherche, setRecherche] = useState("");
  const [tri, setTri] = useState<TriBiblioCle>("alpha");
  const [triOuvert, setTriOuvert] = useState(false);
  // Quand on ajoute une extension sans posséder son jeu de base, on propose
  // d'ajouter aussi le jeu de base (certaines extensions se jouent seules).
  const [propositionBase, setPropositionBase] = useState<{ ext: Jeu; base: Jeu } | null>(null);
  const dejaAjoutes = useMemo(() => new Set(jeux.map((j) => j.id)), [jeux]);

  // Le tri par défaut (A → Z) ne « personnalise » pas l'écran : le bouton ne
  // s'allume que dès qu'on choisit un autre tri.
  const triPersonnalise = tri !== "alpha";
  const labelTri = TRIS_BIBLIO.find((t) => t.cle === tri)?.label ?? "";

  const resultats = useMemo(() => {
    const texte = recherche.trim().toLowerCase();
    // Ici, contrairement au catalogue, on n'a pas de fiche pour atteindre les
    // extensions et éditions rangées sous un jeu de base : on les affiche donc
    // toutes, sinon elles seraient impossibles à ajouter en parcourant la liste.
    // Un badge « Extension »/« Édition » permet de les reconnaître.
    if (!texte) return bibliotheque;
    return bibliotheque.filter(
      (j) =>
        j.nom.toLowerCase().includes(texte) || j.categorie.toLowerCase().includes(texte),
    );
  }, [recherche, bibliotheque]);

  const restants = resultats.filter((j) => !dejaAjoutes.has(j.id)).length;
  const resultatsTries = useMemo(() => trierBibliotheque(resultats, tri), [resultats, tri]);

  async function ajouterUn(jeu: Jeu) {
    await ajouterJeu(jeu);
    rafraichir();
  }

  async function ajouter(jeu: Jeu) {
    // Extension ou édition dont le jeu de base n'est pas encore dans la ludothèque :
    // on propose de l'ajouter aussi, sans l'imposer.
    if (jeu.type && jeu.type !== "jeu" && jeu.jeuParent && !dejaAjoutes.has(jeu.jeuParent)) {
      const base = bibliotheque.find((j) => j.id === jeu.jeuParent);
      if (base) {
        setPropositionBase({ ext: jeu, base });
        return;
      }
    }
    await ajouterUn(jeu);
  }

  return (
    <View style={styles.page}>
      <Entete titre="Ajouter un jeu tout prêt" />

      <View style={styles.rechercheLigne}>
        <View style={styles.rechercheChamp}>
          <IconSymbol name="magnifyingglass" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.rechercheInput}
            value={recherche}
            onChangeText={setRecherche}
            placeholder="Rechercher dans la bibliothèque"
            placeholderTextColor={colors.placeholder}
          />
          {recherche.length > 0 && (
            <TouchableOpacity
              onPress={() => setRecherche("")}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Effacer la recherche"
            >
              <IconSymbol name="xmark" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.triBouton, (triOuvert || triPersonnalise) && styles.triBoutonActif]}
          accessibilityRole="button"
          accessibilityLabel={triPersonnalise ? `Trier, ${labelTri}` : "Trier"}
          accessibilityState={{ expanded: triOuvert }}
          onPress={() => setTriOuvert((o) => !o)}
        >
          <IconSymbol
            name="slider.horizontal.3"
            size={20}
            color={triOuvert || triPersonnalise ? colors.onAccent : colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {triOuvert && (
        <View style={styles.panneau}>
          <Text style={styles.groupeLabel}>Trier par</Text>
          <View style={styles.chipsWrap}>
            {TRIS_BIBLIO.map((t) => {
              const actif = tri === t.cle;
              return (
                <TouchableOpacity
                  key={t.cle}
                  style={[styles.chip, actif && styles.chipActif]}
                  // Un seul tri à la fois : sémantique de sélection, pas d'interrupteur.
                  accessibilityRole="button"
                  accessibilityState={{ selected: actif }}
                  accessibilityLabel={`Trier par ${t.label}`}
                  onPress={() => setTri(t.cle)}
                >
                  <Text style={[styles.chipTexte, actif && styles.chipTexteActif]}>{t.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      <FlatList
        data={resultatsTries}
        keyExtractor={(j) => j.id}
        contentContainerStyle={styles.liste}
        ListHeaderComponent={
          <Text style={styles.intro}>
            {restants > 0
              ? `${restants} jeu${restants > 1 ? "x" : ""} à découvrir. Une fois ajouté, un jeu t'appartient : à toi de le modifier ou de le supprimer.`
              : "Tous les jeux de la bibliothèque sont déjà dans ton catalogue."}
          </Text>
        }
        ListEmptyComponent={<Text style={styles.vide}>Aucun jeu ne porte ce nom.</Text>}
        renderItem={({ item }) => {
          const ajoute = dejaAjoutes.has(item.id);
          return (
            <View style={styles.carte}>
              <VisuelJeu jeu={item} style={styles.visuel} />

              <View style={styles.corps}>
                <View style={styles.nomLigne}>
                  <Text style={styles.nom} numberOfLines={1}>
                    {item.nom}
                  </Text>
                  {item.type && item.type !== "jeu" ? (
                    <Text style={styles.typeTag}>{LIBELLE_TYPE[item.type]}</Text>
                  ) : null}
                </View>
                <Text style={styles.meta} numberOfLines={1}>
                  {item.categorie} · {joueurs(item)} · {item.dureeMin} min
                  {item.editeur ? ` · ${item.editeur}` : ""}
                </Text>
                <Text style={styles.badge}>{LIBELLES_MODE[item.scoreMode ?? "compteur"]}</Text>
              </View>

              {ajoute ? (
                <TouchableOpacity
                  style={styles.voir}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.nom}, déjà ajouté. Voir la fiche`}
                  onPress={() => router.push({ pathname: "/jeu/[id]", params: { id: item.id } })}
                >
                  <Text style={styles.voirTexte}>Déjà ajouté</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.ajouter}
                  accessibilityRole="button"
                  accessibilityLabel={`Ajouter ${item.nom} au catalogue`}
                  onPress={() => ajouter(item)}
                >
                  <IconSymbol name="plus" size={18} color={colors.onAccent} />
                </TouchableOpacity>
              )}
            </View>
          );
        }}
      />

      <DialogueConfirmation
        visible={!!propositionBase}
        variante="accent"
        titre="Ajouter aussi le jeu de base ?"
        message={
          propositionBase
            ? `« ${propositionBase.ext.nom} » est une extension de « ${propositionBase.base.nom} », que tu n'as pas encore. Certaines extensions se jouent seules, d'autres ont besoin du jeu de base.`
            : undefined
        }
        texteConfirmer="Ajouter les deux"
        texteAnnuler="Extension seule"
        onConfirmer={() => {
          const p = propositionBase;
          setPropositionBase(null);
          if (p) {
            // Le jeu de base d'abord, puis l'extension.
            ajouterUn(p.base).then(() => ajouterUn(p.ext));
          }
        }}
        onAnnuler={() => {
          const p = propositionBase;
          setPropositionBase(null);
          if (p) ajouterUn(p.ext);
        }}
        // Fermer sans choisir n'ajoute rien.
        onFermer={() => setPropositionBase(null)}
      />
    </View>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    page: { flex: 1, backgroundColor: c.page },
    rechercheLigne: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginHorizontal: 16,
      marginTop: 12,
    },
    rechercheChamp: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    rechercheInput: { flex: 1, fontSize: 15, color: c.textPrimary, padding: 0 },
    triBouton: {
      width: 46,
      alignSelf: "stretch",
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    triBoutonActif: { backgroundColor: c.accent, borderColor: c.accent },
    panneau: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      marginHorizontal: 16,
      marginTop: 10,
      padding: 12,
    },
    groupeLabel: { fontSize: 13, fontWeight: "600", color: c.textSecondary, marginBottom: 8 },
    chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: {
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surfaceAlt,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    chipActif: { backgroundColor: c.accent, borderColor: c.accent },
    chipTexte: { fontSize: 13, color: c.textSecondary, fontWeight: "600" },
    chipTexteActif: { color: c.onAccent },
    liste: { padding: 16, paddingBottom: 40, gap: 10 },
    intro: { fontSize: 13, color: c.textMuted, lineHeight: 18, marginBottom: 6 },
    vide: { fontSize: 14, color: c.textMuted, textAlign: "center", marginTop: 24 },
    carte: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 14,
      padding: 10,
    },
    visuel: { width: 56, height: 56, borderRadius: 10 },
    corps: { flex: 1, gap: 2 },
    nomLigne: { flexDirection: "row", alignItems: "center", gap: 8 },
    nom: { flexShrink: 1, fontSize: 16, fontWeight: "600", color: c.textPrimary },
    typeTag: {
      fontSize: 10,
      fontWeight: "700",
      color: c.textMuted,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 6,
      paddingHorizontal: 5,
      paddingVertical: 1,
      overflow: "hidden",
    },
    meta: { fontSize: 12, color: c.textMuted },
    badge: { fontSize: 11, fontWeight: "600", color: c.accentText, marginTop: 2 },
    ajouter: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    voir: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: c.surfaceAlt,
      borderWidth: 1,
      borderColor: c.border,
    },
    voirTexte: { fontSize: 12, fontWeight: "600", color: c.textMuted },
  });
}
