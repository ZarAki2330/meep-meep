// app/bgg.tsx — recherche et import de jeux depuis BoardGameGeek

import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { type AppColors } from "@/constants/theme-colors";
import { useJeux } from "@/context/jeux";
import { useTheme } from "@/context/theme";
import { ajouterJeu } from "@/db/jeux";
import { importerDepuisBgg, jetonConfigure, rechercherBgg, type BggResultat } from "@/lib/bgg";

export default function ImporterBgg() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const router = useRouter();
  const { rafraichir } = useJeux();

  const [requete, setRequete] = useState("");
  const [resultats, setResultats] = useState<BggResultat[]>([]);
  const [chargement, setChargement] = useState(false);
  const [importId, setImportId] = useState<string | null>(null);
  const [aCherche, setACherche] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState<string | null>(null);

  const configure = jetonConfigure();

  async function chercher() {
    const q = requete.trim();
    if (!q) return;
    setChargement(true);
    setACherche(true);
    setErreur(null);
    setSucces(null);
    try {
      setResultats(await rechercherBgg(q));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
      setResultats([]);
    } finally {
      setChargement(false);
    }
  }

  async function importer(res: BggResultat) {
    setImportId(res.id);
    setErreur(null);
    try {
      const jeu = await importerDepuisBgg(res.id);
      await ajouterJeu(jeu);
      rafraichir();
      setSucces(`« ${jeu.nom} » a été ajouté à ton catalogue.`);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
    } finally {
      setImportId(null);
    }
  }

  if (!configure) {
    return (
      <View style={styles.page}>
        <Stack.Screen options={{ title: "BoardGameGeek" }} />
        <View style={styles.bloc}>
          <Text style={styles.blocTitre}>Jeton BoardGameGeek manquant</Text>
          <Text style={styles.blocTexte}>
            Depuis juillet 2025, BoardGameGeek exige un jeton pour utiliser son API. Enregistre une
            application non commerciale (gratuite) sur boardgamegeek.com/applications, génère un
            jeton, puis place-le dans un fichier .env.local à la racine du projet :
          </Text>
          <View style={styles.code}>
            <Text style={styles.codeTexte}>EXPO_PUBLIC_BGG_TOKEN=ton-jeton-ici</Text>
          </View>
          <Text style={styles.blocTexte}>
            Relance ensuite Expo avec npx expo start -c. En attendant, tu peux ajouter tes jeux à la
            main.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <Stack.Screen options={{ title: "BoardGameGeek" }} />

      <View style={styles.rechercheLigne}>
        <TextInput
          style={styles.input}
          value={requete}
          onChangeText={setRequete}
          placeholder="Nom d'un jeu (ex. Wingspan)"
          placeholderTextColor={colors.placeholder}
          onSubmitEditing={chercher}
          returnKeyType="search"
          autoFocus
        />
        <TouchableOpacity style={styles.bouton} onPress={chercher}>
          <Text style={styles.boutonTexte}>Chercher</Text>
        </TouchableOpacity>
      </View>

      {succes && (
        <View style={styles.succes}>
          <Text style={styles.succesTexte}>{succes}</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.succesLien}>Retour au catalogue</Text>
          </TouchableOpacity>
        </View>
      )}

      {chargement ? (
        <View style={styles.centre}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={resultats}
          keyExtractor={(r) => r.id}
          contentContainerStyle={styles.liste}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            erreur ? (
              <View style={styles.erreurBloc}>
                <Text style={styles.erreurTitre}>La recherche a échoué</Text>
                <Text style={styles.erreurTexte}>{erreur}</Text>
              </View>
            ) : aCherche ? (
              <Text style={styles.vide}>Aucun jeu trouvé pour cette recherche.</Text>
            ) : (
              <Text style={styles.vide}>
                Recherche un jeu par son nom pour l&apos;ajouter à ton catalogue.
              </Text>
            )
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.resultat}
              onPress={() => importer(item)}
              disabled={importId !== null}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.nom}>{item.nom}</Text>
                {item.annee ? <Text style={styles.annee}>{item.annee}</Text> : null}
              </View>
              {importId === item.id ? (
                <ActivityIndicator color={colors.accent} />
              ) : (
                <Text style={styles.ajouter}>Importer</Text>
              )}
            </TouchableOpacity>
          )}
        />
      )}

      <Text style={styles.source}>Powered by BoardGameGeek</Text>
    </View>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    page: { flex: 1, backgroundColor: c.page },
    rechercheLigne: { flexDirection: "row", gap: 10, padding: 16 },
    input: {
      flex: 1,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      height: 44,
      fontSize: 15,
      color: c.textPrimary,
    },
    bouton: {
      backgroundColor: c.accent,
      borderRadius: 10,
      paddingHorizontal: 16,
      justifyContent: "center",
    },
    boutonTexte: { color: c.onAccent, fontWeight: "600", fontSize: 15 },
    centre: { flex: 1, alignItems: "center", justifyContent: "center" },
    liste: { paddingHorizontal: 16, paddingBottom: 16, flexGrow: 1 },
    resultat: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
    },
    nom: { fontSize: 16, fontWeight: "600", color: c.textPrimary },
    annee: { fontSize: 13, color: c.textMuted, marginTop: 2 },
    ajouter: { fontSize: 14, fontWeight: "600", color: c.accentText },
    vide: {
      fontSize: 14,
      color: c.textMuted,
      textAlign: "center",
      paddingTop: 40,
      paddingHorizontal: 24,
    },
    erreurBloc: {
      marginTop: 24,
      backgroundColor: c.warningSoft,
      borderRadius: 12,
      padding: 14,
    },
    erreurTitre: { fontSize: 15, fontWeight: "600", color: c.warningText, marginBottom: 4 },
    erreurTexte: { fontSize: 13, color: c.warningText, lineHeight: 18 },
    succes: {
      marginHorizontal: 16,
      marginBottom: 10,
      backgroundColor: c.successSoft,
      borderRadius: 12,
      padding: 12,
    },
    succesTexte: { fontSize: 14, color: c.textPrimary, fontWeight: "600" },
    succesLien: { fontSize: 13, color: c.accentText, fontWeight: "600", marginTop: 6 },
    bloc: { margin: 16, backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.border, padding: 16 },
    blocTitre: { fontSize: 17, fontWeight: "700", color: c.textPrimary, marginBottom: 8 },
    blocTexte: { fontSize: 14, color: c.textSecondary, lineHeight: 21 },
    code: { backgroundColor: c.surfaceAlt, borderRadius: 8, padding: 12, marginVertical: 12 },
    codeTexte: { fontFamily: "monospace", fontSize: 13, color: c.textPrimary },
    source: { fontSize: 12, color: c.textMuted, textAlign: "center", padding: 12 },
  });
}
