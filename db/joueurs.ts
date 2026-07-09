// db/joueurs.ts
// Liste des joueurs récurrents (pour ne pas retaper les noms).

import { getDb } from "./database";

export type JoueurEnregistre = { id: number; nom: string };

export async function listerJoueurs(): Promise<JoueurEnregistre[]> {
  const db = await getDb();
  return db.getAllAsync<JoueurEnregistre>("SELECT * FROM joueurs ORDER BY nom COLLATE NOCASE");
}

export async function ajouterJoueur(nom: string) {
  const n = nom.trim();
  if (!n) return;
  const db = await getDb();
  await db.runAsync("INSERT OR IGNORE INTO joueurs (nom) VALUES (?)", [n]);
}

export async function supprimerJoueur(id: number) {
  const db = await getDb();
  await db.runAsync("DELETE FROM joueurs WHERE id = ?", [id]);
}
