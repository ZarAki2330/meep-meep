// db/jeux.ts
// Les jeux du catalogue. Tous vivent ici, qu'ils viennent de la bibliothèque,
// de BoardGameGeek, d'un jeu collé ou du formulaire.

import { BIBLIOTHEQUE, IDS_AMORCAGE } from "@/data/bibliotheque";
import { type BonusGrille, type CategorieScore, type Jeu, type RoleJeu } from "@/data/jeux";
import { ecrireMeta, getDb, lireMeta } from "./database";

type Row = {
  id: string;
  nom: string;
  description: string;
  joueurs_min: number;
  joueurs_max: number;
  duree_min: number;
  age_min: number;
  categorie: string;
  editeur: string | null;
  image: string;
  regles: string;
  regles_url: string | null;
  score_victoire: string;
  seuil_fin: number | null;
  score_mode: string | null;
  categories: string | null;
  bonus: string | null;
  equipes: number | null;
  extensions: string | null;
  roles: string | null;
  roles_partageables: number | null;
  jeu_type: string | null;
  jeu_parent: string | null;
};

const TYPES: NonNullable<Jeu["type"]>[] = ["jeu", "extension", "edition"];

const MODES: Jeu["scoreMode"][] = ["compteur", "objectif", "grille", "manches", "cooperatif"];

function parseJson<T>(texte: string | null, defaut: T): T {
  if (!texte) return defaut;
  try {
    return JSON.parse(texte) as T;
  } catch {
    return defaut;
  }
}

/** Une liste vide en base ne se distingue pas d'une absence : on rend undefined. */
function listeOuRien<T>(liste: T[] | undefined): T[] | undefined {
  return liste && liste.length > 0 ? liste : undefined;
}

function rowVersJeu(r: Row): Jeu {
  const mode = MODES.find((m) => m === r.score_mode) ?? "compteur";
  return {
    id: r.id,
    nom: r.nom,
    description: r.description,
    joueursMin: r.joueurs_min,
    joueursMax: r.joueurs_max,
    dureeMin: r.duree_min,
    ageMin: r.age_min,
    categorie: r.categorie,
    editeur: r.editeur ?? undefined,
    image: r.image,
    regles: parseJson<string[]>(r.regles, []),
    reglesUrl: r.regles_url ?? undefined,
    scoreVictoire: r.score_victoire === "min" ? "min" : "max",
    seuilFin: r.seuil_fin ?? undefined,
    scoreMode: mode,
    categories: listeOuRien(parseJson<CategorieScore[]>(r.categories, [])),
    bonus: parseJson<BonusGrille | undefined>(r.bonus, undefined),
    equipes: r.equipes === 1,
    extensions: listeOuRien(parseJson<string[]>(r.extensions, [])),
    roles: listeOuRien(parseJson<RoleJeu[]>(r.roles, [])),
    rolesPartageables: r.roles_partageables === 1,
    type: TYPES.find((t) => t === r.jeu_type) ?? "jeu",
    jeuParent: r.jeu_parent ?? undefined,
  };
}

export async function listerJeux(): Promise<Jeu[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>("SELECT * FROM jeux ORDER BY nom COLLATE NOCASE");
  return rows.map(rowVersJeu);
}

export async function ajouterJeu(j: Jeu) {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO jeux
      (id, nom, description, joueurs_min, joueurs_max, duree_min, age_min, categorie, editeur, image, regles, regles_url, score_victoire, seuil_fin, score_mode, categories, bonus, equipes, extensions, roles, roles_partageables, jeu_type, jeu_parent)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      j.id,
      j.nom,
      j.description,
      j.joueursMin,
      j.joueursMax,
      j.dureeMin,
      j.ageMin,
      j.categorie,
      j.editeur ?? null,
      j.image ?? "",
      JSON.stringify(j.regles),
      j.reglesUrl ?? null,
      j.scoreVictoire,
      j.seuilFin ?? null,
      j.scoreMode ?? "compteur",
      j.categories ? JSON.stringify(j.categories) : null,
      j.bonus ? JSON.stringify(j.bonus) : null,
      j.equipes ? 1 : 0,
      j.extensions ? JSON.stringify(j.extensions) : null,
      j.roles ? JSON.stringify(j.roles) : null,
      j.rolesPartageables ? 1 : 0,
      j.type ?? "jeu",
      j.jeuParent ?? null,
    ],
  );
}

export async function supprimerJeu(id: string) {
  const db = await getDb();
  await db.runAsync("DELETE FROM jeux WHERE id = ?", [id]);
}

/**
 * Met à jour les métadonnées « gérées par le catalogue » — l'éditeur, la photo et
 * le lien des règles officielles — des jeux déjà en base, à partir du catalogue
 * distant. On ne touche qu'à ces champs, et seulement pour les jeux dont
 * l'identifiant existe dans le catalogue : les jeux ajoutés à la main (identifiant
 * « perso… ») ne sont jamais concernés, et le reste de la fiche (règles,
 * personnages, mode de score…) reste intact.
 * Renvoie le nombre de jeux effectivement modifiés.
 */
export async function synchroniserDepuisCatalogue(catalogue: Jeu[]): Promise<number> {
  const db = await getDb();
  const existants = await db.getAllAsync<{
    id: string;
    editeur: string | null;
    image: string;
    regles_url: string | null;
  }>("SELECT id, editeur, image, regles_url FROM jeux");
  const parId = new Map(existants.map((r) => [r.id, r]));

  let modifies = 0;
  for (const j of catalogue) {
    const actuel = parId.get(j.id);
    if (!actuel) continue;
    const editeur = j.editeur ?? null;
    const image = j.image ?? "";
    const reglesUrl = j.reglesUrl ?? null;
    // Rien à écrire si les trois champs sont déjà à jour.
    if (
      (actuel.editeur ?? null) === editeur &&
      (actuel.image ?? "") === image &&
      (actuel.regles_url ?? null) === reglesUrl
    )
      continue;
    await db.runAsync("UPDATE jeux SET editeur = ?, image = ?, regles_url = ? WHERE id = ?", [
      editeur,
      image,
      reglesUrl,
      j.id,
    ]);
    modifies++;
  }
  return modifies;
}

const CLE_AMORCAGE = "amorcage_bibliotheque";

/** Dépose en base les jeux autrefois codés en dur, sans condition. */
export async function insererJeuxHistoriques() {
  for (const id of IDS_AMORCAGE) {
    const jeu = BIBLIOTHEQUE.find((j) => j.id === id);
    if (jeu) await ajouterJeu(jeu);
  }
}

/**
 * Au tout premier lancement, on dépose en base les jeux autrefois codés en dur.
 * Ils gardent leur identifiant : les favoris et l'historique d'avant restent valables.
 * Le drapeau garantit qu'un jeu supprimé ne revient pas au lancement suivant.
 */
export async function amorcerBibliotheque() {
  if (await lireMeta(CLE_AMORCAGE)) return;
  await insererJeuxHistoriques();
  await ecrireMeta(CLE_AMORCAGE, "1");
}
