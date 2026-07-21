// app/objectif/[jeuId].tsx — partie sans points : on désigne simplement le vainqueur

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
import { AvatarRole } from "@/components/avatar-role";
import { DialogueBilan } from "@/components/dialogue-bilan";
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

export default function PartieObjectif() {
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
    joueursSauvegardes,
    joueursDispo,
    photoDe,
    nomDe,
    nomsPourTirage,
    modeEquipes,
    termine,
    secondes,
    extra,
    setExtra,
    membresPour,
    setMembresPour,
    tirageOuvert,
    setTirageOuvert,
    bilanOuvert,
    fermerBilan,
    noter,
    renommer,
    ajouterJoueur,
    ajouterJoueurNomme,
    supprimerJoueur: retirerJoueur,
    definirMembres,
    definirRole: attribuerRole,
    terminerPartie,
    reinitialiser,
  } = usePartie({
    jeuId: jeuId ?? "",
    jeu,
    extensions: extensionsChoisies,
    extraInitial: { gagnantId: null as string | null },
    vierge: (js, e) =>
      e.gagnantId === null &&
      js.length === 2 &&
      js.every((j, i) => !j.role && !j.membres?.length && j.nom === `${prefixe} ${i + 1}`),
  });

  const gagnantId = extra.gagnantId;
  const setGagnantId = (id: string | null) => setExtra((e) => ({ ...e, gagnantId: id }));

  const [choixPourJoueur, setChoixPourJoueur] = useState<string | null>(null);

  // Personnages du jeu de base + ceux des extensions cochées.
  const rolesDispo = (jeu?.roles ?? []).filter(
    (r) => !r.extension || extensionsChoisies.includes(r.extension),
  );

  function definirRole(joueurId: string, role?: string) {
    attribuerRole(joueurId, role);
    setChoixPourJoueur(null);
  }

  function supprimerJoueur(id: string) {
    retirerJoueur(id);
    if (gagnantId === id) setGagnantId(null);
  }

  const gagnant = joueurs.find((j) => j.id === gagnantId) ?? null;

  async function terminer() {
    if (!gagnant) return;
    await terminerPartie({
      joueurs: joueurs.map((j) => ({
        nom: nomDe(j),
        score: 0,
        role: j.role,
        membres: j.membres?.length ? j.membres : undefined,
      })),
      gagnant: nomDe(gagnant),
      scoreGagnant: 0,
    });
  }

  function rejouer() {
    setGagnantId(null);
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
          {termine ? "Partie terminée" : "Touche le joueur qui a rempli son objectif"}
        </Text>
      </View>

      {termine && gagnant && (
        <View style={styles.banniere}>
          <Text style={styles.banniereTexte}>🏆 {gagnant.nom} remporte la partie !</Text>
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
        renderItem={({ item, index }) => {
          const choisi = item.id === gagnantId;
          return (
            <TouchableOpacity
              style={[styles.carte, choisi && styles.carteChoisie]}
              activeOpacity={0.8}
              disabled={termine}
              accessibilityRole="radio"
              accessibilityState={{ checked: choisi, disabled: termine }}
              accessibilityLabel={`${item.nom}, vainqueur`}
              onPress={() => setGagnantId(choisi ? null : item.id)}
            >
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

              {modeEquipes ? (
                <TouchableOpacity
                  style={styles.roleBouton}
                  activeOpacity={0.7}
                  disabled={termine}
                  onPress={() => setMembresPour(item.id)}
                >
                  <Text
                    style={item.membres?.length ? styles.roleTexte : styles.rolePlaceholder}
                    numberOfLines={1}
                  >
                    {item.membres?.length ? item.membres.join(", ") : "Ajouter des membres"}
                  </Text>
                  {!termine && <Text style={styles.roleChevron}>▸</Text>}
                </TouchableOpacity>
              ) : rolesDispo.length > 0 ? (
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
              ) : null}
            </TouchableOpacity>
          );
        }}
      />

      <View style={[styles.barreBas, { paddingBottom: 16 + insets.bottom }]}>
        {!termine ? (
          <>
            <TouchableOpacity style={styles.actionSecondaire} onPress={ajouterJoueur}>
              <Text style={styles.actionSecondaireTexte}>+ {prefixe}</Text>
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
                    <AvatarRole role={r} taille={38} style={prisPar ? styles.roleAvatarPris : undefined} />
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
    info: { backgroundColor: c.accentSoft, paddingVertical: 8, paddingHorizontal: 16, alignItems: "center" },
    infoTexte: { color: c.accentText, fontSize: 13, fontWeight: "600" },
    banniere: { backgroundColor: c.success, padding: 16, alignItems: "center" },
    banniereTexte: { color: c.onSuccess, fontSize: 18, fontWeight: "600" },
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
      gap: 12,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    roleAvatarPris: { opacity: 0.4 },
    roleLigneNom: { fontSize: 15, fontWeight: "600", color: c.textPrimary },
    roleLigneOrigine: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    roleLigneObjectif: { fontSize: 12, color: c.textSecondary, marginTop: 4, lineHeight: 16 },
    rolePris: { color: c.textMuted },
    rolePrisTexte: { fontSize: 12, color: c.textMuted, fontStyle: "italic" },
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
