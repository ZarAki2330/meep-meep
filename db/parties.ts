// db/parties.ts
// Sauvegarde locale des parties terminées (SQLite, hors-ligne).

import { getDb } from "./database";

/** Une ligne de score : un joueur, ou une équipe avec ses membres. */
export type JoueurScore = { nom: string; score: number; role?: string; membres?: string[] };

export type PartieEnregistree = {
  id: number;
  jeu_id: string;
  jeu_nom: string;
  date: string; // ISO
  nb_joueurs: number;
  gagnant: string;
  score_gagnant: number;
  details: string; // JSON de JoueurScore[]
  duree: number | null; // secondes
};

export async function enregistrerPartie(p: {
  jeuId: string;
  jeuNom: string;
  joueurs: JoueurScore[];
  gagnant: string;
  scoreGagnant: number;
  duree?: number;
}) {
  const db = await getDb();
  await db.runAsync(
    "INSERT INTO parties (jeu_id, jeu_nom, date, nb_joueurs, gagnant, score_gagnant, details, duree) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [
      p.jeuId,
      p.jeuNom,
      new Date().toISOString(),
      p.joueurs.length,
      p.gagnant,
      p.scoreGagnant,
      JSON.stringify(p.joueurs),
      p.duree && p.duree > 0 ? Math.round(p.duree) : null,
    ],
  );
  // Mémorise les noms des joueurs pour les réutiliser ensuite.
  for (const j of p.joueurs) {
    const nom = j.nom.trim();
    if (nom) await db.runAsync("INSERT OR IGNORE INTO joueurs (nom) VALUES (?)", [nom]);
  }
}

export async function listerParties(): Promise<PartieEnregistree[]> {
  const db = await getDb();
  return db.getAllAsync<PartieEnregistree>("SELECT * FROM parties ORDER BY date DESC");
}

/** Corrige une partie déjà enregistrée (scores et vainqueur). */
export async function modifierPartie(
  id: number,
  joueurs: JoueurScore[],
  gagnant: string,
  scoreGagnant: number,
) {
  const db = await getDb();
  await db.runAsync(
    "UPDATE parties SET details = ?, gagnant = ?, score_gagnant = ?, nb_joueurs = ? WHERE id = ?",
    [JSON.stringify(joueurs), gagnant, scoreGagnant, joueurs.length, id],
  );
  for (const j of joueurs) {
    const nom = j.nom.trim();
    if (nom) await db.runAsync("INSERT OR IGNORE INTO joueurs (nom) VALUES (?)", [nom]);
  }
}

export async function supprimerPartie(id: number) {
  const db = await getDb();
  await db.runAsync("DELETE FROM parties WHERE id = ?", [id]);
}
