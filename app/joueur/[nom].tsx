// app/joueur/[nom].tsx — fiche d'un joueur
//
// Le nom sert d'identifiant : c'est déjà lui que l'historique enregistre, et
// renommer un joueur le renomme partout (voir db/joueurs.ts).

import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AvatarJoueur } from "@/components/avatar-joueur";
import { DialogueRenommerJoueur } from "@/components/dialogue-renommer-joueur";
import { Entete } from "@/components/entete";
import { ListeDepliable } from "@/components/liste-depliable";
import { type AppColors } from "@/constants/theme-colors";
import { useTheme } from "@/context/theme";
import { definirPhotoJoueur, listerJoueurs, type JoueurEnregistre } from "@/db/joueurs";
import { listerParties, type PartieEnregistree } from "@/db/parties";
import { formatDuree } from "@/lib/duree";
import { choisirPhoto, DOSSIER_JOUEURS, supprimerImage } from "@/lib/images";
import { statsJoueur } from "@/lib/stats-joueur";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export default function FicheJoueur() {
  const { nom } = useLocalSearchParams<{ nom: string }>();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [parties, setParties] = useState<PartieEnregistree[]>([]);
  const [joueurs, setJoueurs] = useState<JoueurEnregistre[]>([]);
  const [renommerOuvert, setRenommerOuvert] = useState(false);
  const [erreurPhoto, setErreurPhoto] = useState<string | null>(null);

  const photo = joueurs.find((j) => j.nom === nom)?.photo ?? null;

  async function changerPhoto() {
    setErreurPhoto(null);
    try {
      const nouvelle = await choisirPhoto(DOSSIER_JOUEURS);
      if (!nouvelle) return; // l'utilisateur a renoncé
      await definirPhotoJoueur(nom, nouvelle);
      // L'ancienne n'a plus de propriétaire.
      await supprimerImage(photo);
      charger();
    } catch (e) {
      setErreurPhoto(e instanceof Error ? e.message : String(e));
    }
  }

  async function retirerPhoto() {
    await definirPhotoJoueur(nom, null);
    await supprimerImage(photo);
    charger();
  }

  const charger = useCallback(() => {
    listerParties()
      .then(setParties)
      .catch(() => setParties([]));
    listerJoueurs()
      .then(setJoueurs)
      .catch(() => setJoueurs([]));
  }, []);

  useFocusEffect(
    useCallback(() => {
      charger();
    }, [charger]),
  );

  const s = statsJoueur(parties, nom);
  const adversaire = s.adversaires[0];

  return (
    <View style={{ flex: 1, backgroundColor: colors.page }}>
      <Entete titre={nom} />
      <ScrollView style={styles.page} contentContainerStyle={[styles.contenu, { paddingBottom: 40 + insets.bottom }]}>
        <View style={styles.enTete}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={changerPhoto}
            accessibilityLabel={photo ? "Changer la photo" : "Ajouter une photo"}
          >
            <AvatarJoueur nom={nom} photo={photo} taille={72} />
            <View style={styles.badgePhoto}>
              <Text style={styles.badgePhotoTexte}>{photo ? "✎" : "+"}</Text>
            </View>
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.titre}>{nom}</Text>
            <Text style={styles.sousTitre}>
              {s.parties === 0
                ? "Aucune partie enregistrée"
                : `${s.parties} partie${s.parties > 1 ? "s" : ""} · ${s.victoires} victoire${s.victoires > 1 ? "s" : ""}`}
            </Text>
            {photo && (
              <TouchableOpacity onPress={retirerPhoto} hitSlop={8}>
                <Text style={styles.retirerPhoto}>Retirer la photo</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {erreurPhoto && <Text style={styles.erreurPhoto}>{erreurPhoto}</Text>}

        {s.parties === 0 ? (
          <View style={styles.vide}>
            <Text style={styles.videTexte}>
              Ce joueur n&apos;apparaît dans aucune partie. Termine une partie avec lui et ses
              statistiques se rempliront ici.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.grille}>
              <Metrique valeur={String(s.parties)} label="parties" styles={styles} />
              <Metrique valeur={String(s.victoires)} label="victoires" styles={styles} />
              <Metrique valeur={`${s.taux} %`} label="taux de victoire" styles={styles} />
              <Metrique
                valeur={String(s.meilleureSerie)}
                label={
                  s.serieEnCours > 1
                    ? `meilleure série · ${s.serieEnCours} en cours`
                    : "meilleure série"
                }
                styles={styles}
              />
            </View>

            {adversaire && (
              <View style={styles.miseEnAvant}>
                <Text style={styles.miseEnAvantLabel}>Adversaire favori</Text>
                <Text style={styles.miseEnAvantValeur}>{adversaire.nom}</Text>
                <Text style={styles.miseEnAvantDetail}>
                  {adversaire.duels} affrontement{adversaire.duels > 1 ? "s" : ""} ·{" "}
                  {adversaire.victoiresContre} gagné{adversaire.victoiresContre > 1 ? "s" : ""} par{" "}
                  {nom}
                </Text>
              </View>
            )}

            <Section titre="Taux de victoire par jeu" styles={styles}>
              <ListeDepliable
                items={s.parJeu}
                singulier="jeu suivant"
                pluriel="autres jeux"
                rendu={(j) => (
                  <View
                    key={j.jeu}
                    style={styles.ligneJeu}
                    accessible
                    accessibilityRole="progressbar"
                    accessibilityLabel={j.jeu}
                    accessibilityValue={{
                      min: 0,
                      max: 100,
                      now: j.taux,
                      text: `${j.taux} pour cent, ${j.victoires} victoires sur ${j.parties}`,
                    }}
                  >
                    <Text style={styles.jeuNom} numberOfLines={1}>
                      {j.jeu}
                    </Text>
                    <View style={styles.piste}>
                      <View style={[styles.remplissage, { width: `${j.taux}%` }]} />
                    </View>
                    <Text style={styles.jeuTaux}>{j.taux} %</Text>
                    <Text style={styles.jeuCompte}>
                      {j.victoires}/{j.parties}
                    </Text>
                  </View>
                )}
              />
            </Section>

            {s.compagnons.length > 1 && (
              <Section titre="Ses habitués" styles={styles}>
                <ListeDepliable
                  items={s.compagnons}
                  singulier="joueur suivant"
                  pluriel="autres joueurs"
                  rendu={(c) => {
                    const face = s.adversaires.find((a) => a.nom === c.nom);
                    return (
                      <View key={c.nom} style={styles.ligneCompagnon}>
                        <Text style={styles.compagnonNom} numberOfLines={1}>
                          {c.nom}
                        </Text>
                        <Text style={styles.compagnonDetail}>
                          {c.parties} partie{c.parties > 1 ? "s" : ""}
                          {face && ` · ${Math.round((face.victoiresContre / face.duels) * 100)} %`}
                        </Text>
                      </View>
                    );
                  }}
                />
                <Text style={styles.aide}>
                  Le pourcentage est celui des affrontements que {nom} a gagnés. Ni les coéquipiers
                  d&apos;une même équipe, ni les partenaires d&apos;un coopératif n&apos;y comptent :
                  on ne gagne pas contre eux.
                </Text>
              </Section>
            )}

            <Section titre="Ses parties" styles={styles}>
              <ListeDepliable
                items={s.historique}
                singulier="partie suivante"
                pluriel="autres parties"
                rendu={(p) => {
                  const issue = issuePour(p, nom);
                  const sienne = issue === "Victoire";
                  return (
                    <View key={p.id} style={styles.lignePartie}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.partieJeu} numberOfLines={1}>
                          {p.jeu_nom}
                        </Text>
                        <Text style={styles.partieMeta}>
                          {formatDate(p.date)}
                          {p.duree ? ` · ${formatDuree(p.duree)}` : ""}
                        </Text>
                      </View>
                      <Text style={[styles.issue, sienne ? styles.gagnee : styles.perdue]}>
                        {issue}
                      </Text>
                    </View>
                  );
                }}
              />
            </Section>
          </>
        )}

        <TouchableOpacity style={styles.bouton} onPress={() => setRenommerOuvert(true)}>
          <Text style={styles.boutonTexte}>Renommer ou fusionner</Text>
        </TouchableOpacity>
      </ScrollView>

      <DialogueRenommerJoueur
        visible={renommerOuvert}
        nom={nom}
        joueurs={joueurs}
        parties={parties}
        onAnnuler={() => setRenommerOuvert(false)}
        onRenomme={(nouveau) => {
          setRenommerOuvert(false);
          // La fiche suit le joueur sous son nouveau nom, sans empiler d'écran.
          router.replace({ pathname: "/joueur/[nom]", params: { nom: nouveau } });
        }}
      />
    </View>
  );
}

/**
 * Ce que la partie a donné pour ce joueur.
 * Trois pièges : le coopératif se gagne à plusieurs, l'égalité s'enregistre par
 * un vainqueur vide, et en équipes le vainqueur est le nom de l'équipe.
 */
function issuePour(p: PartieEnregistree, nom: string): "Victoire" | "Défaite" | "Égalité" {
  if (p.resultat) return p.resultat === "victoire" ? "Victoire" : "Défaite";
  if (!p.gagnant) return "Égalité";
  try {
    const lignes = JSON.parse(p.details) as { nom: string; membres?: string[] }[];
    const sienne = lignes.find((l) => (l.membres?.length ? l.membres.includes(nom) : l.nom === nom));
    return sienne && p.gagnant === sienne.nom ? "Victoire" : "Défaite";
  } catch {
    return "Défaite";
  }
}

function Metrique({
  valeur,
  label,
  styles,
}: {
  valeur: string;
  label: string;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.carteMetrique}>
      <Text style={styles.metriqueValeur}>{valeur}</Text>
      <Text style={styles.metriqueLabel}>{label}</Text>
    </View>
  );
}

function Section({
  titre,
  children,
  styles,
}: {
  titre: string;
  children: React.ReactNode;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitre}>{titre}</Text>
      <View style={styles.carte}>{children}</View>
    </View>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    page: { flex: 1, backgroundColor: c.page },
    contenu: { padding: 16, paddingBottom: 40 },

    enTete: { flexDirection: "row", alignItems: "center", gap: 14 },
    badgePhoto: {
      position: "absolute",
      right: -2,
      bottom: -2,
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: c.accent,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: c.page,
    },
    badgePhotoTexte: { color: c.onAccent, fontSize: 13, fontWeight: "700" },
    retirerPhoto: { fontSize: 12, color: c.danger, fontWeight: "600", marginTop: 6 },
    erreurPhoto: { fontSize: 13, color: c.danger, marginTop: 12 },
    titre: { fontSize: 24, fontWeight: "600", color: c.textPrimary },
    sousTitre: { fontSize: 13, color: c.textMuted, marginTop: 3 },

    vide: { paddingVertical: 40, paddingHorizontal: 8 },
    videTexte: { fontSize: 14, color: c.textMuted, textAlign: "center", lineHeight: 20 },

    grille: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 20 },
    carteMetrique: {
      flexGrow: 1,
      flexBasis: "45%",
      backgroundColor: c.surfaceAlt,
      borderRadius: 12,
      padding: 14,
    },
    metriqueValeur: { fontSize: 24, fontWeight: "700", color: c.textPrimary },
    metriqueLabel: { fontSize: 12, color: c.textMuted, marginTop: 2 },

    miseEnAvant: { backgroundColor: c.accentSoft, borderRadius: 12, padding: 14, marginTop: 10 },
    miseEnAvantLabel: { fontSize: 12, color: c.accentText, fontWeight: "600" },
    miseEnAvantValeur: { fontSize: 16, fontWeight: "700", color: c.textPrimary, marginTop: 4 },
    miseEnAvantDetail: { fontSize: 12, color: c.textMuted, marginTop: 2, lineHeight: 17 },

    section: { marginTop: 22 },
    sectionTitre: { fontSize: 17, fontWeight: "600", color: c.textPrimary, marginBottom: 10 },
    carte: {
      backgroundColor: c.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      padding: 14,
    },
    aide: { fontSize: 11, color: c.textMuted, lineHeight: 16, marginTop: 6 },

    ligneJeu: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
    jeuNom: { width: 90, fontSize: 13, color: c.textSecondary },
    piste: { flex: 1, height: 10, borderRadius: 5, backgroundColor: c.surfaceAlt },
    remplissage: { height: 10, borderRadius: 5, backgroundColor: c.accent },
    jeuTaux: { width: 40, textAlign: "right", fontSize: 13, fontWeight: "700", color: c.accentText },
    jeuCompte: { width: 36, textAlign: "right", fontSize: 12, color: c.textMuted },

    ligneCompagnon: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      paddingVertical: 8,
    },
    compagnonNom: { flex: 1, fontSize: 14, fontWeight: "600", color: c.textPrimary },
    compagnonDetail: { fontSize: 12, color: c.textMuted },

    lignePartie: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    partieJeu: { fontSize: 14, fontWeight: "600", color: c.textPrimary },
    partieMeta: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    issue: { fontSize: 13, fontWeight: "700" },
    gagnee: { color: c.accentText },
    perdue: { color: c.textMuted },

    bouton: {
      marginTop: 24,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
      borderWidth: 1,
      borderColor: c.borderStrong,
    },
    boutonTexte: { fontSize: 15, fontWeight: "600", color: c.textSecondary },
  });
}
