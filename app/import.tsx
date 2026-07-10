// app/import.tsx — ajouter un jeu manuellement (hors-ligne)

import * as FileSystemLegacy from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
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
import { useJeux } from "@/context/jeux";
import { useTheme } from "@/context/theme";
import { type BonusGrille, type CategorieScore, type Jeu } from "@/data/jeux";
import { ajouterJeu } from "@/db/jeux";
import { texteVersJeu, type JeuSansId } from "@/lib/jeu-partage";

type Mode = "compteur" | "objectif" | "grille" | "manches" | "cooperatif";

function nombre(s: string, defaut: number): number {
  const n = parseInt(s, 10);
  return isNaN(n) ? defaut : n;
}

// Reconstruit le texte des cases à partir des catégories enregistrées.
function categoriesVersTexte(cats: CategorieScore[]): string {
  const lignes: string[] = [];
  let sectionCourante: string | undefined;
  for (const c of cats) {
    if (c.section !== sectionCourante) {
      sectionCourante = c.section;
      if (sectionCourante) lignes.push(`# ${sectionCourante}`);
    }
    lignes.push(c.aide ? `${c.label} | ${c.aide}` : c.label);
  }
  return lignes.join("\n");
}

// "# Partie haute" ouvre une section ; "Full | 25" définit une case.
function parserCategories(texte: string): CategorieScore[] {
  const cats: CategorieScore[] = [];
  let section: string | undefined;
  let i = 0;
  for (const ligne of texte.split("\n")) {
    const l = ligne.trim();
    if (!l) continue;
    if (l.startsWith("#")) {
      section = l.slice(1).trim() || undefined;
      continue;
    }
    const parts = l.split("|").map((s) => s.trim());
    const label = parts[0];
    if (!label) continue;
    cats.push({ cle: `c${i++}`, label, aide: parts[1] || undefined, section });
  }
  return cats;
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

  const [nom, setNom] = useState("");
  const [categorie, setCategorie] = useState("");
  const [jMin, setJMin] = useState("2");
  const [jMax, setJMax] = useState("4");
  const [duree, setDuree] = useState("30");
  const [age, setAge] = useState("8");
  const [image, setImage] = useState("");
  const [description, setDescription] = useState("");
  const [regles, setRegles] = useState("");
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
  const [prerempli, setPrerempli] = useState(false);
  const [collageOuvert, setCollageOuvert] = useState(false);
  const [texteColle, setTexteColle] = useState("");
  const [erreurCollage, setErreurCollage] = useState<string | null>(null);

  // Choisit une photo dans la galerie et la copie dans le stockage de l'app,
  // sinon l'image disparaîtrait avec le cache du téléphone.
  async function choisirImage() {
    setErreurImage(null);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setErreurImage("Autorise l'accès à tes photos pour choisir une image.");
        return;
      }
      // Pas de recadrage : sur Android, l'écran de recadrage natif masque
      // parfois son bouton de validation.
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        selectionLimit: 1,
        quality: 0.8,
      });
      if (res.canceled || !res.assets?.[0]) return;

      const dossier = `${FileSystemLegacy.documentDirectory}images-jeux/`;
      await FileSystemLegacy.makeDirectoryAsync(dossier, { intermediates: true }).catch(() => {});
      const destination = `${dossier}${Date.now()}.jpg`;
      await FileSystemLegacy.copyAsync({ from: res.assets[0].uri, to: destination });
      setImage(destination);
    } catch (e) {
      setErreurImage(e instanceof Error ? e.message : String(e));
    }
  }

  // Remplit tous les champs à partir d'un jeu (modification, ou jeu collé).
  const appliquerJeu = useCallback((j: JeuSansId) => {
    setNom(j.nom ?? "");
    setCategorie(j.categorie ?? "");
    setJMin(String(j.joueursMin ?? 2));
    setJMax(String(j.joueursMax ?? 4));
    setDuree(String(j.dureeMin ?? 30));
    setAge(String(j.ageMin ?? 8));
    setImage(j.image ?? "");
    setDescription(j.description ?? "");
    setRegles((j.regles ?? []).join("\n"));
    setSens(j.scoreVictoire === "min" ? "min" : "max");
    setSeuil(j.seuilFin ? String(j.seuilFin) : "");
    setEquipes(j.equipes === true);
    setMode(j.scoreMode ?? "compteur");

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
      image: image.trim(),
      regles: regles
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean),
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
    };
    await ajouterJeu(jeu);
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
            <TouchableOpacity style={styles.bggBouton} onPress={() => router.push("/bgg")}>
              <Text style={styles.bggTexte}>Chercher sur BoardGameGeek</Text>
              <Text style={styles.bggChevron}>▸</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.bggBouton} onPress={() => setCollageOuvert(true)}>
              <Text style={styles.bggTexte}>Coller un jeu partagé</Text>
              <Text style={styles.bggChevron}>▸</Text>
            </TouchableOpacity>
          </>
        )}

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

        <Champ label="Jeu en équipes ?" styles={styles}>
          <TouchableOpacity
            style={styles.bonusBascule}
            activeOpacity={0.7}
            onPress={() => setEquipes((e) => !e)}
          >
            <View style={[styles.case, equipes && styles.caseActive]}>
              {equipes && <Text style={styles.caseCoche}>✓</Text>}
            </View>
            <Text style={styles.bonusTexte}>
              Le score se compte par équipe (belote, Codenames…). Le nombre de joueurs ci-dessus
              correspond alors au nombre d&apos;équipes.
            </Text>
          </TouchableOpacity>
        </Champ>

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

        <Champ label="Comment se compte le score ?" styles={styles}>
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
                onPress={() => setSens("max")}
              >
                <Text style={[styles.sensTexte, sens === "max" && styles.sensTexteActif]}>
                  Le plus de points
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sensChip, sens === "min" && styles.sensChipActif]}
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
          <Champ label="Cases de la feuille (une par ligne)" styles={styles} obligatoire>
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
          <Champ label="Bonus (optionnel)" styles={styles}>
            <TouchableOpacity
              style={styles.bonusBascule}
              activeOpacity={0.7}
              onPress={() => {
                setBonusActif((b) => !b);
                setErreurBonus(null);
              }}
            >
              <View style={[styles.case, bonusActif && styles.caseActive]}>
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
        <TouchableOpacity
          style={styles.fond}
          activeOpacity={1}
          onPress={() => setCollageOuvert(false)}
        >
          <TouchableOpacity style={styles.feuille} activeOpacity={1}>
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
      </Modal>
    </KeyboardAvoidingView>
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
      onPress={onPress}
    >
      <View style={[styles.radio, actif && styles.radioActif]}>
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
}: {
  label: string;
  children: ReactNode;
  styles: ReturnType<typeof makeStyles>;
  style?: object;
  obligatoire?: boolean;
}) {
  return (
    <View style={[styles.champ, style]}>
      <Text style={styles.label}>
        {label}
        {obligatoire && <Text style={styles.asterisque}> *</Text>}
      </Text>
      {children}
    </View>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    page: { flex: 1, backgroundColor: c.page },
    contenu: { padding: 16, paddingBottom: 40 },
    bggBouton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: c.accentSoft,
      borderRadius: 12,
      paddingVertical: 13,
      paddingHorizontal: 14,
      marginBottom: 18,
    },
    bggTexte: { fontSize: 14, fontWeight: "600", color: c.accentText },
    bggChevron: { fontSize: 14, color: c.accentText },
    champ: { marginBottom: 14 },
    ligne: { flexDirection: "row", gap: 12 },
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
