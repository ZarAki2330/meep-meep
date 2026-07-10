// app/reglages.tsx — thème, partage, sauvegarde des données, à propos

import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import { useRouter } from "expo-router";
import * as FileSystemLegacy from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useCallback, useEffect, useState, type ComponentProps } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { DialogueConfirmation } from "@/components/dialogue-confirmation";
import { Entete } from "@/components/entete";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ACCENTS, CLES_ACCENT, type AppColors } from "@/constants/theme-colors";
import { useJeux } from "@/context/jeux";
import { useTheme } from "@/context/theme";
import { compterParties, viderHistorique } from "@/db/parties";
import {
  exporterDonnees,
  restaurerDonnees,
  resumeSauvegarde,
  verifierSauvegarde,
  type Sauvegarde,
} from "@/db/sauvegarde";

const MESSAGE_PARTAGE =
  "Découvre Meep Meep : une appli pour gérer sa ludothèque de jeux de société, " +
  "consulter les règles et tenir les scores des parties.";

export default function Reglages() {
  const { colors, mode, toggle, accent, definirAccent } = useTheme();
  const { rafraichir } = useJeux();
  const styles = makeStyles(colors);
  const router = useRouter();

  const [occupe, setOccupe] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [aRestaurer, setARestaurer] = useState<Sauvegarde | null>(null);
  const [nbParties, setNbParties] = useState(0);
  const [videOuvert, setVideOuvert] = useState(false);

  const compter = useCallback(() => {
    compterParties()
      .then(setNbParties)
      .catch(() => setNbParties(0));
  }, []);

  useEffect(compter, [compter]);

  async function viderTout() {
    setVideOuvert(false);
    setErreur(null);
    try {
      await viderHistorique();
      compter();
      setMessage("Historique vidé. Tes jeux et tes joueurs sont intacts.");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
    }
  }

  async function exporter() {
    setOccupe(true);
    setErreur(null);
    setMessage(null);
    try {
      const donnees = await exporterDonnees();
      const jour = new Date().toISOString().slice(0, 10);
      const fichier = new File(Paths.cache, `meep-meep-sauvegarde-${jour}.json`);
      if (fichier.exists) fichier.delete();
      fichier.create();
      fichier.write(JSON.stringify(donnees, null, 2));

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fichier.uri, {
          mimeType: "application/json",
          dialogTitle: "Sauvegarde Meep Meep",
        });
      } else {
        setMessage(`Sauvegarde écrite dans ${fichier.uri}`);
      }
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
    } finally {
      setOccupe(false);
    }
  }

  async function choisirFichier() {
    setErreur(null);
    setMessage(null);
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ["application/json", "*/*"],
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.[0]) return;
      const texte = await FileSystemLegacy.readAsStringAsync(res.assets[0].uri);
      setARestaurer(verifierSauvegarde(JSON.parse(texte)));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
    }
  }

  async function restaurer() {
    if (!aRestaurer) return;
    const s = aRestaurer;
    setARestaurer(null);
    setOccupe(true);
    try {
      await restaurerDonnees(s);
      rafraichir();
      compter();
      setMessage("Sauvegarde restaurée. Tes données ont été remplacées.");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
    } finally {
      setOccupe(false);
    }
  }

  async function partagerApp() {
    try {
      await Share.share({ title: "Meep Meep", message: MESSAGE_PARTAGE });
    } catch {
      // annulé
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.page }}>
      <Entete titre="Réglages" />
      <ScrollView style={styles.page} contentContainerStyle={styles.contenu}>
      {message && (
        <View style={styles.succes}>
          <Text style={styles.succesTexte}>{message}</Text>
        </View>
      )}
      {erreur && (
        <View style={styles.erreur}>
          <Text style={styles.erreurTexte}>{erreur}</Text>
        </View>
      )}

      <Text style={styles.section}>Apparence</Text>
      <Ligne
        titre="Thème"
        detail={mode === "dark" ? "Sombre" : "Clair"}
        icone={mode === "dark" ? "sun.max.fill" : "moon.fill"}
        couleur={colors.accentText}
        onPress={toggle}
        styles={styles}
      />

      <View style={styles.couleursBloc}>
        <Text style={styles.couleursTitre}>Couleur de l&apos;application</Text>
        <Text style={styles.couleursDetail}>
          S&apos;applique à toute l&apos;app et au logo, dans les deux thèmes.
        </Text>
        <View style={styles.pastilles}>
          {CLES_ACCENT.map((cle) => {
            const actif = accent === cle;
            const teinte =
              mode === "dark" ? ACCENTS[cle].sombre.accent : ACCENTS[cle].clair.accent;
            return (
              <TouchableOpacity
                key={cle}
                style={[styles.pastilleCouleur, actif && { borderColor: colors.accentText }]}
                activeOpacity={0.7}
                onPress={() => definirAccent(cle)}
              >
                <View style={[styles.rond, { backgroundColor: teinte }]}>
                  {actif && (
                    <IconSymbol name="checkmark" size={16} color={ACCENTS[cle][mode === "dark" ? "sombre" : "clair"].onAccent} />
                  )}
                </View>
                <Text style={[styles.pastilleNom, actif && styles.pastilleNomActif]}>
                  {ACCENTS[cle].nom}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <Text style={styles.section}>Données</Text>
      <Ligne
        titre="Exporter mes données"
        detail="Parties, joueurs, jeux ajoutés et favoris, dans un fichier."
        icone="arrow.up.doc"
        couleur={colors.accentText}
        onPress={exporter}
        styles={styles}
      />
      <Ligne
        titre="Restaurer une sauvegarde"
        detail="Remplace toutes les données actuelles par celles du fichier."
        icone="square.and.arrow.down"
        couleur={colors.accentText}
        onPress={choisirFichier}
        styles={styles}
      />
      {occupe && <ActivityIndicator style={{ marginTop: 12 }} color={colors.accent} />}

      <Text style={styles.section}>Application</Text>
      <Ligne
        titre="Aide"
        detail="Les modes de score, la feuille de score, les extensions, la sauvegarde…"
        icone="questionmark"
        couleur={colors.accentText}
        onPress={() => router.push("/aide")}
        styles={styles}
      />
      <Ligne
        titre="Partager Meep Meep"
        detail="Envoyer l'application à un ami."
        icone="square.and.arrow.up"
        couleur={colors.accentText}
        onPress={partagerApp}
        styles={styles}
      />

      <Text style={[styles.section, styles.sectionDanger]}>Zone dangereuse</Text>
      <Ligne
        titre="Vider l'historique"
        detail={
          nbParties === 0
            ? "Aucune partie enregistrée."
            : `Efface les ${nbParties} parties enregistrées. Les jeux, les joueurs et les favoris restent.`
        }
        icone="trash"
        couleur={nbParties === 0 ? colors.textFaint : colors.onDanger}
        onPress={() => nbParties > 0 && setVideOuvert(true)}
        styles={styles}
        danger={nbParties > 0}
      />

      <View style={styles.apropos}>
        <Image
          source={require("@/assets/images/logo-header.png")}
          style={styles.logo}
          resizeMode="contain"
          tintColor={colors.accentText}
        />
        <Text style={styles.version}>Version 1.0.0</Text>
        <Text style={styles.signature}>créé par Zaraki</Text>
      </View>

      <DialogueConfirmation
        visible={aRestaurer !== null}
        titre="Restaurer cette sauvegarde ?"
        message={
          aRestaurer
            ? `Elle contient ${resumeSauvegarde(aRestaurer)}. Toutes tes données actuelles seront définitivement remplacées.`
            : undefined
        }
        texteConfirmer="Restaurer"
        onConfirmer={restaurer}
        onAnnuler={() => setARestaurer(null)}
      />

      <DialogueConfirmation
        visible={videOuvert}
        titre="Vider tout l'historique ?"
        message={`Les ${nbParties} parties enregistrées seront effacées, ainsi que les statistiques qui en découlent. C'est sans retour : pense à exporter tes données d'abord.`}
        texteConfirmer="Tout effacer"
        onConfirmer={viderTout}
        onAnnuler={() => setVideOuvert(false)}
      />
      </ScrollView>
    </View>
  );
}

type NomIcone = ComponentProps<typeof IconSymbol>["name"];

function Ligne({
  titre,
  detail,
  icone,
  couleur,
  onPress,
  styles,
  danger,
}: {
  titre: string;
  detail: string;
  icone: NomIcone;
  couleur: string;
  onPress: () => void;
  styles: ReturnType<typeof makeStyles>;
  danger?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.ligne} activeOpacity={0.7} onPress={onPress}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.ligneTitre, danger && styles.ligneTitreDanger]}>{titre}</Text>
        <Text style={styles.ligneDetail}>{detail}</Text>
      </View>
      <View style={[styles.pastille, danger && styles.pastilleDanger]}>
        <IconSymbol name={icone} size={19} color={couleur} />
      </View>
    </TouchableOpacity>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    page: { flex: 1, backgroundColor: c.page },
    contenu: { padding: 16, paddingBottom: 40 },
    section: {
      fontSize: 13,
      fontWeight: "700",
      color: c.accentText,
      marginTop: 22,
      marginBottom: 8,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    sectionDanger: { color: c.danger },
    ligne: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
    },
    ligneTitre: { fontSize: 15, fontWeight: "600", color: c.textPrimary },
    ligneTitreDanger: { color: c.danger },
    ligneDetail: { fontSize: 12, color: c.textMuted, marginTop: 3, lineHeight: 17 },
    pastille: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: c.accentSoft,
      alignItems: "center",
      justifyContent: "center",
    },
    pastilleDanger: { backgroundColor: c.danger },

    couleursBloc: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      padding: 14,
    },
    couleursTitre: { fontSize: 15, fontWeight: "600", color: c.textPrimary },
    couleursDetail: { fontSize: 12, color: c.textMuted, marginTop: 3, marginBottom: 14 },
    pastilles: { flexDirection: "row", flexWrap: "wrap", gap: 14, justifyContent: "space-between" },
    pastilleCouleur: {
      alignItems: "center",
      width: 82,
      paddingVertical: 6,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: "transparent",
    },
    rond: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
    pastilleNom: { fontSize: 12, color: c.textMuted, marginTop: 6 },
    pastilleNomActif: { color: c.accentText, fontWeight: "700" },

    succes: { backgroundColor: c.successSoft, borderRadius: 12, padding: 12, marginBottom: 8 },
    succesTexte: { fontSize: 13, color: c.textPrimary, fontWeight: "600" },
    erreur: { backgroundColor: c.warningSoft, borderRadius: 12, padding: 12, marginBottom: 8 },
    erreurTexte: { fontSize: 13, color: c.warningText, fontWeight: "600" },

    apropos: { alignItems: "center", marginTop: 36 },
    logo: { height: 30, aspectRatio: 1428 / 249 },
    version: { fontSize: 12, color: c.textMuted, marginTop: 10 },
    signature: { fontSize: 12, color: c.textMuted, marginTop: 2 },
  });
}
