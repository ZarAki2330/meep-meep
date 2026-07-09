import { useRouter } from "expo-router";
import { useMemo, useState, type ReactNode } from "react";
import { FlatList, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { VisuelJeu } from "@/components/visuel-jeu";
import { POLICE_TITRE } from "@/constants/fonts";
import { type AppColors } from "@/constants/theme-colors";
import { useJeux } from "@/context/jeux";
import { useTheme } from "@/context/theme";

type DureeCle = "court" | "moyen" | "long";

const DUREES: { cle: DureeCle; label: string }[] = [
  { cle: "court", label: "≤ 30 min" },
  { cle: "moyen", label: "30–60 min" },
  { cle: "long", label: "> 60 min" },
];

const JOUEURS_OPTIONS = [2, 3, 4, 5, 6];

export default function Catalogue() {
  const { colors, mode, toggle } = useTheme();
  const { jeux, estFavori, basculerFavori } = useJeux();
  const styles = makeStyles(colors);
  const router = useRouter();

  const [recherche, setRecherche] = useState("");
  const [categorie, setCategorie] = useState<string | null>(null);
  const [joueurs, setJoueurs] = useState<number | null>(null);
  const [duree, setDuree] = useState<DureeCle | null>(null);
  const [favorisSeuls, setFavorisSeuls] = useState(false);
  const [filtresOuverts, setFiltresOuverts] = useState(false);

  const categories = useMemo(() => Array.from(new Set(jeux.map((j) => j.categorie))), [jeux]);
  const nbFiltres =
    (categorie ? 1 : 0) + (joueurs ? 1 : 0) + (duree ? 1 : 0) + (favorisSeuls ? 1 : 0);

  const jeuxFiltres = useMemo(() => {
    const texte = recherche.trim().toLowerCase();
    return jeux.filter((j) => {
      if (texte && !j.nom.toLowerCase().includes(texte)) return false;
      if (favorisSeuls && !estFavori(j.id)) return false;
      if (categorie && j.categorie !== categorie) return false;
      if (joueurs != null) {
        if (joueurs === 6) {
          if (j.joueursMax < 6) return false;
        } else if (!(j.joueursMin <= joueurs && joueurs <= j.joueursMax)) {
          return false;
        }
      }
      if (duree === "court" && j.dureeMin > 30) return false;
      if (duree === "moyen" && (j.dureeMin < 30 || j.dureeMin > 60)) return false;
      if (duree === "long" && j.dureeMin <= 60) return false;
      return true;
    });
  }, [jeux, recherche, categorie, joueurs, duree, favorisSeuls, estFavori]);

  function reinitialiser() {
    setCategorie(null);
    setJoueurs(null);
    setDuree(null);
    setFavorisSeuls(false);
  }

  return (
    <SafeAreaView style={styles.page} edges={["top"]}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Image
            source={
              mode === "dark"
                ? require("@/assets/images/logo-header-dark.png")
                : require("@/assets/images/logo-header.png")
            }
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.sousTitre}>Ma ludothèque</Text>
        </View>
        <View style={styles.headerBoutons}>
          <TouchableOpacity
            style={styles.themeBouton}
            activeOpacity={0.7}
            onPress={() => router.push("/import")}
          >
            <IconSymbol name="plus" size={22} color={colors.accentText} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.themeBouton} activeOpacity={0.7} onPress={toggle}>
            <Text style={styles.themeIcone}>{mode === "dark" ? "☀" : "☾"}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.rechercheLigne}>
        <View style={styles.rechercheChamp}>
          <IconSymbol name="magnifyingglass" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.rechercheInput}
            value={recherche}
            onChangeText={setRecherche}
            placeholder="Rechercher un jeu"
            placeholderTextColor={colors.placeholder}
          />
          {recherche.length > 0 && (
            <TouchableOpacity onPress={() => setRecherche("")}>
              <IconSymbol name="xmark" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.filtreBouton, (filtresOuverts || nbFiltres > 0) && styles.filtreBoutonActif]}
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
          <Groupe titre="Favoris" styles={styles}>
            <Chip
              label="★ Favoris uniquement"
              actif={favorisSeuls}
              onPress={() => setFavorisSeuls((v) => !v)}
              styles={styles}
            />
          </Groupe>

          <Groupe titre="Catégorie" styles={styles}>
            {categories.map((cat) => (
              <Chip
                key={cat}
                label={cat}
                actif={categorie === cat}
                onPress={() => setCategorie((v) => (v === cat ? null : cat))}
                styles={styles}
              />
            ))}
          </Groupe>

          <Groupe titre="Nombre de joueurs" styles={styles}>
            {JOUEURS_OPTIONS.map((n) => (
              <Chip
                key={n}
                label={n === 6 ? "6+" : String(n)}
                actif={joueurs === n}
                onPress={() => setJoueurs((v) => (v === n ? null : n))}
                styles={styles}
              />
            ))}
          </Groupe>

          <Groupe titre="Durée" styles={styles}>
            {DUREES.map((d) => (
              <Chip
                key={d.cle}
                label={d.label}
                actif={duree === d.cle}
                onPress={() => setDuree((v) => (v === d.cle ? null : d.cle))}
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

      <FlatList
        data={jeuxFiltres}
        keyExtractor={(jeu) => jeu.id}
        contentContainerStyle={styles.liste}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.vide}>
            <Text style={styles.videTexte}>Aucun jeu ne correspond à ta recherche.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.carte}
            activeOpacity={0.7}
            onPress={() => router.push(`/jeu/${item.id}`)}
          >
            <VisuelJeu jeu={item} style={styles.carteImage} />
            <View style={styles.carteCorps}>
              <Text style={styles.nomJeu} numberOfLines={1}>
                {item.nom}
              </Text>
              <Text style={styles.meta}>
                {item.joueursMin}–{item.joueursMax} joueurs · {item.dureeMin} min · {item.categorie}
              </Text>
              <Text style={styles.description} numberOfLines={2}>
                {item.description}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.etoile}
              hitSlop={10}
              onPress={() => basculerFavori(item.id)}
            >
              <IconSymbol
                name={estFavori(item.id) ? "star.fill" : "star"}
                size={22}
                color={estFavori(item.id) ? colors.accent : colors.textFaint}
              />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
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
    <TouchableOpacity style={[styles.chip, actif && styles.chipActif]} onPress={onPress}>
      <Text style={[styles.chipTexte, actif && styles.chipTexteActif]}>{label}</Text>
    </TouchableOpacity>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    page: { flex: 1, backgroundColor: c.page },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 8,
    },
    titre: { fontSize: 30, fontFamily: POLICE_TITRE, color: c.accentText },
    logo: { height: 34, aspectRatio: 1428 / 249, alignSelf: "flex-start" },
    sousTitre: { fontSize: 15, color: c.textMuted, marginTop: 4 },
    headerBoutons: { flexDirection: "row", gap: 8 },
    themeBouton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.accentSoft,
      alignItems: "center",
      justifyContent: "center",
    },
    themeIcone: { fontSize: 18, color: c.accentText },
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
    },
    chipActif: { backgroundColor: c.accent, borderColor: c.accent },
    chipTexte: { fontSize: 13, color: c.textSecondary, fontWeight: "600" },
    chipTexteActif: { color: c.onAccent },
    reset: { fontSize: 13, color: c.accentText, fontWeight: "600", marginTop: 2 },
    liste: { paddingHorizontal: 16, paddingBottom: 24, flexGrow: 1 },
    carte: {
      flexDirection: "row",
      backgroundColor: c.surface,
      borderRadius: 14,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: c.border,
      overflow: "hidden",
    },
    carteImage: { width: 100, minHeight: 100, alignSelf: "stretch" },
    carteCorps: { flex: 1, padding: 14, paddingRight: 40, justifyContent: "center" },
    etoile: { position: "absolute", top: 8, right: 8, padding: 4 },
    nomJeu: { fontSize: 17, fontWeight: "600", color: c.textPrimary },
    meta: { fontSize: 13, color: c.textMuted, marginTop: 4, marginBottom: 8 },
    description: { fontSize: 14, color: c.textSecondary, lineHeight: 20 },
    vide: { alignItems: "center", paddingTop: 60, paddingHorizontal: 24 },
    videTexte: { fontSize: 15, color: c.textMuted, textAlign: "center" },
  });
}
