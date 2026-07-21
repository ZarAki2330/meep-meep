// app/import.tsx — ajouter un jeu manuellement (hors-ligne)

import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { Entete } from "@/components/entete";
import { type AppColors } from "@/constants/theme-colors";
import { type CleAide } from "@/data/aide";
import { useJeux } from "@/context/jeux";
import { useTheme } from "@/context/theme";
import { type BonusGrille, type Jeu } from "@/data/jeux";
import { ajouterJeu } from "@/db/jeux";
import { choisirPhoto, DOSSIER_JEUX, supprimerImage } from "@/lib/images";
import { texteVersJeu, type JeuSansId } from "@/lib/jeu-partage";
import {
  categoriesVersTexte,
  extensionsInconnues,
  extensionsVersTexte,
  listeOuRien,
  parserCategories,
  parserExtensions,
  parserRoles,
  rolesVersTexte,
} from "@/lib/parse-jeu";

type Mode = "compteur" | "objectif" | "grille" | "manches" | "cooperatif";

function nombre(s: string, defaut: number): number {
  const n = parseInt(s, 10);
  return isNaN(n) ? defaut : n;
}

export default function AjouterJeu() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const router = useRouter();
  const { jeux, rafraichir } = useJeux();

  // Si un id est passé, on modifie ce jeu au lieu d'en créer un nouveau.
  const { id } = useLocalSearchParams<{ id?: string }>();
  const jeuExistant = id ? jeux.find((j) => j.id === id) : undefined;
  const modeEdition = !!jeuExistant;

  // Catégories déjà utilisées dans le catalogue, pour les proposer en un clic.
  const categoriesExistantes = Array.from(new Set(jeux.map((j) => j.categorie))).sort((a, b) =>
    a.localeCompare(b, "fr"),
  );

  // Éditeurs déjà utilisés, proposés en un clic (« Gigamic » revient souvent).
  const editeursExistants = Array.from(
    new Set(jeux.map((j) => j.editeur?.trim()).filter((e): e is string => !!e)),
  ).sort((a, b) => a.localeCompare(b, "fr"));

  const [nom, setNom] = useState("");
  const [categorie, setCategorie] = useState("");
  const [editeur, setEditeur] = useState("");
  const [jMin, setJMin] = useState("2");
  const [jMax, setJMax] = useState("4");
  const [duree, setDuree] = useState("30");
  const [age, setAge] = useState("8");
  const [image, setImage] = useState("");
  const [description, setDescription] = useState("");
  const [regles, setRegles] = useState("");
  const [reglesUrl, setReglesUrl] = useState("");
  const [sens, setSens] = useState<"max" | "min">("max");
  const [seuil, setSeuil] = useState("");
  const [equipes, setEquipes] = useState(false);
  const [mode, setMode] = useState<Mode>("compteur");
  const [categoriesTexte, setCategoriesTexte] = useState("");
  const [bonusActif, setBonusActif] = useState(false);
  const [bonusSection, setBonusSection] = useState<string | null>(null);
  const [bonusSeuil, setBonusSeuil] = useState("");
  const [bonusPoints, setBonusPoints] = useState("");
  const [erreurNom, setErreurNom] = useState<string | null>(null);
  const [erreurCategories, setErreurCategories] = useState<string | null>(null);
  const [erreurBonus, setErreurBonus] = useState<string | null>(null);
  const [erreurImage, setErreurImage] = useState<string | null>(null);
  const [extensionsTexte, setExtensionsTexte] = useState("");
  const [rolesTexte, setRolesTexte] = useState("");
  const [rolesPartageables, setRolesPartageables] = useState(false);
  const [prerempli, setPrerempli] = useState(false);
  const [collageOuvert, setCollageOuvert] = useState(false);
  const [texteColle, setTexteColle] = useState("");
  const [erreurCollage, setErreurCollage] = useState<string | null>(null);
  // Sections repliables : à l'ajout on garde le formulaire épuré (replié) pour
  // ne pas intimider ; à la modification on ouvre tout, pour relire le jeu.
  const [presentationOuverte, setPresentationOuverte] = useState(modeEdition);
  const [avanceOuvert, setAvanceOuvert] = useState(modeEdition);

  // Choisit une photo dans la galerie et la copie dans le stockage de l'app,
  // sinon l'image disparaîtrait avec le cache du téléphone.
  async function choisirImage() {
    setErreurImage(null);
    try {
      const nouvelle = await choisirPhoto(DOSSIER_JEUX);
      if (!nouvelle) return; // l'utilisateur a renoncé

      const precedente = image;
      setImage(nouvelle);

      // On se ravise deux fois de suite : la photo intermédiaire n'a jamais été
      // enregistrée, personne ne la réclamera. Celle du jeu, elle, attend la validation.
      if (precedente !== jeuExistant?.image) await supprimerImage(precedente);
    } catch (e) {
      setErreurImage(e instanceof Error ? e.message : String(e));
    }
  }

  // Remplit tous les champs à partir d'un jeu (modification, ou jeu collé).
  const appliquerJeu = useCallback((j: JeuSansId) => {
    setNom(j.nom ?? "");
    setCategorie(j.categorie ?? "");
    setEditeur(j.editeur ?? "");
    setJMin(String(j.joueursMin ?? 2));
    setJMax(String(j.joueursMax ?? 4));
    setDuree(String(j.dureeMin ?? 30));
    setAge(String(j.ageMin ?? 8));
    setImage(j.image ?? "");
    setDescription(j.description ?? "");
    setRegles((j.regles ?? []).join("\n"));
    setReglesUrl(j.reglesUrl ?? "");
    setSens(j.scoreVictoire === "min" ? "min" : "max");
    setSeuil(j.seuilFin ? String(j.seuilFin) : "");
    setEquipes(j.equipes === true);
    setMode(j.scoreMode ?? "compteur");
    setExtensionsTexte(extensionsVersTexte(j.extensions ?? []));
    setRolesTexte(rolesVersTexte(j.roles ?? []));
    setRolesPartageables(j.rolesPartageables === true);

    const cats = j.categories ?? [];
    setCategoriesTexte(categoriesVersTexte(cats));

    const b = j.bonus;
    if (b) {
      setBonusActif(true);
      setBonusSeuil(String(b.seuil));
      setBonusPoints(String(b.points));
      const toutes = cats.map((c) => c.cle);
      let section: string | null = null;
      if (b.surCles.length !== toutes.length) {
        const sections = Array.from(new Set(cats.map((c) => c.section).filter(Boolean) as string[]));
        for (const s of sections) {
          const cles = cats.filter((c) => c.section === s).map((c) => c.cle);
          if (cles.length === b.surCles.length && cles.every((k) => b.surCles.includes(k))) {
            section = s;
            break;
          }
        }
      }
      setBonusSection(section);
    } else {
      setBonusActif(false);
    }
  }, []);

  // Pré-remplit le formulaire quand on modifie un jeu existant.
  useEffect(() => {
    if (!jeuExistant || prerempli) return;
    appliquerJeu(jeuExistant);
    setPrerempli(true);
  }, [jeuExistant, prerempli, appliquerJeu]);

  function collerJeu() {
    setErreurCollage(null);
    try {
      appliquerJeu(texteVersJeu(texteColle));
      // On ouvre les sections repliées pour que tout le contenu rempli soit relu.
      setPresentationOuverte(true);
      setAvanceOuvert(true);
      setCollageOuvert(false);
      setTexteColle("");
    } catch (e) {
      setErreurCollage(e instanceof Error ? e.message : String(e));
    }
  }

  // Aperçu des cases saisies, pour proposer les sections du bonus.
  const catsApercu = mode === "grille" ? parserCategories(categoriesTexte) : [];
  const sectionsDispo = Array.from(
    new Set(catsApercu.map((c) => c.section).filter(Boolean) as string[]),
  );

  // Aperçu des personnages : on prévient tout de suite si l'un réclame une
  // extension qui n'est pas déclarée — il ne s'afficherait jamais sur la fiche.
  const inconnues = extensionsInconnues(parserRoles(rolesTexte), parserExtensions(extensionsTexte));

  async function enregistrer() {
    if (!nom.trim()) {
      setErreurNom("Donne au moins un nom à ton jeu.");
      return;
    }
    const cats = mode === "grille" ? parserCategories(categoriesTexte) : undefined;
    if (mode === "grille" && (!cats || cats.length === 0)) {
      setErreurCategories("Ajoute au moins une case à ta feuille de score.");
      return;
    }

    let bonus: BonusGrille | undefined;
    if (mode === "grille" && bonusActif && cats) {
      const seuil = nombre(bonusSeuil, 0);
      const points = nombre(bonusPoints, 0);
      if (seuil <= 0 || points <= 0) {
        setErreurBonus("Indique un seuil et un nombre de points supérieurs à zéro.");
        return;
      }
      const surCles = bonusSection
        ? cats.filter((c) => c.section === bonusSection).map((c) => c.cle)
        : cats.map((c) => c.cle);
      if (surCles.length === 0) {
        setErreurBonus("Cette section ne contient aucune case.");
        return;
      }
      bonus = { label: `Bonus (≥ ${seuil})`, surCles, seuil, points };
    }

    const min = nombre(jMin, 1);
    const jeu: Jeu = {
      id: jeuExistant ? jeuExistant.id : `perso${Date.now()}`,
      nom: nom.trim(),
      description: description.trim() || "Jeu ajouté manuellement.",
      joueursMin: min,
      joueursMax: Math.max(nombre(jMax, min), min),
      dureeMin: nombre(duree, 0),
      ageMin: nombre(age, 0),
      categorie: categorie.trim() || "Divers",
      editeur: editeur.trim() || undefined,
      image: image.trim(),
      regles: regles
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean),
      reglesUrl: reglesUrl.trim() || undefined,
      scoreVictoire: mode === "compteur" || mode === "manches" ? sens : "max",
      // Le seuil de fin ne veut rien dire hors des modes à points.
      seuilFin:
        (mode === "compteur" || mode === "manches") && nombre(seuil, 0) > 0
          ? nombre(seuil, 0)
          : undefined,
      equipes,
      scoreMode: mode,
      categories: cats,
      bonus,
      extensions: listeOuRien(parserExtensions(extensionsTexte)),
      roles: listeOuRien(parserRoles(rolesTexte)),
      rolesPartageables,
    };
    await ajouterJeu(jeu);
    // La photo qu'on vient de remplacer n'a plus de propriétaire.
    if (jeuExistant && jeuExistant.image !== jeu.image) await supprimerImage(jeuExistant.image);
    rafraichir();
    router.back();
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Entete titre={modeEdition ? "Modifier le jeu" : "Ajouter un jeu"} />
      <ScrollView style={styles.page} contentContainerStyle={styles.contenu}>
        {!modeEdition && (
          <>
            <TouchableOpacity
              style={styles.raccourciPrincipal}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Ajouter un jeu tout prêt en piochant dans le catalogue. Option recommandée."
              onPress={() => router.push("/bibliotheque")}
            >
              <View style={styles.raccourciTexte}>
                <View style={styles.raccourciBadge}>
                  <Text style={styles.raccourciBadgeTexte}>Le plus simple</Text>
                </View>
                <Text style={styles.raccourciPrincipalTitre}>Ajouter un jeu tout prêt</Text>
                <Text style={styles.raccourciPrincipalDetail}>
                  Des centaines de jeux déjà prêts — règles, photo et feuille de score inclus.
                </Text>
              </View>
              <Text style={styles.raccourciPrincipalChevron}>▸</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.raccourciSecondaire}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Coller un jeu partagé pour remplir le formulaire"
              onPress={() => setCollageOuvert(true)}
            >
              <Text style={styles.raccourciSecondaireTexte}>Coller un jeu partagé</Text>
              <Text style={styles.raccourciSecondaireChevron}>▸</Text>
            </TouchableOpacity>

            <View style={styles.separateur}>
              <View style={styles.separateurTrait} />
              <Text style={styles.separateurTexte}>ou crée-le toi-même</Text>
              <View style={styles.separateurTrait} />
            </View>
          </>
        )}

        <Text style={styles.blocTitre}>L&apos;essentiel</Text>

        <Champ label="Nom du jeu" styles={styles} obligatoire>
          <TextInput
            style={[styles.input, erreurNom ? styles.inputErreur : null]}
            value={nom}
            onChangeText={(t) => {
              setNom(t);
              if (erreurNom) setErreurNom(null);
            }}
            placeholder="Ex. Skull King"
            placeholderTextColor={colors.placeholder}
          />
          {erreurNom && <Text style={styles.erreur}>{erreurNom}</Text>}
        </Champ>

        <Champ label="Catégorie" styles={styles}>
          {categoriesExistantes.length > 0 && (
            <View style={[styles.chipsWrap, { marginBottom: 10 }]}>
              {categoriesExistantes.map((cat) => {
                const actif = categorie.trim().toLowerCase() === cat.toLowerCase();
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.chip, actif && styles.chipActif]}
                    onPress={() => setCategorie(actif ? "" : cat)}
                  >
                    <Text style={[styles.chipTexte, actif && styles.chipTexteActif]}>{cat}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          <TextInput
            style={styles.input}
            value={categorie}
            onChangeText={setCategorie}
            placeholder="Ou saisis une nouvelle catégorie"
            placeholderTextColor={colors.placeholder}
          />
        </Champ>

        <View style={styles.ligne}>
          <Champ label="Joueurs min" styles={styles} style={{ flex: 1 }}>
            <TextInput
              style={styles.input}
              value={jMin}
              onChangeText={setJMin}
              keyboardType="number-pad"
            />
          </Champ>
          <Champ label="Joueurs max" styles={styles} style={{ flex: 1 }}>
            <TextInput
              style={styles.input}
              value={jMax}
              onChangeText={setJMax}
              keyboardType="number-pad"
            />
          </Champ>
        </View>

        <View style={styles.ligne}>
          <Champ label="Durée (min)" styles={styles} style={{ flex: 1 }}>
            <TextInput
              style={styles.input}
              value={duree}
              onChangeText={setDuree}
              keyboardType="number-pad"
            />
          </Champ>
          <Champ label="Âge min" styles={styles} style={{ flex: 1 }}>
            <TextInput
              style={styles.input}
              value={age}
              onChangeText={setAge}
              keyboardType="number-pad"
            />
          </Champ>
        </View>

        <Section
          titre="Présentation"
          sousTitre="Éditeur, image, description, règles"
          ouvert={presentationOuverte}
          onToggle={() => setPresentationOuverte((v) => !v)}
          styles={styles}
        >
          <Champ label="Éditeur (optionnel)" styles={styles}>
            {editeursExistants.length > 0 && (
              <View style={[styles.chipsWrap, { marginBottom: 10 }]}>
                {editeursExistants.map((ed) => {
                  const actif = editeur.trim().toLowerCase() === ed.toLowerCase();
                  return (
                    <TouchableOpacity
                      key={ed}
                      style={[styles.chip, actif && styles.chipActif]}
                      onPress={() => setEditeur(actif ? "" : ed)}
                    >
                      <Text style={[styles.chipTexte, actif && styles.chipTexteActif]}>{ed}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
            <TextInput
              style={styles.input}
              value={editeur}
              onChangeText={setEditeur}
              placeholder="Ex. Gigamic"
              placeholderTextColor={colors.placeholder}
            />
          </Champ>

          <Champ label="Image (optionnel)" styles={styles}>
            <View style={styles.imageLigne}>
              {image ? (
                <Image source={{ uri: image }} style={styles.apercu} resizeMode="cover" />
              ) : (
                <View style={[styles.apercu, styles.apercuVide]}>
                  <Text style={styles.apercuVideTexte}>Aucune</Text>
                </View>
              )}

              <View style={{ flex: 1, gap: 8 }}>
                <TouchableOpacity style={styles.imageBouton} onPress={choisirImage}>
                  <Text style={styles.imageBoutonTexte}>Choisir dans la galerie</Text>
                </TouchableOpacity>
                {image ? (
                  <TouchableOpacity onPress={() => setImage("")}>
                    <Text style={styles.imageRetirer}>Retirer l&apos;image</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            {erreurImage && <Text style={styles.erreur}>{erreurImage}</Text>}

            <Text style={[styles.aide, { marginTop: 12, marginBottom: 4 }]}>
              Ou colle l&apos;adresse d&apos;une image trouvée sur le web.
            </Text>
            <TextInput
              style={styles.input}
              value={image}
              onChangeText={setImage}
              placeholder="https://…"
              placeholderTextColor={colors.placeholder}
              autoCapitalize="none"
            />
          </Champ>

          <Champ label="Description" styles={styles}>
            <TextInput
              style={[styles.input, styles.multi]}
              value={description}
              onChangeText={setDescription}
              placeholder="En une phrase"
              placeholderTextColor={colors.placeholder}
              multiline
            />
          </Champ>

          <Champ label="Règles (une par ligne)" styles={styles}>
            <TextInput
              style={[styles.input, styles.multiGrand]}
              value={regles}
              onChangeText={setRegles}
              placeholder={"À ton tour…\nLa partie se termine quand…"}
              placeholderTextColor={colors.placeholder}
              multiline
            />
          </Champ>

          <Champ label="Lien des règles officielles (optionnel)" styles={styles}>
            <Text style={styles.aide}>
              Adresse de la page ou du PDF de règles chez l&apos;éditeur. Un bouton « Règles
              officielles » apparaîtra sur la fiche. Laisse vide s&apos;il n&apos;y en a pas.
            </Text>
            <TextInput
              style={styles.input}
              value={reglesUrl}
              onChangeText={setReglesUrl}
              placeholder="https://…"
              placeholderTextColor={colors.placeholder}
              autoCapitalize="none"
              keyboardType="url"
            />
          </Champ>
        </Section>

        <Text style={styles.blocTitre}>Score</Text>

        <Champ label="Jeu en équipes ?" styles={styles} aide="equipes">
          <TouchableOpacity
            style={styles.bonusBascule}
            activeOpacity={0.7}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: equipes }}
            accessibilityLabel="Le score se compte par équipe"
            onPress={() => setEquipes((e) => !e)}
          >
            <View
              style={[styles.case, equipes && styles.caseActive]}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              {equipes && <Text style={styles.caseCoche}>✓</Text>}
            </View>
            <Text style={styles.bonusTexte}>
              Le score se compte par équipe (belote, Codenames…). Le nombre de joueurs ci-dessus
              correspond alors au nombre d&apos;équipes.
            </Text>
          </TouchableOpacity>
        </Champ>

        <Champ label="Comment se compte le score ?" styles={styles} aide="modes">
          <View style={styles.modeColonne}>
            <ModeChoix
              titre="Compteur de points"
              detail="On monte et descend les points de chaque joueur."
              actif={mode === "compteur"}
              onPress={() => setMode("compteur")}
              styles={styles}
            />
            <ModeChoix
              titre="Objectif (sans points)"
              detail="On désigne simplement le vainqueur à la fin."
              actif={mode === "objectif"}
              onPress={() => setMode("objectif")}
              styles={styles}
            />
            <ModeChoix
              titre="Manches"
              detail="Une ligne par manche, total calculé automatiquement."
              actif={mode === "manches"}
              onPress={() => setMode("manches")}
              styles={styles}
            />
            <ModeChoix
              titre="Feuille de score"
              detail="Une grille avec tes propres cases (type Yams)."
              actif={mode === "grille"}
              onPress={() => setMode("grille")}
              styles={styles}
            />
            <ModeChoix
              titre="Coopératif"
              detail="Pas de classement : toute la table gagne ou perd ensemble."
              actif={mode === "cooperatif"}
              onPress={() => setMode("cooperatif")}
              styles={styles}
            />
          </View>
        </Champ>

        {(mode === "compteur" || mode === "manches") && (
          <Champ label="Qui gagne ?" styles={styles}>
            <View style={styles.sensLigne}>
              <TouchableOpacity
                style={[styles.sensChip, sens === "max" && styles.sensChipActif]}
                accessibilityRole="radio"
                accessibilityState={{ checked: sens === "max" }}
                accessibilityLabel="Le plus de points gagne"
                onPress={() => setSens("max")}
              >
                <Text style={[styles.sensTexte, sens === "max" && styles.sensTexteActif]}>
                  Le plus de points
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sensChip, sens === "min" && styles.sensChipActif]}
                accessibilityRole="radio"
                accessibilityState={{ checked: sens === "min" }}
                accessibilityLabel="Le moins de points gagne"
                onPress={() => setSens("min")}
              >
                <Text style={[styles.sensTexte, sens === "min" && styles.sensTexteActif]}>
                  Le moins de points
                </Text>
              </TouchableOpacity>
            </View>

            <View style={{ marginTop: 14 }}>
              <Text style={styles.label}>Partie gagnée à (optionnel)</Text>
              <Text style={styles.aide}>
                Score qui déclenche la fin de la partie. Ex. 1000 à la belote, 66 au 6 qui prend.
                Laisse vide s&apos;il n&apos;y en a pas.
              </Text>
              <TextInput
                style={styles.input}
                value={seuil}
                onChangeText={setSeuil}
                keyboardType="number-pad"
                placeholder="1000"
                placeholderTextColor={colors.placeholder}
              />
            </View>
          </Champ>
        )}

        {mode === "grille" && (
          <Champ label="Cases de la feuille (une par ligne)" styles={styles} obligatoire aide="feuille">
            <Text style={styles.aide}>
              Une ligne = une case. Ajoute une aide après une barre verticale, et commence une ligne
              par # pour créer une section.
            </Text>
            <TextInput
              style={[styles.input, styles.multiGrand, erreurCategories ? styles.inputErreur : null]}
              value={categoriesTexte}
              onChangeText={(t) => {
                setCategoriesTexte(t);
                if (erreurCategories) setErreurCategories(null);
              }}
              placeholder={"# Partie haute\nTotal des 1\nTotal des 2\n# Partie basse\nFull | 25\nChance | somme des dés"}
              placeholderTextColor={colors.placeholder}
              multiline
            />
            {erreurCategories && <Text style={styles.erreur}>{erreurCategories}</Text>}
          </Champ>
        )}

        {mode === "grille" && (
          <Champ label="Bonus (optionnel)" styles={styles} aide="feuille">
            <TouchableOpacity
              style={styles.bonusBascule}
              activeOpacity={0.7}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: bonusActif }}
              accessibilityLabel="Ajouter des points si un total atteint un seuil"
              onPress={() => {
                setBonusActif((b) => !b);
                setErreurBonus(null);
              }}
            >
              <View
                style={[styles.case, bonusActif && styles.caseActive]}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                {bonusActif && <Text style={styles.caseCoche}>✓</Text>}
              </View>
              <Text style={styles.bonusTexte}>
                Ajouter des points si un total atteint un seuil
              </Text>
            </TouchableOpacity>

            {bonusActif && (
              <View style={styles.bonusBloc}>
                <Text style={styles.aide}>Sur quelles cases porte le total ?</Text>
                <View style={styles.chipsWrap}>
                  <TouchableOpacity
                    style={[styles.chip, bonusSection === null && styles.chipActif]}
                    onPress={() => setBonusSection(null)}
                  >
                    <Text
                      style={[styles.chipTexte, bonusSection === null && styles.chipTexteActif]}
                    >
                      Toutes les cases
                    </Text>
                  </TouchableOpacity>
                  {sectionsDispo.map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[styles.chip, bonusSection === s && styles.chipActif]}
                      onPress={() => setBonusSection(s)}
                    >
                      <Text style={[styles.chipTexte, bonusSection === s && styles.chipTexteActif]}>
                        {s}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={[styles.ligne, { marginTop: 12 }]}>
                  <Champ label="Seuil à atteindre" styles={styles} style={{ flex: 1 }} obligatoire>
                    <TextInput
                      style={styles.input}
                      value={bonusSeuil}
                      onChangeText={(t) => {
                        setBonusSeuil(t);
                        if (erreurBonus) setErreurBonus(null);
                      }}
                      keyboardType="number-pad"
                      placeholder="63"
                      placeholderTextColor={colors.placeholder}
                    />
                  </Champ>
                  <Champ label="Points gagnés" styles={styles} style={{ flex: 1 }} obligatoire>
                    <TextInput
                      style={styles.input}
                      value={bonusPoints}
                      onChangeText={(t) => {
                        setBonusPoints(t);
                        if (erreurBonus) setErreurBonus(null);
                      }}
                      keyboardType="number-pad"
                      placeholder="35"
                      placeholderTextColor={colors.placeholder}
                    />
                  </Champ>
                </View>

                {erreurBonus && <Text style={styles.erreur}>{erreurBonus}</Text>}
              </View>
            )}
          </Champ>
        )}

        <Section
          titre="Extensions et personnages"
          sousTitre="Optionnel — pour les jeux à modules ou à rôles cachés"
          ouvert={avanceOuvert}
          onToggle={() => setAvanceOuvert((v) => !v)}
          styles={styles}
        >
          <Champ label="Extensions (une par ligne)" styles={styles} aide="extensions">
            <Text style={styles.aide}>
              Elles se cochent sur la fiche du jeu, avant de lancer une partie. Laisse vide si le jeu
              n&apos;en a pas.
            </Text>
            <TextInput
              style={[styles.input, styles.multi]}
              value={extensionsTexte}
              onChangeText={setExtensionsTexte}
              placeholder={"Mauvais jusqu'à l'os\nLa Fin est Proche"}
              placeholderTextColor={colors.placeholder}
              multiline
            />
          </Champ>

          <Champ label="Personnages (un par ligne)" styles={styles} aide="extensions">
            <Text style={styles.aide}>
              Un nom, puis, séparés par une barre verticale : son origine, son objectif,
              l&apos;extension qui l&apos;apporte, et l&apos;adresse d&apos;une photo ou d&apos;un logo.
              Seul le nom est obligatoire. Sans photo, une pastille colorée à son initiale s&apos;affiche.
            </Text>
            <TextInput
              style={[styles.input, styles.multiGrand]}
              value={rolesTexte}
              onChangeText={setRolesTexte}
              placeholder={
                "Maléfique | La Belle au bois dormant | Poser une Malédiction sur ses 4 lieux\nHadès | Hercule | Réunir 3 Titans | Mauvais jusqu'à l'os"
              }
              placeholderTextColor={colors.placeholder}
              multiline
            />
            {inconnues.length > 0 && (
              <Text style={styles.avertissement}>
                {inconnues.length === 1
                  ? `L'extension « ${inconnues[0]} » n'est pas déclarée ci-dessus : ses personnages ne s'afficheront jamais.`
                  : `Ces extensions ne sont pas déclarées ci-dessus : ${inconnues.map((e) => `« ${e} »`).join(", ")}. Leurs personnages ne s'afficheront jamais.`}
              </Text>
            )}
          </Champ>

          <Champ label="Rôles partageables ?" styles={styles} aide="extensions">
            <TouchableOpacity
              style={styles.bonusBascule}
              activeOpacity={0.7}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: rolesPartageables }}
              accessibilityLabel="Un même rôle peut être attribué à plusieurs joueurs"
              onPress={() => setRolesPartageables((v) => !v)}
            >
              <View
                style={[styles.case, rolesPartageables && styles.caseActive]}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                {rolesPartageables && <Text style={styles.caseCoche}>✓</Text>}
              </View>
              <Text style={styles.bonusTexte}>
                Un même rôle peut être donné à plusieurs joueurs (ex. L&apos;Imposteur : plusieurs
                citoyens, un imposteur). Sinon, chaque rôle n&apos;est attribuable qu&apos;à une seule
                personne.
              </Text>
            </TouchableOpacity>
          </Champ>
        </Section>

        <TouchableOpacity style={styles.bouton} onPress={enregistrer}>
          <Text style={styles.boutonTexte}>
            {modeEdition ? "Enregistrer les modifications" : "Ajouter le jeu"}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={collageOuvert}
        transparent
        animationType="fade"
        onRequestClose={() => setCollageOuvert(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
        <TouchableOpacity
          style={styles.fond}
          activeOpacity={1}
          onPress={() => setCollageOuvert(false)}
        >
          <TouchableOpacity style={styles.feuille} activeOpacity={1}>
            <ScrollView
              style={{ flexShrink: 1 }}
              contentContainerStyle={{ paddingBottom: 4 }}
              keyboardShouldPersistTaps="handled"
            >
            <Text style={styles.feuilleTitre}>Coller un jeu</Text>
            <Text style={styles.aide}>
              Colle ici le texte d&apos;un jeu partagé. Le formulaire sera rempli, tu pourras tout
              relire avant de valider.
            </Text>
            <TextInput
              style={[styles.input, styles.multiGrand]}
              value={texteColle}
              onChangeText={setTexteColle}
              placeholder={'{ "meepMeepJeu": 1, "jeu": { … } }'}
              placeholderTextColor={colors.placeholder}
              multiline
              autoCapitalize="none"
              autoCorrect={false}
            />
            {erreurCollage && <Text style={styles.erreur}>{erreurCollage}</Text>}
            </ScrollView>
            <View style={styles.actionsModal}>
              <TouchableOpacity style={styles.annuler} onPress={() => setCollageOuvert(false)}>
                <Text style={styles.annulerTexte}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.valider} onPress={collerJeu}>
                <Text style={styles.validerTexte}>Remplir le formulaire</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// Bloc repliable regroupant des champs secondaires, pour alléger le formulaire.
function Section({
  titre,
  sousTitre,
  ouvert,
  onToggle,
  styles,
  children,
}: {
  titre: string;
  sousTitre?: string;
  ouvert: boolean;
  onToggle: () => void;
  styles: ReturnType<typeof makeStyles>;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <TouchableOpacity
        style={styles.sectionHead}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{ expanded: ouvert }}
        accessibilityLabel={titre}
        accessibilityHint={ouvert ? "Réduire la section" : "Déployer la section"}
        onPress={onToggle}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitre}>{titre}</Text>
          {sousTitre ? <Text style={styles.sectionSousTitre}>{sousTitre}</Text> : null}
        </View>
        <Text
          style={[styles.sectionChevron, { transform: [{ rotate: ouvert ? "90deg" : "0deg" }] }]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          ▸
        </Text>
      </TouchableOpacity>
      {ouvert && <View style={styles.sectionCorps}>{children}</View>}
    </View>
  );
}

function ModeChoix({
  titre,
  detail,
  actif,
  onPress,
  styles,
}: {
  titre: string;
  detail: string;
  actif: boolean;
  onPress: () => void;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <TouchableOpacity
      style={[styles.modeCarte, actif && styles.modeCarteActive]}
      activeOpacity={0.8}
      accessibilityRole="radio"
      accessibilityState={{ checked: actif }}
      accessibilityLabel={titre}
      accessibilityHint={detail}
      onPress={onPress}
    >
      <View
        style={[styles.radio, actif && styles.radioActif]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {actif && <View style={styles.radioPoint} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.modeTitre, actif && styles.modeTitreActif]}>{titre}</Text>
        <Text style={styles.modeDetail}>{detail}</Text>
      </View>
    </TouchableOpacity>
  );
}

function Champ({
  label,
  children,
  styles,
  style,
  obligatoire,
  aide,
}: {
  label: string;
  children: ReactNode;
  styles: ReturnType<typeof makeStyles>;
  style?: object;
  obligatoire?: boolean;
  /** Section de l'écran d'aide à ouvrir, si ce champ mérite une explication. */
  aide?: CleAide;
}) {
  const router = useRouter();
  return (
    <View style={[styles.champ, style]}>
      <View style={styles.labelLigne}>
        <Text style={styles.label}>
          {label}
          {obligatoire && <Text style={styles.asterisque}> *</Text>}
        </Text>
        {aide && (
          <TouchableOpacity
            style={styles.aideBulle}
            hitSlop={10}
            accessibilityLabel={`Aide : ${label}`}
            onPress={() => router.push({ pathname: "/aide", params: { section: aide } })}
          >
            <Text style={styles.aideBulleTexte}>?</Text>
          </TouchableOpacity>
        )}
      </View>
      {children}
    </View>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    page: { flex: 1, backgroundColor: c.page },
    contenu: { padding: 16, paddingBottom: 40 },
    raccourciPrincipal: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: c.accent,
      borderRadius: 14,
      paddingVertical: 16,
      paddingHorizontal: 16,
      marginBottom: 10,
    },
    raccourciTexte: { flex: 1 },
    raccourciBadge: {
      alignSelf: "flex-start",
      backgroundColor: c.onAccent,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 2,
      marginBottom: 8,
    },
    raccourciBadgeTexte: {
      fontSize: 11,
      fontWeight: "700",
      color: c.accent,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    raccourciPrincipalTitre: { fontSize: 17, fontWeight: "700", color: c.onAccent },
    raccourciPrincipalDetail: {
      fontSize: 13,
      color: c.onAccent,
      opacity: 0.9,
      marginTop: 3,
      lineHeight: 18,
    },
    raccourciPrincipalChevron: { fontSize: 20, color: c.onAccent },
    raccourciSecondaire: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      backgroundColor: c.surfaceAlt,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 14,
      marginBottom: 4,
    },
    raccourciSecondaireTexte: { fontSize: 14, fontWeight: "600", color: c.textSecondary },
    raccourciSecondaireChevron: { fontSize: 14, color: c.textMuted },
    separateur: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 16 },
    separateurTrait: { flex: 1, height: 1, backgroundColor: c.border },
    separateurTexte: { fontSize: 12, color: c.textMuted },
    blocTitre: {
      fontSize: 12,
      fontWeight: "700",
      color: c.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginTop: 6,
      marginBottom: 12,
    },
    section: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      backgroundColor: c.surface,
      marginBottom: 16,
      overflow: "hidden",
    },
    sectionHead: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 14,
      paddingHorizontal: 14,
    },
    sectionTitre: { fontSize: 15, fontWeight: "600", color: c.textPrimary },
    sectionSousTitre: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    sectionChevron: { fontSize: 16, color: c.textMuted },
    sectionCorps: {
      paddingHorizontal: 14,
      paddingBottom: 4,
      borderTopWidth: 1,
      borderTopColor: c.border,
      paddingTop: 14,
    },
    champ: { marginBottom: 14 },
    ligne: { flexDirection: "row", gap: 12 },
    labelLigne: { flexDirection: "row", alignItems: "center", gap: 8 },
    aideBulle: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: c.accentSoft,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 6,
    },
    aideBulleTexte: { fontSize: 12, fontWeight: "700", color: c.accentText },
    label: { fontSize: 13, fontWeight: "600", color: c.textSecondary, marginBottom: 6 },
    asterisque: { color: c.accentText, fontSize: 14, fontWeight: "700" },
    input: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      color: c.textPrimary,
    },
    imageLigne: { flexDirection: "row", gap: 12, alignItems: "center" },
    apercu: { width: 84, height: 84, borderRadius: 12, backgroundColor: c.surfaceAlt },
    apercuVide: {
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: c.borderStrong,
    },
    apercuVideTexte: { fontSize: 12, color: c.textMuted },
    imageBouton: {
      backgroundColor: c.accentSoft,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: "center",
    },
    imageBoutonTexte: { color: c.accentText, fontWeight: "600", fontSize: 14 },
    imageRetirer: { color: c.danger, fontSize: 13, fontWeight: "600", textAlign: "center" },
    inputErreur: { borderColor: c.danger, borderWidth: 1.5 },
    erreur: { color: c.danger, fontSize: 13, marginTop: 6 },
    avertissement: {
      backgroundColor: c.warningSoft,
      color: c.warningText,
      fontSize: 12,
      lineHeight: 17,
      borderRadius: 10,
      padding: 10,
      marginTop: 8,
    },
    multi: { minHeight: 60, textAlignVertical: "top" },
    multiGrand: { minHeight: 110, textAlignVertical: "top" },
    aide: { fontSize: 12, color: c.textMuted, marginBottom: 8, lineHeight: 17 },
    bonusBascule: { flexDirection: "row", alignItems: "center", gap: 10 },
    bonusTexte: { flex: 1, fontSize: 14, color: c.textSecondary },
    bonusBloc: { marginTop: 12 },
    case: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: c.borderStrong,
      alignItems: "center",
      justifyContent: "center",
    },
    caseActive: { backgroundColor: c.accent, borderColor: c.accent },
    caseCoche: { color: c.onAccent, fontSize: 13, fontWeight: "700" },
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
    modeColonne: { gap: 8 },
    modeCarte: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      padding: 12,
    },
    modeCarteActive: { borderColor: c.accent, borderWidth: 2, backgroundColor: c.accentSoft },
    radio: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: c.borderStrong,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
    },
    radioActif: { borderColor: c.accent },
    radioPoint: { width: 10, height: 10, borderRadius: 5, backgroundColor: c.accent },
    modeTitre: { fontSize: 15, fontWeight: "600", color: c.textPrimary },
    modeTitreActif: { color: c.accentText },
    modeDetail: { fontSize: 12, color: c.textMuted, marginTop: 2, lineHeight: 16 },
    sensLigne: { flexDirection: "row", gap: 10 },
    sensChip: {
      flex: 1,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surfaceAlt,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: "center",
    },
    sensChipActif: { backgroundColor: c.accent, borderColor: c.accent },
    sensTexte: { fontSize: 14, color: c.textSecondary, fontWeight: "600" },
    sensTexteActif: { color: c.onAccent },
    bouton: {
      backgroundColor: c.accent,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
      marginTop: 8,
    },
    boutonTexte: { color: c.onAccent, fontSize: 16, fontWeight: "600" },

    fond: {
      flex: 1,
      backgroundColor: c.ombre,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 24,
    },
    feuille: {
      width: "100%",
      maxWidth: 460,
      maxHeight: "85%",
      backgroundColor: c.surface,
      borderRadius: 18,
      padding: 18,
    },
    feuilleTitre: { fontSize: 18, fontWeight: "700", color: c.textPrimary, marginBottom: 6 },
    actionsModal: { flexDirection: "row", gap: 10, marginTop: 16 },
    annuler: {
      flex: 1,
      paddingVertical: 13,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.borderStrong,
      alignItems: "center",
    },
    annulerTexte: { fontSize: 15, fontWeight: "600", color: c.textSecondary },
    valider: {
      flex: 2,
      paddingVertical: 13,
      borderRadius: 12,
      backgroundColor: c.accent,
      alignItems: "center",
    },
    validerTexte: { fontSize: 15, fontWeight: "600", color: c.onAccent },
  });
}
