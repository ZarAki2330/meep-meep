// db/favoris.ts
// Jeux marqués comme favoris (natifs comme ajoutés).

import { getDb } from "./database";

export async function listerFavoris(): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ jeu_id: string }>("SELECT jeu_id FROM favoris");
  return rows.map((r) => r.jeu_id);
}

export async function definirFavori(jeuId: string, actif: boolean) {
  const db = await getDb();
  if (actif) {
    await db.runAsync("INSERT OR IGNORE INTO favoris (jeu_id) VALUES (?)", [jeuId]);
  } else {
    await db.runAsync("DELETE FROM favoris WHERE jeu_id = ?", [jeuId]);
  }
}
