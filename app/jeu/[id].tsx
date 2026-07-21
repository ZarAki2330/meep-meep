// app/jeu/[id].tsx — fiche d'un jeu

import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DialogueConfirmation } from "@/components/dialogue-confirmation";
import { Entete } from "@/components/entete";
import { PoweredByBgg } from "@/components/powered-by-bgg";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { VisuelJeu } from "@/components/visuel-jeu";
import { type AppColors } from "@/constants/theme-colors";
import { useJeux } from "@/context/jeux";
import { useTheme } from "@/context/theme";
import { effacerEtat, partieEnCours } from "@/db/partie-en-cours";
import { jeuVersTexte } from "@/lib/jeu-partage";
import { enfantsDe } from "@/lib/regroupement";
import { cheminPartie } from "@/lib/route-partie";

const LIBELLE_TYPE = { extension: "Extension", edition: "Édition" } as const;

export default function FicheJeu() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { jeux, pret, supprimerJeu, estFavori, basculerFavori } = useJeux();
  const styles = makeStyles(colors);
  const insets = useSafeAreaInsets();
  const jeu = jeux.find((j) => j.id === id);

  const [extensionsActives, setExtensionsActives] = useState<string[]>([]);
  const [reglesOuvertes, setReglesOuvertes] = useState(true);
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
  const [abandonOuvert, setAbandonOuvert] = useState(false);
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
      pathname: cheminPartie(jeu),
      params: { jeuId: jeu.id, extensions: extensionsActives.join("|") },
    });
  }

  async function nouvellePartie() {
    if (!jeu) return;
    await effacerEtat(jeu.id).catch(() => {});
    setEnCours(false);
    ouvrirPartie();
  }

  /** Le bandeau du catalogue ne vise que la partie la plus récente : voici l'autre chemin. */
  async function abandonner() {
    if (!jeu) return;
    setAbandonOuvert(false);
    await effacerEtat(jeu.id).catch(() => {});
    setEnCours(false);
  }

  async function supprimer(avecDeclinaisons: boolean) {
    if (!jeu) return;
    setConfirmationOuverte(false);
    if (avecDeclinaisons) {
      // Les extensions et éditions rattachées d'abord, puis le jeu de base.
      for (const d of enfantsDe(jeu.id, jeux)) {
        await supprimerJeu(d.id);
      }
    }
    await supprimerJeu(jeu.id);
    router.back();
  }

  // Tant que les jeux ajoutés ne sont pas chargés, on n'affiche pas « introuvable ».
  if (!jeu) {
    return (
      <View style={{ flex: 1 }}>
        <Entete titre="" />
        <View style={styles.centre}>
          {pret ? (
            <Text style={{ color: colors.textPrimary }}>Jeu introuvable.</Text>
          ) : (
            <ActivityIndicator color={colors.accent} />
          )}
        </View>
      </View>
    );
  }

  // Extensions et éditions rattachées à ce jeu, présentes dans le catalogue.
  const declinaisons = enfantsDe(jeu.id, jeux);

  // Extensions qu'on peut cocher avant de lancer une partie : celles décrites
  // dans le jeu lui-même (rôles filtrés, façon Villainous) plus les extensions
  // installées comme jeux à part et rattachées à ce jeu. Les éditions n'en sont
  // pas : ce sont des variantes du même jeu, pas des ajouts à une partie.
  const extensionsJouables = Array.from(
    new Set([
      ...(jeu.extensions ?? []),
      ...declinaisons.filter((d) => d.type === "extension").map((d) => d.nom),
    ]),
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.page }}>
      <Entete
        titre={jeu.nom}
        droite={
          <TouchableOpacity
            hitSlop={10}
            accessibilityLabel="Partager ce jeu"
            onPress={() =>
              Share.share({ title: jeu.nom, message: jeuVersTexte(jeu) }).catch(() => {})
            }
          >
            <IconSymbol name="square.and.arrow.up" size={22} color={colors.accentText} />
          </TouchableOpacity>
        }
      />
      <ScrollView style={styles.page} contentContainerStyle={[styles.contenu, { paddingBottom: 40 + insets.bottom }]}>
      <View style={styles.enTete}>
        <VisuelJeu jeu={jeu} style={styles.vignette} />

        <View style={styles.enTeteTexte}>
          <Text style={styles.titre}>{jeu.nom}</Text>
          <View style={styles.categorie}>
            <Text style={styles.categorieTexte}>{jeu.categorie}</Text>
          </View>
          {jeu.editeur ? (
            <Text style={styles.editeur}>
              Éditeur&nbsp;: {jeu.editeur}
            </Text>
          ) : null}
        </View>

        <TouchableOpacity
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Favori"
          accessibilityState={{ selected: estFavori(jeu.id) }}
          onPress={() => basculerFavori(jeu.id)}
        >
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

      {declinaisons.length > 0 && (
        <View style={styles.declinaisonsBloc}>
          <Text style={styles.sectionTitre}>Extensions & éditions</Text>
          {declinaisons.map((d) => (
            <TouchableOpacity
              key={d.id}
              style={styles.declinaisonLigne}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`${d.nom}, ${LIBELLE_TYPE[d.type === "extension" ? "extension" : "edition"]}. Voir la fiche`}
              onPress={() => router.push(`/jeu/${d.id}`)}
            >
              <VisuelJeu jeu={d} style={styles.declinaisonVisuel} />
              <View style={{ flex: 1 }}>
                <Text style={styles.declinaisonNom} numberOfLines={1}>
                  {d.nom}
                </Text>
                <Text style={styles.declinaisonType}>
                  {LIBELLE_TYPE[d.type === "extension" ? "extension" : "edition"]}
                </Text>
              </View>
              <Text
                style={styles.declinaisonChevron}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                ▸
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {extensionsJouables.length > 0 && (
        <View style={styles.extensionsBloc}>
          <Text style={styles.sectionTitre}>Extensions</Text>
          <Text style={styles.extensionsSous}>Coche les extensions que tu ajoutes à ta partie.</Text>
          {extensionsJouables.map((ext) => {
            const active = extensionsActives.includes(ext);
            return (
              <TouchableOpacity
                key={ext}
                style={styles.extensionLigne}
                activeOpacity={0.7}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: active }}
                accessibilityLabel={ext}
                onPress={() => basculerExtension(ext)}
              >
                <View
                  style={[styles.case, active && styles.caseActive]}
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                >
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
        <>
          <TouchableOpacity
            style={styles.boutonSecondaire}
            activeOpacity={0.8}
            accessibilityRole="button"
            onPress={nouvellePartie}
          >
            <Text style={styles.boutonSecondaireTexte}>Repartir de zéro</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.boutonAbandon}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Abandonner la partie en cours"
            onPress={() => setAbandonOuvert(true)}
          >
            <Text style={styles.boutonAbandonTexte}>Abandonner la partie</Text>
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity
        style={styles.sectionRepliable}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Règles"
        accessibilityState={{ expanded: reglesOuvertes }}
        onPress={() => setReglesOuvertes((o) => !o)}
      >
        <Text style={styles.sectionTitreRepliable}>Règles</Text>
        <View style={styles.chevronBadge} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
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
            accessibilityRole="button"
            accessibilityLabel={`Personnages, ${rolesVisibles.length}`}
            accessibilityState={{ expanded: rolesOuverts }}
            onPress={() => setRolesOuverts((o) => !o)}
          >
            <Text style={styles.sectionTitreRepliable}>Personnages ({rolesVisibles.length})</Text>
            <View style={styles.chevronBadge} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
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

      {jeu.id.startsWith("bgg") && (
        <PoweredByBgg url={`https://boardgamegeek.com/boardgame/${jeu.id.slice(3)}`} />
      )}

      <DialogueConfirmation
        visible={abandonOuvert}
        titre="Abandonner cette partie ?"
        message="Elle sera perdue, et n'ira pas dans l'historique."
        texteConfirmer="Abandonner"
        onConfirmer={abandonner}
        onAnnuler={() => setAbandonOuvert(false)}
      />

      <DialogueConfirmation
        visible={confirmationOuverte}
        titre="Supprimer ce jeu ?"
        message={
          declinaisons.length > 0
            ? `« ${jeu.nom} » a ${declinaisons.length} extension${declinaisons.length > 1 ? "s" : ""} ou édition${declinaisons.length > 1 ? "s" : ""} rattachée${declinaisons.length > 1 ? "s" : ""} dans ta ludothèque. Les supprimer aussi ?`
            : `« ${jeu.nom} » sera retiré de ton catalogue.`
        }
        texteConfirmer={declinaisons.length > 0 ? "Tout supprimer" : "Supprimer"}
        texteAnnuler={declinaisons.length > 0 ? "Le jeu seul" : "Annuler"}
        onConfirmer={() => supprimer(declinaisons.length > 0)}
        onAnnuler={() =>
          declinaisons.length > 0 ? supprimer(false) : setConfirmationOuverte(false)
        }
        onFermer={() => setConfirmationOuverte(false)}
      />
      </ScrollView>
    </View>
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
    enTete: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
    vignette: { width: 96, height: 96, borderRadius: 16 },
    // La colonne de texte respire mieux si elle s'aligne sur le haut de la vignette.
    enTeteTexte: { flex: 1, gap: 8, paddingTop: 2 },
    titre: { fontSize: 24, fontWeight: "600", color: c.textPrimary },
    categorie: {
      alignSelf: "flex-start",
      backgroundColor: c.accentSoft,
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    categorieTexte: { fontSize: 12, fontWeight: "600", color: c.accentText },
    editeur: { fontSize: 13, color: c.textMuted, marginTop: 6 },
    metaLigne: { flexDirection: "row", gap: 12, marginTop: 18 },
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
    boutonAbandon: { paddingVertical: 12, alignItems: "center", marginTop: 4 },
    boutonAbandonTexte: { color: c.danger, fontSize: 14, fontWeight: "600" },
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
    declinaisonsBloc: { marginTop: 4 },
    declinaisonLigne: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      padding: 10,
      marginBottom: 8,
    },
    declinaisonVisuel: { width: 44, height: 44, borderRadius: 10 },
    declinaisonNom: { fontSize: 15, fontWeight: "600", color: c.textPrimary },
    declinaisonType: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    declinaisonChevron: { fontSize: 16, color: c.textFaint, fontWeight: "700", paddingHorizontal: 2 },
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
