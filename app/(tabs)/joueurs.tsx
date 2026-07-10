// app/(tabs)/joueurs.tsx — joueurs récurrents + statistiques par joueur

import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AvatarJoueur } from "@/components/avatar-joueur";
import { DialogueConfirmation } from "@/components/dialogue-confirmation";
import { POLICE_TITRE } from "@/constants/fonts";
import { type AppColors } from "@/constants/theme-colors";
import { useTheme } from "@/context/theme";
import {
  ajouterJoueur,
  listerJoueurs,
  supprimerJoueur,
  type JoueurEnregistre,
} from "@/db/joueurs";
import { listerParties, type PartieEnregistree } from "@/db/parties";
import { supprimerImage } from "@/lib/images";
import { lignesDe, participantsDe, vainqueursDe } from "@/lib/lignes-partie";

type Stat = { jouees: number; victoires: number; favori: string | null };

export default function Joueurs() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const router = useRouter();

  const [joueurs, setJoueurs] = useState<JoueurEnregistre[]>([]);
  const [parties, setParties] = useState<PartieEnregistree[]>([]);
  const [nouveau, setNouveau] = useState("");

  const charger = useCallback(() => {
    listerJoueurs().then(setJoueurs).catch(() => setJoueurs([]));
    listerParties().then(setParties).catch(() => setParties([]));
  }, []);

  useFocusEffect(
    useCallback(() => {
      charger();
    }, [charger]),
  );

  async function ajouter() {
    const nom = nouveau.trim();
    if (!nom) return;
    setNouveau("");
    await ajouterJoueur(nom).catch(() => {});
    charger();
  }

  const [aRetirer, setARetirer] = useState<JoueurEnregistre | null>(null);

  async function retirer() {
    if (!aRetirer) return;
    const { id, photo } = aRetirer;
    setARetirer(null);
    await supprimerJoueur(id).catch(() => {});
    await supprimerImage(photo);
    charger();
  }

  /**
   * Les statistiques de tous les joueurs, en un seul passage sur l'historique.
   *
   * Auparavant, chaque carte de la liste relisait l'historique entier — et
   * reparsait le JSON de chaque partie. Vingt joueurs et cinq cents parties
   * faisaient dix mille analyses JSON à chaque frappe dans le champ d'ajout.
   */
  const statsParJoueur = useMemo(() => {
    const acc = new Map<string, { jouees: number; victoires: number; jeux: Record<string, number> }>();

    for (const p of parties) {
      // `participantsDe` dédoublonne : un joueur inscrit dans deux équipes ne
      // joue qu'une partie. `vainqueursDe` crédite les membres, pas l'équipe.
      const gagnants = new Set(vainqueursDe(p));
      for (const nom of participantsDe(lignesDe(p.details))) {
        const s = acc.get(nom) ?? { jouees: 0, victoires: 0, jeux: {} };
        s.jouees++;
        s.jeux[p.jeu_nom] = (s.jeux[p.jeu_nom] ?? 0) + 1;
        if (gagnants.has(nom)) s.victoires++;
        acc.set(nom, s);
      }
    }

    const stats = new Map<string, Stat>();
    for (const [nom, s] of acc) {
      const favori = Object.entries(s.jeux).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
      stats.set(nom, { jouees: s.jouees, victoires: s.victoires, favori });
    }
    return stats;
  }, [parties]);

  const AUCUNE: Stat = { jouees: 0, victoires: 0, favori: null };

  return (
    <SafeAreaView style={styles.page} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.titre}>Joueurs</Text>
        <Text style={styles.sousTitre}>Tes joueurs et leurs statistiques</Text>
      </View>

      <View style={styles.ajoutLigne}>
        <TextInput
          style={styles.input}
          value={nouveau}
          onChangeText={setNouveau}
          placeholder="Nom d'un joueur"
          placeholderTextColor={colors.placeholder}
          onSubmitEditing={ajouter}
          returnKeyType="done"
        />
        <TouchableOpacity style={styles.ajoutBouton} accessibilityRole="button" onPress={ajouter}>
          <Text style={styles.ajoutBoutonTexte}>Ajouter</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={joueurs}
        keyExtractor={(j) => String(j.id)}
        contentContainerStyle={styles.liste}
        ListEmptyComponent={
          <View style={styles.vide}>
            <Text style={styles.videTitre}>Aucun joueur enregistré</Text>
            <Text style={styles.videTexte}>
              Ajoute un joueur ci-dessus, ou termine une partie : les noms utilisés
              apparaîtront ici automatiquement.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const s = statsParJoueur.get(item.nom) ?? AUCUNE;
          return (
            <TouchableOpacity
              style={styles.carte}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`${item.nom}, ${s.jouees} parties, ${s.victoires} victoires`}
              onPress={() => router.push({ pathname: "/joueur/[nom]", params: { nom: item.nom } })}
            >
              <AvatarJoueur nom={item.nom} photo={item.photo} taille={44} />
              <View style={{ flex: 1 }}>
                <Text style={styles.nom}>{item.nom}</Text>
                <Text style={styles.stat}>
                  {s.jouees} partie{s.jouees > 1 ? "s" : ""} · {s.victoires} victoire
                  {s.victoires > 1 ? "s" : ""}
                </Text>
                {s.favori && <Text style={styles.favori}>Jeu favori : {s.favori}</Text>}
              </View>
              <TouchableOpacity
                style={styles.retirer}
                accessibilityRole="button"
                accessibilityLabel={`Retirer ${item.nom} de la liste`}
                onPress={() => setARetirer(item)}
              >
                <Text style={styles.retirerTexte}>✕</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
      />

      <DialogueConfirmation
        visible={aRetirer !== null}
        titre="Retirer ce joueur ?"
        message={
          aRetirer
            ? `${aRetirer.nom} sera retiré de ta liste. Ses parties passées restent dans l'historique.`
            : undefined
        }
        texteConfirmer="Retirer"
        onConfirmer={retirer}
        onAnnuler={() => setARetirer(null)}
      />
    </SafeAreaView>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    page: { flex: 1, backgroundColor: c.page },
    header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
    titre: { fontSize: 30, fontFamily: POLICE_TITRE, color: c.accentText },
    sousTitre: { fontSize: 15, color: c.textMuted, marginTop: 2 },
    ajoutLigne: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginBottom: 12 },
    input: {
      flex: 1,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      color: c.textPrimary,
    },
    ajoutBouton: {
      backgroundColor: c.accent,
      borderRadius: 10,
      paddingHorizontal: 16,
      justifyContent: "center",
    },
    ajoutBoutonTexte: { color: c.onAccent, fontWeight: "600", fontSize: 15 },
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
    nom: { fontSize: 16, fontWeight: "600", color: c.textPrimary },
    stat: { fontSize: 13, color: c.textSecondary, marginTop: 2 },
    favori: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    retirer: { padding: 6 },
    retirerTexte: { color: c.textFaint, fontSize: 15 },
    vide: { alignItems: "center", justifyContent: "center", paddingTop: 80, paddingHorizontal: 24 },
    videTitre: { fontSize: 17, fontWeight: "600", color: c.textPrimary, marginBottom: 6 },
    videTexte: { fontSize: 14, color: c.textMuted, textAlign: "center", lineHeight: 20 },
  });
}
