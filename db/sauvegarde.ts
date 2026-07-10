// db/sauvegarde.ts
// Export et restauration de toutes les données locales.

import { getDb } from "./database";

export type Sauvegarde = {
  application: "meep-meep";
  version: number;
  date: string;
  parties: Record<string, unknown>[];
  joueurs: string[];
  jeux: Record<string, unknown>[];
  favoris: string[];
};

const COLONNES_PARTIES = [
  "jeu_id",
  "jeu_nom",
  "date",
  "nb_joueurs",
  "gagnant",
  "score_gagnant",
  "details",
  "duree",
  "note",
  "evaluation",
  "resultat",
];

const COLONNES_JEUX = [
  "id",
  "nom",
  "description",
  "joueurs_min",
  "joueurs_max",
  "duree_min",
  "age_min",
  "categorie",
  "image",
  "regles",
  "score_victoire",
  "seuil_fin",
  "score_mode",
  "categories",
  "bonus",
  "equipes",
];

export async function exporterDonnees(): Promise<Sauvegarde> {
  const db = await getDb();
  const parties = await db.getAllAsync<Record<string, unknown>>("SELECT * FROM parties");
  const joueurs = await db.getAllAsync<{ nom: string }>("SELECT nom FROM joueurs");
  const jeux = await db.getAllAsync<Record<string, unknown>>("SELECT * FROM jeux");
  const favoris = await db.getAllAsync<{ jeu_id: string }>("SELECT jeu_id FROM favoris");

  return {
    application: "meep-meep",
    version: 1,
    date: new Date().toISOString(),
    parties,
    joueurs: joueurs.map((j) => j.nom),
    jeux,
    favoris: favoris.map((f) => f.jeu_id),
  };
}

export function verifierSauvegarde(brut: unknown): Sauvegarde {
  const s = brut as Partial<Sauvegarde>;
  if (!s || s.application !== "meep-meep") {
    throw new Error("Ce fichier n'est pas une sauvegarde Meep Meep.");
  }
  if (!Array.isArray(s.parties) || !Array.isArray(s.jeux) || !Array.isArray(s.joueurs)) {
    throw new Error("Le fichier de sauvegarde est incomplet ou abîmé.");
  }
  return s as Sauvegarde;
}

export async function restaurerDonnees(s: Sauvegarde) {
  const db = await getDb();

  await db.execAsync(`
    DELETE FROM parties;
    DELETE FROM joueurs;
    DELETE FROM jeux;
    DELETE FROM favoris;
    DELETE FROM partie_en_cours;
  `);

  for (const p of s.parties) {
    const valeurs = COLONNES_PARTIES.map((c) => (p[c] ?? null) as never);
    await db.runAsync(
      `INSERT INTO parties (${COLONNES_PARTIES.join(", ")}) VALUES (${COLONNES_PARTIES.map(() => "?").join(", ")})`,
      valeurs,
    );
  }

  for (const nom of s.joueurs) {
    if (nom) await db.runAsync("INSERT OR IGNORE INTO joueurs (nom) VALUES (?)", [nom]);
  }

  for (const j of s.jeux) {
    const valeurs = COLONNES_JEUX.map((c) => (j[c] ?? null) as never);
    await db.runAsync(
      `INSERT OR REPLACE INTO jeux (${COLONNES_JEUX.join(", ")}) VALUES (${COLONNES_JEUX.map(() => "?").join(", ")})`,
      valeurs,
    );
  }

  for (const id of s.favoris ?? []) {
    if (id) await db.runAsync("INSERT OR IGNORE INTO favoris (jeu_id) VALUES (?)", [id]);
  }
}

export function resumeSauvegarde(s: Sauvegarde) {
  return `${s.parties.length} partie${s.parties.length > 1 ? "s" : ""}, ${s.joueurs.length} joueur${
    s.joueurs.length > 1 ? "s" : ""
  }, ${s.jeux.length} jeu${s.jeux.length > 1 ? "x" : ""} ajouté${s.jeux.length > 1 ? "s" : ""}`;
}
