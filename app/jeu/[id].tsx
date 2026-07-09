// app/jeu/[id].tsx — fiche d'un jeu

import { useFocusEffect } from "@react-navigation/native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { DialogueConfirmation } from "@/components/dialogue-confirmation";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { VisuelJeu } from "@/components/visuel-jeu";
import { type AppColors } from "@/constants/theme-colors";
import { useJeux } from "@/context/jeux";
import { useTheme } from "@/context/theme";
import { effacerEtat, partieEnCours } from "@/db/partie-en-cours";

export default function FicheJeu() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { jeux, estImporte, supprimerJeu, estFavori, basculerFavori } = useJeux();
  const styles = makeStyles(colors);
  const jeu = jeux.find((j) => j.id === id);

  const [extensionsActives, setExtensionsActives] = useState<string[]>([]);
  const [reglesOuvertes, setReglesOuvertes] = useState(false);
  const [rolesOuverts, setRolesOuverts] = useState(false);

  function basculerExtension(nom: string) {
    setExtensionsActives((prev) =>
      prev.includes(nom) ? prev.filter((e) => e !== nom) : [...prev, nom],
    );
  }

  const rolesVisibles = (jeu?.roles ?? []).filter(
    (r) => !r.extension || extensionsActives.includes(r.extension),
  );

  const [confirmationOuverte, setConfirmationOuverte] = useState(false);
  const [enCours, setEnCours] = useState(false);

  // Y a-t-il une partie non terminée pour ce jeu ?
  useFocusEffect(
    useCallback(() => {
      if (!jeu) return;
      partieEnCours(jeu.id)
        .then(setEnCours)
        .catch(() => setEnCours(false));
    }, [jeu]),
  );

  function ouvrirPartie() {
    if (!jeu) return;
    router.push({
      pathname:
        jeu.scoreMode === "grille"
          ? "/grille/[jeuId]"
          : jeu.scoreMode === "objectif"
            ? "/objectif/[jeuId]"
            : "/partie/[jeuId]",
      params: { jeuId: jeu.id, extensions: extensionsActives.join("|") },
    });
  }

  async function nouvellePartie() {
    if (!jeu) return;
    await effacerEtat(jeu.id).catch(() => {});
    setEnCours(false);
    ouvrirPartie();
  }

  async function supprimer() {
    if (!jeu) return;
    setConfirmationOuverte(false);
    await supprimerJeu(jeu.id);
    router.back();
  }

  if (!jeu) {
    return (
      <View style={styles.centre}>
        <Text style={{ color: colors.textPrimary }}>Jeu introuvable.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.contenu}>
      <Stack.Screen options={{ title: jeu.nom }} />

      <VisuelJeu jeu={jeu} style={styles.banniere} />

      <View style={styles.titreLigne}>
        <Text style={styles.titre}>{jeu.nom}</Text>
        <TouchableOpacity hitSlop={10} onPress={() => basculerFavori(jeu.id)}>
          <IconSymbol
            name={estFavori(jeu.id) ? "star.fill" : "star"}
            size={28}
            color={estFavori(jeu.id) ? colors.accent : colors.textFaint}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.metaLigne}>
        <Meta valeur={`${jeu.joueursMin}–${jeu.joueursMax}`} label="joueurs" styles={styles} />
        <Meta valeur={`${jeu.dureeMin} min`} label="durée" styles={styles} />
        <Meta valeur={`${jeu.ageMin}+`} label="âge" styles={styles} />
      </View>

      <Text style={styles.description}>{jeu.description}</Text>

      {jeu.extensions && jeu.extensions.length > 0 && (
        <View style={styles.extensionsBloc}>
          <Text style={styles.sectionTitre}>Extensions</Text>
          <Text style={styles.extensionsSous}>Coche les extensions que tu ajoutes à ta partie.</Text>
          {jeu.extensions.map((ext) => {
            const active = extensionsActives.includes(ext);
            return (
              <TouchableOpacity
                key={ext}
                style={styles.extensionLigne}
                activeOpacity={0.7}
                onPress={() => basculerExtension(ext)}
              >
                <View style={[styles.case, active && styles.caseActive]}>
                  {active && <Text style={styles.caseCoche}>✓</Text>}
                </View>
                <Text style={styles.extensionNom}>{ext}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <TouchableOpacity style={styles.boutonJouer} activeOpacity={0.8} onPress={ouvrirPartie}>
        <Text style={styles.boutonJouerTexte}>
          {enCours ? "▶  Reprendre la partie" : "▶  Lancer une partie"}
        </Text>
      </TouchableOpacity>

      {enCours && (
        <TouchableOpacity style={styles.boutonSecondaire} activeOpacity={0.8} onPress={nouvellePartie}>
          <Text style={styles.boutonSecondaireTexte}>Repartir de zéro</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.sectionRepliable}
        activeOpacity={0.7}
        onPress={() => setReglesOuvertes((o) => !o)}
      >
        <Text style={styles.sectionTitreRepliable}>Règles</Text>
        <View style={styles.chevronBadge}>
          <Text style={styles.chevronTexte}>{reglesOuvertes ? "▾" : "▸"}</Text>
        </View>
      </TouchableOpacity>
      {reglesOuvertes && (
        <View style={styles.reglesBloc}>
          {jeu.regles.map((point, i) => (
            <View key={i} style={styles.reglePoint}>
              <View style={styles.reglePuce} />
              <Text style={styles.regleTexte}>{point}</Text>
            </View>
          ))}
        </View>
      )}

      {rolesVisibles.length > 0 && (
        <>
          <TouchableOpacity
            style={styles.sectionRepliable}
            activeOpacity={0.7}
            onPress={() => setRolesOuverts((o) => !o)}
          >
            <Text style={styles.sectionTitreRepliable}>Personnages ({rolesVisibles.length})</Text>
            <View style={styles.chevronBadge}>
              <Text style={styles.chevronTexte}>{rolesOuverts ? "▾" : "▸"}</Text>
            </View>
          </TouchableOpacity>
          {rolesOuverts &&
            rolesVisibles.map((role) => (
              <View key={role.nom} style={styles.roleCarte}>
                <View style={styles.roleEntete}>
                  <Text style={styles.roleNom}>{role.nom}</Text>
                  {role.extension && <Text style={styles.roleBadge}>{role.extension}</Text>}
                </View>
                {role.origine && <Text style={styles.roleOrigine}>{role.origine}</Text>}
                {role.objectif && (
                  <Text style={styles.roleObjectif}>
                    <Text style={styles.roleObjectifLabel}>Objectif : </Text>
                    {role.objectif}
                  </Text>
                )}
              </View>
            ))}
        </>
      )}

      {estImporte(jeu.id) && (
        <View style={styles.actionsJeu}>
          <TouchableOpacity
            style={styles.modifier}
            onPress={() => router.push({ pathname: "/import", params: { id: jeu.id } })}
          >
            <Text style={styles.modifierTexte}>Modifier ce jeu</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.supprimer} onPress={() => setConfirmationOuverte(true)}>
            <Text style={styles.supprimerTexte}>Supprimer ce jeu</Text>
          </TouchableOpacity>
        </View>
      )}

      <DialogueConfirmation
        visible={confirmationOuverte}
        titre="Supprimer ce jeu ?"
        message={`« ${jeu.nom} » sera retiré de ton catalogue.`}
        onConfirmer={supprimer}
        onAnnuler={() => setConfirmationOuverte(false)}
      />
    </ScrollView>
  );
}

function Meta({
  valeur,
  label,
  styles,
}: {
  valeur: string;
  label: string;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.metaBloc}>
      <Text style={styles.metaValeur}>{valeur}</Text>
      <Text style={styles.metaLabel}>{label}</Text>
    </View>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    page: { flex: 1, backgroundColor: c.page },
    contenu: { padding: 16, paddingBottom: 40 },
    centre: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: c.page },
    banniere: { width: "100%", height: 180, borderRadius: 14, marginBottom: 16 },
    titreLigne: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
    titre: { flex: 1, fontSize: 26, fontWeight: "600", color: c.textPrimary },
    metaLigne: { flexDirection: "row", gap: 12, marginTop: 16 },
    metaBloc: {
      flex: 1,
      backgroundColor: c.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      paddingVertical: 12,
      alignItems: "center",
    },
    metaValeur: { fontSize: 16, fontWeight: "600", color: c.accentText },
    metaLabel: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    description: { fontSize: 15, color: c.textSecondary, lineHeight: 22, marginTop: 16 },
    boutonJouer: {
      backgroundColor: c.accent,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
      marginTop: 20,
    },
    boutonJouerTexte: { color: c.onAccent, fontSize: 16, fontWeight: "600" },
    boutonSecondaire: {
      borderWidth: 1,
      borderColor: c.borderStrong,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: "center",
      marginTop: 10,
    },
    boutonSecondaireTexte: { color: c.textSecondary, fontSize: 14, fontWeight: "600" },
    sectionTitre: { fontSize: 18, fontWeight: "600", color: c.textPrimary, marginTop: 24, marginBottom: 8 },
    sectionRepliable: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 24,
      marginBottom: 8,
    },
    sectionTitreRepliable: { fontSize: 18, fontWeight: "600", color: c.textPrimary },
    chevronBadge: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: c.accentSoft,
      alignItems: "center",
      justifyContent: "center",
    },
    chevronTexte: { fontSize: 16, color: c.accentText, fontWeight: "700" },
    reglesBloc: { marginTop: 2 },
    reglePoint: { flexDirection: "row", alignItems: "flex-start", marginBottom: 14 },
    reglePuce: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: c.accent,
      marginTop: 7,
      marginRight: 12,
    },
    regleTexte: { flex: 1, fontSize: 15, color: c.textSecondary, lineHeight: 22 },
    roleCarte: {
      backgroundColor: c.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      padding: 14,
      marginBottom: 10,
    },
    roleEntete: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    roleNom: { fontSize: 16, fontWeight: "600", color: c.textPrimary, flex: 1 },
    roleBadge: {
      fontSize: 11,
      color: c.accentText,
      backgroundColor: c.accentSoft,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 20,
      overflow: "hidden",
      marginLeft: 8,
    },
    roleOrigine: { fontSize: 13, color: c.textMuted, marginTop: 2 },
    roleObjectif: { fontSize: 14, color: c.textSecondary, lineHeight: 20, marginTop: 8 },
    roleObjectifLabel: { fontWeight: "600", color: c.accentText },
    extensionsBloc: { marginTop: 4 },
    extensionsSous: { fontSize: 13, color: c.textMuted, marginBottom: 10 },
    extensionLigne: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    case: {
      width: 24,
      height: 24,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: c.borderStrong,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    caseActive: { backgroundColor: c.accent, borderColor: c.accent },
    caseCoche: { color: c.onAccent, fontSize: 15, fontWeight: "700" },
    extensionNom: { fontSize: 15, color: c.textSecondary, flex: 1 },
    actionsJeu: { marginTop: 28, gap: 10 },
    modifier: {
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.accent,
      alignItems: "center",
    },
    modifierTexte: { color: c.accentText, fontSize: 15, fontWeight: "600" },
    supprimer: {
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center",
    },
    supprimerTexte: { color: c.danger, fontSize: 15, fontWeight: "600" },
  });
}
