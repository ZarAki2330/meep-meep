// app/bibliotheque.tsx — ajouter un jeu tout prêt
//
// La bibliothèque livrée avec l'app. Un jeu choisi ici atterrit dans le catalogue
// comme n'importe quel autre : on peut ensuite le modifier ou le supprimer.

import { useRouter } from "expo-router";
import { Fragment, memo, useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  type ViewToken,
  View,
} from "react-native";

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
import {
  lettreInitiale,
  TRIS_BIBLIO,
  trierBibliotheque,
  type TriBiblioCle,
} from "@/lib/tri-bibliotheque";

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

// Index alphabétique (barre latérale). Le « # » regroupe les jeux commençant par
// un chiffre ou un symbole (« 6 qui prend », « 7 Wonders »…).
const ALPHABET = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N",
  "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "#",
] as const;


// Carte d'un jeu de la bibliothèque, isolée et mémoïsée : lors d'un tri ou d'un
// filtre, seules les cartes dont l'état change se re-rendent, pas les 300 autres.
const CarteJeu = memo(function CarteJeu({
  item,
  ajoute,
  onAjouter,
  onVoir,
  onAccent,
  styles,
}: {
  item: Jeu;
  ajoute: boolean;
  onAjouter: (jeu: Jeu) => void;
  onVoir: (id: string) => void;
  onAccent: string;
  styles: ReturnType<typeof makeStyles>;
}) {
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
          onPress={() => onVoir(item.id)}
        >
          <Text style={styles.voirTexte}>Déjà ajouté</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={styles.ajouter}
          accessibilityRole="button"
          accessibilityLabel={`Ajouter ${item.nom} au catalogue`}
          onPress={() => onAjouter(item)}
        >
          <IconSymbol name="plus" size={18} color={onAccent} />
        </TouchableOpacity>
      )}
    </View>
  );
});

export default function Bibliotheque() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const { jeux, rafraichir } = useJeux();
  const { liste: bibliotheque, chargement } = useBibliotheque();

  const [recherche, setRecherche] = useState("");
  const [tri, setTri] = useState<TriBiblioCle>("alpha");
  const [triOuvert, setTriOuvert] = useState(false);
  // Quand on ajoute une extension sans posséder son jeu de base, on propose
  // d'ajouter aussi le jeu de base (certaines extensions se jouent seules).
  const [propositionBase, setPropositionBase] = useState<{ ext: Jeu; base: Jeu } | null>(null);
  // Lettre correspondant à la position de défilement, surlignée dans la barre d'index.
  const [lettreActive, setLettreActive] = useState<string | null>(null);
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

  // Nombre de jeux pas encore ajoutés (pour le message d'en-tête). Mémoïsé et
  // calculé par réduction, sans allouer de tableau intermédiaire à chaque frappe.
  const restants = useMemo(
    () => resultats.reduce((n, j) => (dejaAjoutes.has(j.id) ? n : n + 1), 0),
    [resultats, dejaAjoutes],
  );
  const resultatsTries = useMemo(() => trierBibliotheque(resultats, tri), [resultats, tri]);

  const ajouterUn = useCallback(
    async (jeu: Jeu) => {
      await ajouterJeu(jeu);
      rafraichir();
    },
    [rafraichir],
  );

  const ajouter = useCallback(
    async (jeu: Jeu) => {
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
    },
    [dejaAjoutes, bibliotheque, ajouterUn],
  );

  const voirFiche = useCallback(
    (id: string) => router.push({ pathname: "/jeu/[id]", params: { id } }),
    [router],
  );

  const renderItem = useCallback(
    ({ item }: { item: Jeu }) => (
      <CarteJeu
        item={item}
        ajoute={dejaAjoutes.has(item.id)}
        onAjouter={ajouter}
        onVoir={voirFiche}
        onAccent={colors.onAccent}
        styles={styles}
      />
    ),
    [dejaAjoutes, ajouter, voirFiche, colors.onAccent, styles],
  );

  // Index alphabétique latéral. Il n'a de sens qu'en tri A → Z : dans les autres
  // tris (catégorie, durée…), les jeux ne sont pas rangés par nom.
  const indexAlpha = tri === "alpha" && !chargement && resultatsTries.length > 0;
  const listeRef = useRef<FlatList<Jeu>>(null);

  // Pour chaque lettre, l'indice du premier jeu qui commence par elle.
  const premierParLettre = useMemo(() => {
    const m = new Map<string, number>();
    resultatsTries.forEach((j, i) => {
      const L = lettreInitiale(j.nom);
      if (!m.has(L)) m.set(L, i);
    });
    return m;
  }, [resultatsTries]);

  const allerALettre = useCallback(
    (lettre: string) => {
      const index = premierParLettre.get(lettre);
      if (index == null) return;
      listeRef.current?.scrollToIndex({ index, animated: true });
    },
    [premierParLettre],
  );

  // Sans getItemLayout (hauteur des cartes non figée, cf. accessibilité), un saut
  // lointain peut échouer : on approche d'abord par la hauteur moyenne, puis on
  // recale précisément une fois les cartes rendues.
  const onScrollToIndexFailed = useCallback(
    (info: { index: number; averageItemLength: number }) => {
      listeRef.current?.scrollToOffset({
        offset: Math.max(0, info.averageItemLength * info.index),
        animated: true,
      });
      setTimeout(() => {
        listeRef.current?.scrollToIndex({ index: info.index, animated: true });
      }, 80);
    },
    [],
  );

  // Met à jour la lettre active au fil du défilement : le premier jeu visible
  // (le plus haut) donne la lettre courante. React Native exige une référence
  // stable pour ce callback et sa config, d'où les `useRef`.
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const premier = viewableItems[0]?.item as Jeu | undefined;
    if (premier) setLettreActive(lettreInitiale(premier.nom));
  }).current;
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 30 }).current;

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

      {chargement ? (
        <View style={styles.chargement}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.chargementTexte}>Chargement du catalogue…</Text>
        </View>
      ) : (
        <View style={styles.zoneListe}>
          <FlatList
            ref={listeRef}
            data={resultatsTries}
            keyExtractor={(j) => j.id}
            contentContainerStyle={[styles.liste, indexAlpha && styles.listeAvecIndex]}
            ListHeaderComponent={
              <Text style={styles.intro}>
                {restants > 0
                  ? `${restants} jeu${restants > 1 ? "x" : ""} à découvrir. Une fois ajouté, un jeu t'appartient : à toi de le modifier ou de le supprimer.`
                  : "Tous les jeux de la bibliothèque sont déjà dans ton catalogue."}
              </Text>
            }
            ListEmptyComponent={<Text style={styles.vide}>Aucun jeu ne porte ce nom.</Text>}
            renderItem={renderItem}
            // Permet d'appuyer sur « Ajouter » sans devoir d'abord fermer le clavier
            // ouvert par la recherche : le premier tap agit directement.
            keyboardShouldPersistTaps="handled"
            initialNumToRender={16}
            maxToRenderPerBatch={12}
            windowSize={11}
            removeClippedSubviews
            onScrollToIndexFailed={onScrollToIndexFailed}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            // Pas de getItemLayout ici, volontairement : la hauteur d'une carte n'est
            // pas figée (l'app respecte l'agrandissement de police système pour
            // l'accessibilité). La coder en dur casserait l'affichage en gros texte.
          />

          {indexAlpha && (
            // Barre d'index A → Z : chaque lettre saute au premier jeu concerné.
            // Les lettres sans jeu sont estompées et non cliquables.
            <View style={styles.indexBarre} pointerEvents="box-none">
              {ALPHABET.map((L, i) => {
                const actif = premierParLettre.has(L);
                const surligne = L === lettreActive;
                return (
                  <Fragment key={L}>
                    <TouchableOpacity
                      disabled={!actif}
                      onPress={() => allerALettre(L)}
                      hitSlop={{ top: 2, bottom: 2, left: 10, right: 6 }}
                      accessibilityRole="button"
                      accessibilityState={{ selected: surligne }}
                      accessibilityLabel={
                        L === "#" ? "Aller aux jeux commençant par un chiffre" : `Aller à la lettre ${L}`
                      }
                    >
                      <Text
                        allowFontScaling={false}
                        style={[
                          styles.indexLettre,
                          !actif && styles.indexLettreInactif,
                          surligne && styles.indexLettreActive,
                        ]}
                      >
                        {L}
                      </Text>
                    </TouchableOpacity>
                    {/* Point de séparation, purement décoratif (aère la barre). */}
                    {i < ALPHABET.length - 1 && (
                      <Text
                        allowFontScaling={false}
                        style={styles.indexPoint}
                        accessibilityElementsHidden
                        importantForAccessibility="no"
                      >
                        ·
                      </Text>
                    )}
                  </Fragment>
                );
              })}
            </View>
          )}
        </View>
      )}

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
    zoneListe: { flex: 1 },
    liste: { padding: 16, paddingBottom: 40, gap: 10 },
    // Marge à droite pour que les cartes ne passent pas sous la barre d'index.
    listeAvecIndex: { paddingRight: 28 },
    indexBarre: {
      position: "absolute",
      right: 2,
      top: 0,
      bottom: 0,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: 8,
    },
    indexLettre: {
      width: 18,
      fontSize: 11,
      lineHeight: 15,
      fontWeight: "700",
      textAlign: "center",
      color: c.accentText,
    },
    indexLettreInactif: { color: c.textMuted, opacity: 0.35 },
    // Lettre correspondant à la zone où on se trouve : pastille en couleur d'accent.
    indexLettreActive: {
      color: c.onAccent,
      backgroundColor: c.accent,
      borderRadius: 8,
      overflow: "hidden",
    },
    indexPoint: {
      width: 18,
      fontSize: 8,
      lineHeight: 9,
      textAlign: "center",
      color: c.textMuted,
      opacity: 0.5,
    },
    intro: { fontSize: 13, color: c.textMuted, lineHeight: 18, marginBottom: 6 },
    vide: { fontSize: 14, color: c.textMuted, textAlign: "center", marginTop: 24 },
    chargement: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
    chargementTexte: { fontSize: 14, color: c.textMuted },
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
