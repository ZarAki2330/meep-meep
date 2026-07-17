// app/coop/[jeuId].tsx — partie coopérative : toute la table gagne ou perd ensemble

import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AvatarJoueur } from "@/components/avatar-joueur";
import { DialogueBilan } from "@/components/dialogue-bilan";
import { DialoguePremierJoueur } from "@/components/dialogue-premier-joueur";
import { Entete } from "@/components/entete";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { type AppColors } from "@/constants/theme-colors";
import { useJeux } from "@/context/jeux";
import { useTheme } from "@/context/theme";
import { type Resultat } from "@/db/parties";
import { prefixeJoueur, usePartie } from "@/hooks/use-partie";
import { formatChrono } from "@/lib/duree";

const COULEURS = ["#7a5195", "#1d9e75", "#378add", "#d85a30", "#c4457e"];

export default function PartieCooperative() {
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
    joueursDispo,
    photoDe,
    nomDe,
    nomsPourTirage,
    termine,
    secondes,
    tirageOuvert,
    setTirageOuvert,
    bilanOuvert,
    fermerBilan,
    noter,
    renommer,
    ajouterJoueur,
    ajouterJoueurNomme,
    supprimerJoueur,
    definirRole: attribuerRole,
    terminerPartie,
    reinitialiser,
  } = usePartie({
    jeuId: jeuId ?? "",
    jeu,
    extraInitial: {},
    vierge: (js) => js.length === 2 && js.every((j, i) => !j.role && j.nom === `${prefixe} ${i + 1}`),
  });

  // L'issue vit ici : c'est la seule chose que le coopératif ajoute au tronc commun.
  const [resultat, setResultat] = useState<Resultat | null>(null);
  const [choixPourJoueur, setChoixPourJoueur] = useState<string | null>(null);

  // Personnages du jeu de base + ceux des extensions cochées.
  const rolesDispo = (jeu?.roles ?? []).filter(
    (r) => !r.extension || extensionsChoisies.includes(r.extension),
  );

  function definirRole(joueurId: string, role?: string) {
    attribuerRole(joueurId, role);
    setChoixPourJoueur(null);
  }

  async function terminer(issue: Resultat) {
    setResultat(issue);
    await terminerPartie({
      joueurs: joueurs.map((j) => ({ nom: nomDe(j), score: 0, role: j.role })),
      // Personne ne l'emporte seul : c'est « resultat » qui porte l'issue.
      gagnant: "",
      scoreGagnant: 0,
      resultat: issue,
    });
  }

  function rejouer() {
    setResultat(null);
    reinitialiser();
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

      {extensionsChoisies.length > 0 && (
        <View style={styles.extensions}>
          <Text style={styles.extensionsTexte}>Extensions : {extensionsChoisies.join(", ")}</Text>
        </View>
      )}

      <View style={styles.info}>
        <Text style={styles.infoTexte}>
          {termine ? "Partie terminée" : "Vous jouez tous ensemble contre le jeu"}
        </Text>
      </View>

      {resultat === "victoire" && (
        <View style={styles.banniere}>
          <Text style={styles.banniereTexte}>🏆 Victoire de toute la table !</Text>
        </View>
      )}
      {resultat === "defaite" && (
        <View style={[styles.banniere, styles.banniereDefaite]}>
          <Text style={[styles.banniereTexte, styles.banniereTexteDefaite]}>
            Le jeu l&apos;emporte cette fois.
          </Text>
        </View>
      )}

      {!termine && joueursDispo.length > 0 && (
        <View style={styles.chipsContenu}>
          {joueursDispo.map((nom) => (
            <TouchableOpacity key={nom} style={styles.chip} onPress={() => ajouterJoueurNomme(nom)}>
              <Text style={styles.chipTexte}>+ {nom}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <FlatList
        data={joueurs}
        keyExtractor={(j) => j.id}
        contentContainerStyle={styles.liste}
        renderItem={({ item, index }) => (
          <View style={[styles.carte, resultat === "victoire" && styles.carteGagnante]}>
            <View style={styles.ligneHaut}>
              <AvatarJoueur
                nom={item.nom}
                photo={photoDe(item.nom)}
                taille={34}
                couleur={COULEURS[index % COULEURS.length]}
              />
              <TextInput
                style={styles.nomInput}
                value={item.nom}
                onChangeText={(t) => renommer(item.id, t)}
                editable={!termine}
              />
              {resultat === "victoire" ? (
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
          </View>
        )}
      />

      <View style={[styles.barreBas, { paddingBottom: 16 + insets.bottom }]}>
        {!termine ? (
          <>
            <TouchableOpacity style={styles.actionSecondaire} onPress={ajouterJoueur}>
              <Text style={styles.actionSecondaireTexte}>+ Joueur</Text>
            </TouchableOpacity>
            <View style={styles.issues}>
              <TouchableOpacity
                style={styles.defaite}
                accessibilityRole="button"
                accessibilityLabel="Terminer sur une défaite"
                onPress={() => terminer("defaite")}
              >
                <Text style={styles.defaiteTexte}>Défaite</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.victoire}
                accessibilityRole="button"
                accessibilityLabel="Terminer sur une victoire"
                onPress={() => terminer("victoire")}
              >
                <Text style={styles.victoireTexte}>🏆 Victoire</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <TouchableOpacity style={styles.rejouer} onPress={rejouer}>
            <Text style={styles.rejouerTexte}>Nouvelle partie</Text>
          </TouchableOpacity>
        )}
      </View>

      <DialoguePremierJoueur
        visible={tirageOuvert}
        noms={nomsPourTirage}
        onFermer={() => setTirageOuvert(false)}
      />

      <DialogueBilan visible={bilanOuvert} onPasser={fermerBilan} onEnregistrer={noter} />

      <Modal
        visible={choixPourJoueur !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setChoixPourJoueur(null)}
      >
        <TouchableOpacity
          style={styles.fond}
          activeOpacity={1}
          onPress={() => setChoixPourJoueur(null)}
        >
          <TouchableOpacity style={styles.feuille} activeOpacity={1}>
            <Text style={styles.feuilleTitre}>Choisir un personnage</Text>
            <FlatList
              style={{ maxHeight: 420 }}
              data={rolesDispo}
              keyExtractor={(r) => r.nom}
              keyboardShouldPersistTaps="handled"
              initialNumToRender={12}
              windowSize={10}
              ListHeaderComponent={
                <TouchableOpacity
                  style={styles.roleLigne}
                  onPress={() => choixPourJoueur && definirRole(choixPourJoueur, undefined)}
                >
                  <Text style={styles.roleLigneNom}>Aucun</Text>
                </TouchableOpacity>
              }
              renderItem={({ item: r }) => {
                const prisPar = jeu?.rolesPartageables
                  ? undefined
                  : joueurs.find((j) => j.role === r.nom && j.id !== choixPourJoueur);
                return (
                  <TouchableOpacity
                    style={styles.roleLigne}
                    disabled={!!prisPar}
                    onPress={() => choixPourJoueur && definirRole(choixPourJoueur, r.nom)}
                  >
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={[styles.roleLigneNom, prisPar && styles.rolePris]}>{r.nom}</Text>
                      {r.origine && <Text style={styles.roleLigneOrigine}>{r.origine}</Text>}
                    </View>
                    {prisPar && <Text style={styles.rolePrisTexte}>{prisPar.nom}</Text>}
                  </TouchableOpacity>
                );
              }}
            />
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
    actionsEntete: { flexDirection: "row", alignItems: "center", gap: 14 },
    chronoEntete: {
      fontSize: 15,
      fontWeight: "700",
      color: c.textSecondary,
      marginRight: 12,
      fontVariant: ["tabular-nums"],
    },
    info: {
      backgroundColor: c.accentSoft,
      paddingVertical: 8,
      paddingHorizontal: 16,
      alignItems: "center",
    },
    infoTexte: { color: c.accentText, fontSize: 13, fontWeight: "600" },
    banniere: { backgroundColor: c.success, padding: 16, alignItems: "center" },
    banniereTexte: { color: c.onSuccess, fontSize: 18, fontWeight: "600" },
    banniereDefaite: { backgroundColor: c.surfaceAlt },
    banniereTexteDefaite: { color: c.textSecondary },
    chips: { flexGrow: 0 },
    chipsContenu: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 16, paddingVertical: 10, alignItems: "center" },
    chip: {
      borderWidth: 1,
      borderColor: c.accent,
      backgroundColor: c.accentSoft,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    chipTexte: { color: c.accentText, fontSize: 13, fontWeight: "600", lineHeight: 18 },
    carte: {
      backgroundColor: c.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      padding: 14,
      marginBottom: 12,
    },
    carteGagnante: { borderColor: c.success, borderWidth: 2, backgroundColor: c.successSoft },
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
    roleLigneOrigine: { fontSize: 12, color: c.textMuted, marginTop: 2, lineHeight: 16 },
    rolePris: { color: c.textMuted },
    rolePrisTexte: { fontSize: 12, color: c.textMuted, fontStyle: "italic" },
    nomInput: { flex: 1, fontSize: 16, fontWeight: "600", color: c.textPrimary, paddingVertical: 4 },
    coche: { fontSize: 20 },
    supprimer: { color: c.textFaint, fontSize: 16, paddingHorizontal: 6 },
    barreBas: {
      gap: 10,
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: c.border,
      backgroundColor: c.surface,
    },
    actionSecondaire: {
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.borderStrong,
      alignItems: "center",
    },
    actionSecondaireTexte: { fontSize: 15, color: c.textSecondary, fontWeight: "600" },
    issues: { flexDirection: "row", gap: 10 },
    defaite: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.danger,
      alignItems: "center",
    },
    defaiteTexte: { fontSize: 15, color: c.danger, fontWeight: "600" },
    victoire: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: c.success,
      alignItems: "center",
    },
    victoireTexte: { fontSize: 15, color: c.onSuccess, fontWeight: "600" },
    rejouer: {
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: c.accent,
      alignItems: "center",
    },
    rejouerTexte: { fontSize: 15, color: c.onAccent, fontWeight: "600" },
  });
}
