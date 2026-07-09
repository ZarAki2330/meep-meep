// db/jeux.ts
// Jeux ajoutés par l'utilisateur (stockés en base locale).

import { type BonusGrille, type CategorieScore, type Jeu } from "@/data/jeux";
import { getDb } from "./database";

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
};

function parseJson<T>(texte: string | null, defaut: T): T {
  if (!texte) return defaut;
  try {
    return JSON.parse(texte) as T;
  } catch {
    return defaut;
  }
}

function rowVersJeu(r: Row): Jeu {
  const mode = r.score_mode;
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
    scoreMode:
      mode === "grille"
        ? "grille"
        : mode === "objectif"
          ? "objectif"
          : mode === "manches"
            ? "manches"
            : "compteur",
    categories: parseJson<CategorieScore[] | undefined>(r.categories, undefined),
    bonus: parseJson<BonusGrille | undefined>(r.bonus, undefined),
    equipes: r.equipes === 1,
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
      (id, nom, description, joueurs_min, joueurs_max, duree_min, age_min, categorie, image, regles, score_victoire, seuil_fin, score_mode, categories, bonus, equipes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
    ],
  );
}

export async function supprimerJeu(id: string) {
  const db = await getDb();
  await db.runAsync("DELETE FROM jeux WHERE id = ?", [id]);
}
