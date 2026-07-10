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
  image: string;
  regles: string;
  score_victoire: string;
  seuil_fin: number | null;
  score_mode: string | null;
  categories: string | null;
  bonus: string | null;
  equipes: number | null;
  extensions: string | null;
  roles: string | null;
};

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
    image: r.image,
    regles: parseJson<string[]>(r.regles, []),
    scoreVictoire: r.score_victoire === "min" ? "min" : "max",
    seuilFin: r.seuil_fin ?? undefined,
    scoreMode: mode,
    categories: listeOuRien(parseJson<CategorieScore[]>(r.categories, [])),
    bonus: parseJson<BonusGrille | undefined>(r.bonus, undefined),
    equipes: r.equipes === 1,
    extensions: listeOuRien(parseJson<string[]>(r.extensions, [])),
    roles: listeOuRien(parseJson<RoleJeu[]>(r.roles, [])),
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
      (id, nom, description, joueurs_min, joueurs_max, duree_min, age_min, categorie, image, regles, score_victoire, seuil_fin, score_mode, categories, bonus, equipes, extensions, roles)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      j.id,
      j.nom,
      j.description,
      j.joueursMin,
      j.joueursMax,
      j.dureeMin,
      j.ageMin,
      j.categorie,
      j.image ?? "",
      JSON.stringify(j.regles),
      j.scoreVictoire,
      j.seuilFin ?? null,
      j.scoreMode ?? "compteur",
      j.categories ? JSON.stringify(j.categories) : null,
      j.bonus ? JSON.stringify(j.bonus) : null,
      j.equipes ? 1 : 0,
      j.extensions ? JSON.stringify(j.extensions) : null,
      j.roles ? JSON.stringify(j.roles) : null,
    ],
  );
}

export async function supprimerJeu(id: string) {
  const db = await getDb();
  await db.runAsync("DELETE FROM jeux WHERE id = ?", [id]);
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
