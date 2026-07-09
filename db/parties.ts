// db/parties.ts
// Sauvegarde locale des parties terminées (SQLite, hors-ligne).

import { getDb } from "./database";

export type JoueurScore = { nom: string; score: number; role?: string };

export type PartieEnregistree = {
  id: number;
  jeu_id: string;
  jeu_nom: string;
  date: string; // ISO
  nb_joueurs: number;
  gagnant: string;
  score_gagnant: number;
  details: string; // JSON de JoueurScore[]
};

export async function enregistrerPartie(p: {
  jeuId: string;
  jeuNom: string;
  joueurs: JoueurScore[];
  gagnant: string;
  scoreGagnant: number;
}) {
  const db = await getDb();
  await db.runAsync(
    "INSERT INTO parties (jeu_id, jeu_nom, date, nb_joueurs, gagnant, score_gagnant, details) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [
      p.jeuId,
      p.jeuNom,
      new Date().toISOString(),
      p.joueurs.length,
      p.gagnant,
      p.scoreGagnant,
      JSON.stringify(p.joueurs),
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

export async function supprimerPartie(id: number) {
  const db = await getDb();
  await db.runAsync("DELETE FROM parties WHERE id = ?", [id]);
}
