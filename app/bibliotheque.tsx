// app/bibliotheque.tsx — ajouter un jeu tout prêt
//
// La bibliothèque livrée avec l'app. Un jeu choisi ici atterrit dans le catalogue
// comme n'importe quel autre : on peut ensuite le modifier ou le supprimer.

import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { Entete } from "@/components/entete";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { VisuelJeu } from "@/components/visuel-jeu";
import { type AppColors } from "@/constants/theme-colors";
import { useJeux } from "@/context/jeux";
import { useTheme } from "@/context/theme";
import { type Jeu } from "@/data/jeux";
import { useBibliotheque } from "@/hooks/use-bibliotheque";
import { ajouterJeu } from "@/db/jeux";
import { estJeuDeBase } from "@/lib/regroupement";

const LIBELLES_MODE: Record<NonNullable<Jeu["scoreMode"]>, string> = {
  compteur: "Compteur",
  objectif: "Objectif",
  grille: "Feuille de score",
  manches: "Manches",
  cooperatif: "Coopératif",
};

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
  const dejaAjoutes = useMemo(() => new Set(jeux.map((j) => j.id)), [jeux]);

  const resultats = useMemo(() => {
    const texte = recherche.trim().toLowerCase();
    // Hors recherche, on masque extensions et éditions : elles se retrouvent
    // sous leur jeu de base (sur sa fiche). La recherche, elle, trouve tout.
    if (!texte) {
      const ids = new Set(bibliotheque.map((j) => j.id));
      return bibliotheque.filter(
        (j) => estJeuDeBase(j) || !j.jeuParent || !ids.has(j.jeuParent),
      );
    }
    return bibliotheque.filter(
      (j) =>
        j.nom.toLowerCase().includes(texte) || j.categorie.toLowerCase().includes(texte),
    );
  }, [recherche, bibliotheque]);

  const restants = resultats.filter((j) => !dejaAjoutes.has(j.id)).length;

  async function ajouter(jeu: Jeu) {
    await ajouterJeu(jeu);
    rafraichir();
  }

  return (
    <View style={styles.page}>
      <Entete titre="Ajouter un jeu tout prêt" />

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

      <FlatList
        data={resultats}
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
                <Text style={styles.nom} numberOfLines={1}>
                  {item.nom}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {item.categorie} · {joueurs(item)} · {item.dureeMin} min
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
    </View>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    page: { flex: 1, backgroundColor: c.page },
    rechercheChamp: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginHorizontal: 16,
      marginTop: 12,
    },
    rechercheInput: { flex: 1, fontSize: 15, color: c.textPrimary, padding: 0 },
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
    nom: { fontSize: 16, fontWeight: "600", color: c.textPrimary },
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
