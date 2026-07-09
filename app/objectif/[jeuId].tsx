// app/objectif/[jeuId].tsx — partie sans points : on désigne simplement le vainqueur

import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { type AppColors } from "@/constants/theme-colors";
import { useJeux } from "@/context/jeux";
import { useTheme } from "@/context/theme";
import { listerJoueurs } from "@/db/joueurs";
import { chargerEtat, effacerEtat, sauvegarderEtat } from "@/db/partie-en-cours";
import { enregistrerPartie } from "@/db/parties";

type Joueur = { id: string; nom: string; role?: string };
type EtatSauve = { joueurs: Joueur[]; gagnantId: string | null };

function objectifVierge(joueurs: Joueur[], gagnantId: string | null) {
  return (
    gagnantId === null &&
    joueurs.length === 2 &&
    joueurs.every((j, i) => !j.role && j.nom === `Joueur ${i + 1}`)
  );
}

const COULEURS = ["#7a5195", "#1d9e75", "#378add", "#d85a30", "#c4457e"];

export default function PartieObjectif() {
  const { jeuId, extensions } = useLocalSearchParams<{ jeuId: string; extensions?: string }>();
  const { colors } = useTheme();
  const { jeux } = useJeux();
  const styles = makeStyles(colors);
  const jeu = jeux.find((j) => j.id === jeuId);

  const extensionsChoisies = extensions ? extensions.split("|").filter(Boolean) : [];

  const [joueurs, setJoueurs] = useState<Joueur[]>([
    { id: "j1", nom: "Joueur 1" },
    { id: "j2", nom: "Joueur 2" },
  ]);
  const [gagnantId, setGagnantId] = useState<string | null>(null);
  const [termine, setTermine] = useState(false);
  const [joueursSauvegardes, setJoueursSauvegardes] = useState<string[]>([]);
  const [choixPourJoueur, setChoixPourJoueur] = useState<string | null>(null);

  // Personnages du jeu de base + ceux des extensions cochées.
  const rolesDispo = (jeu?.roles ?? []).filter(
    (r) => !r.extension || extensionsChoisies.includes(r.extension),
  );

  function definirRole(joueurId: string, role?: string) {
    setJoueurs((prev) => prev.map((j) => (j.id === joueurId ? { ...j, role } : j)));
    setChoixPourJoueur(null);
  }

  const [charge, setCharge] = useState(false);
  const [reprise, setReprise] = useState(false);

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
          setGagnantId(e.gagnantId ?? null);
          setReprise(true);
        }
      })
      .finally(() => setCharge(true));
  }, [jeuId]);

  useEffect(() => {
    if (!charge || termine) return;
    if (objectifVierge(joueurs, gagnantId)) effacerEtat(jeuId ?? "").catch(() => {});
    else sauvegarderEtat(jeuId ?? "", { joueurs, gagnantId }).catch(() => {});
  }, [charge, termine, joueurs, gagnantId, jeuId]);

  function renommer(id: string, nom: string) {
    setJoueurs((prev) => prev.map((j) => (j.id === id ? { ...j, nom } : j)));
  }
  function ajouterJoueur() {
    setJoueurs((prev) => [...prev, { id: `j${Date.now()}`, nom: `Joueur ${prev.length + 1}` }]);
  }
  function ajouterJoueurNomme(nom: string) {
    setJoueurs((prev) => [...prev, { id: `j${Date.now()}`, nom }]);
  }
  function supprimerJoueur(id: string) {
    setJoueurs((prev) => prev.filter((j) => j.id !== id));
    if (gagnantId === id) setGagnantId(null);
  }

  const gagnant = joueurs.find((j) => j.id === gagnantId) ?? null;

  function terminer() {
    if (!gagnant) return;
    setTermine(true);
    setReprise(false);
    effacerEtat(jeuId ?? "").catch(() => {});
    enregistrerPartie({
      jeuId: jeuId ?? "",
      jeuNom: jeu ? jeu.nom : "Partie",
      joueurs: joueurs.map((j) => ({ nom: j.nom, score: 0, role: j.role })),
      gagnant: gagnant.nom,
      scoreGagnant: 0,
    }).catch(() => {});
  }

  function rejouer() {
    setGagnantId(null);
    setTermine(false);
  }

  const joueursDispo = joueursSauvegardes.filter((n) => !joueurs.some((j) => j.nom === n));

  return (
    <View style={styles.page}>
      <Stack.Screen options={{ title: jeu ? jeu.nom : "Partie" }} />

      {extensionsChoisies.length > 0 && (
        <View style={styles.extensions}>
          <Text style={styles.extensionsTexte}>Extensions : {extensionsChoisies.join(", ")}</Text>
        </View>
      )}

      <View style={styles.info}>
        <Text style={styles.infoTexte}>
          {termine ? "Partie terminée" : "Touche le joueur qui a rempli son objectif"}
        </Text>
      </View>

      {termine && gagnant && (
        <View style={styles.banniere}>
          <Text style={styles.banniereTexte}>🏆 {gagnant.nom} remporte la partie !</Text>
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
          const choisi = item.id === gagnantId;
          return (
            <TouchableOpacity
              style={[styles.carte, choisi && styles.carteChoisie]}
              activeOpacity={0.8}
              disabled={termine}
              onPress={() => setGagnantId(choisi ? null : item.id)}
            >
              <View style={styles.ligneHaut}>
                <View
                  style={[styles.pastille, { backgroundColor: COULEURS[index % COULEURS.length] }]}
                >
                  <Text style={styles.pastilleTexte}>{item.nom.charAt(0).toUpperCase()}</Text>
                </View>
                <TextInput
                  style={styles.nomInput}
                  value={item.nom}
                  onChangeText={(t) => renommer(item.id, t)}
                  editable={!termine}
                />
                {choisi ? (
                  <Text style={styles.coche}>🏆</Text>
                ) : (
                  !termine &&
                  joueurs.length > 1 && (
                    <TouchableOpacity onPress={() => supprimerJoueur(item.id)}>
                      <Text style={styles.supprimer}>✕</Text>
                    </TouchableOpacity>
                  )
                )}
              </View>

              {rolesDispo.length > 0 && (
                <TouchableOpacity
                  style={styles.roleBouton}
                  activeOpacity={0.7}
                  disabled={termine}
                  onPress={() => setChoixPourJoueur(item.id)}
                >
                  <Text style={item.role ? styles.roleTexte : styles.rolePlaceholder}>
                    {item.role ?? "Choisir un personnage"}
                  </Text>
                  {!termine && <Text style={styles.roleChevron}>▸</Text>}
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          );
        }}
      />

      <View style={styles.barreBas}>
        {!termine ? (
          <>
            <TouchableOpacity style={styles.actionSecondaire} onPress={ajouterJoueur}>
              <Text style={styles.actionSecondaireTexte}>+ Joueur</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionPrincipale, !gagnant && styles.actionDesactivee]}
              onPress={terminer}
              disabled={!gagnant}
            >
              <Text style={styles.actionPrincipaleTexte}>Terminer la partie</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={styles.actionPrincipale} onPress={rejouer}>
            <Text style={styles.actionPrincipaleTexte}>Nouvelle partie</Text>
          </TouchableOpacity>
        )}
      </View>

      <Modal
        visible={choixPourJoueur !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setChoixPourJoueur(null)}
      >
        <TouchableOpacity
          style={styles.fond}
          activeOpacity={1}
          onPress={() => setChoixPourJoueur(null)}
        >
          <TouchableOpacity style={styles.feuille} activeOpacity={1}>
            <Text style={styles.feuilleTitre}>Choisir un personnage</Text>
            <ScrollView style={{ maxHeight: 420 }}>
              <TouchableOpacity
                style={styles.roleLigne}
                onPress={() => choixPourJoueur && definirRole(choixPourJoueur, undefined)}
              >
                <Text style={styles.roleLigneNom}>Aucun</Text>
              </TouchableOpacity>

              {rolesDispo.map((r) => {
                const prisPar = joueurs.find((j) => j.role === r.nom && j.id !== choixPourJoueur);
                return (
                  <TouchableOpacity
                    key={r.nom}
                    style={styles.roleLigne}
                    disabled={!!prisPar}
                    onPress={() => choixPourJoueur && definirRole(choixPourJoueur, r.nom)}
                  >
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={[styles.roleLigneNom, prisPar && styles.rolePris]}>{r.nom}</Text>
                      {r.origine && <Text style={styles.roleLigneOrigine}>{r.origine}</Text>}
                      {r.objectif && (
                        <Text style={styles.roleLigneObjectif} numberOfLines={2}>
                          {r.objectif}
                        </Text>
                      )}
                    </View>
                    {prisPar && <Text style={styles.rolePrisTexte}>{prisPar.nom}</Text>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    page: { flex: 1, backgroundColor: c.page },
    liste: { padding: 16, paddingBottom: 24 },
    extensions: { backgroundColor: c.surfaceAlt, paddingVertical: 8, paddingHorizontal: 16 },
    extensionsTexte: { color: c.textSecondary, fontSize: 13, fontWeight: "600" },
    info: { backgroundColor: c.accentSoft, paddingVertical: 8, paddingHorizontal: 16, alignItems: "center" },
    infoTexte: { color: c.accentText, fontSize: 13, fontWeight: "600" },
    banniere: { backgroundColor: c.success, padding: 16, alignItems: "center" },
    banniereTexte: { color: c.onSuccess, fontSize: 18, fontWeight: "600" },
    chips: { maxHeight: 48, marginTop: 8, flexGrow: 0 },
    chipsContenu: { gap: 8, paddingHorizontal: 16, alignItems: "center" },
    chip: {
      borderWidth: 1,
      borderColor: c.accent,
      backgroundColor: c.accentSoft,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    chipTexte: { color: c.accentText, fontSize: 13, fontWeight: "600" },
    carte: {
      backgroundColor: c.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      padding: 14,
      marginBottom: 12,
    },
    carteChoisie: { borderColor: c.success, borderWidth: 2, backgroundColor: c.successSoft },
    ligneHaut: { flexDirection: "row", alignItems: "center", gap: 12 },
    roleBouton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 12,
      paddingVertical: 9,
      paddingHorizontal: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surfaceAlt,
    },
    roleTexte: { fontSize: 14, fontWeight: "600", color: c.accentText },
    rolePlaceholder: { fontSize: 14, color: c.textMuted },
    roleChevron: { fontSize: 13, color: c.textMuted },
    fond: {
      flex: 1,
      backgroundColor: c.ombre,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 24,
    },
    feuille: {
      width: "100%",
      maxWidth: 420,
      backgroundColor: c.surface,
      borderRadius: 18,
      paddingHorizontal: 18,
      paddingTop: 18,
      paddingBottom: 10,
    },
    feuilleTitre: { fontSize: 17, fontWeight: "700", color: c.textPrimary, marginBottom: 10 },
    roleLigne: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    roleLigneNom: { fontSize: 15, fontWeight: "600", color: c.textPrimary },
    roleLigneOrigine: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    roleLigneObjectif: { fontSize: 12, color: c.textSecondary, marginTop: 4, lineHeight: 16 },
    rolePris: { color: c.textFaint },
    rolePrisTexte: { fontSize: 12, color: c.textFaint, fontStyle: "italic" },
    pastille: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
    pastilleTexte: { color: "#fff", fontWeight: "600" },
    nomInput: { flex: 1, fontSize: 16, fontWeight: "600", color: c.textPrimary, paddingVertical: 4 },
    coche: { fontSize: 20 },
    supprimer: { color: c.textFaint, fontSize: 16, paddingHorizontal: 6 },
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
    actionDesactivee: { opacity: 0.45 },
    actionPrincipaleTexte: { fontSize: 15, color: c.onAccent, fontWeight: "600" },
  });
}
