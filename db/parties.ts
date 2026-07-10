// db/parties.ts
// Sauvegarde locale des parties terminées (SQLite, hors-ligne).

import { type StatsJeu } from "@/lib/tri-catalogue";

import { getDb } from "./database";

/** Une ligne de score : un joueur, ou une équipe avec ses membres. */
export type JoueurScore = { nom: string; score: number; role?: string; membres?: string[] };

/**
 * Issue d'une partie coopérative : toute la table gagne ou perd ensemble.
 * Vaut null pour les parties compétitives, où c'est « gagnant » qui tranche
 * (une chaîne vide y signifiant une égalité).
 */
export type Resultat = "victoire" | "defaite";

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
  note: string | null; // commentaire libre
  evaluation: number | null; // 1 à 5 étoiles
  resultat: Resultat | null; // renseigné uniquement en coopératif
};

export async function enregistrerPartie(p: {
  jeuId: string;
  jeuNom: string;
  joueurs: JoueurScore[];
  gagnant: string;
  scoreGagnant: number;
  duree?: number;
  resultat?: Resultat;
}): Promise<number> {
  const db = await getDb();
  const res = await db.runAsync(
    "INSERT INTO parties (jeu_id, jeu_nom, date, nb_joueurs, gagnant, score_gagnant, details, duree, resultat) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [
      p.jeuId,
      p.jeuNom,
      new Date().toISOString(),
      p.joueurs.length,
      p.gagnant,
      p.scoreGagnant,
      JSON.stringify(p.joueurs),
      p.duree && p.duree > 0 ? Math.round(p.duree) : null,
      p.resultat ?? null,
    ],
  );
  // Mémorise les noms des joueurs pour les réutiliser ensuite.
  for (const j of p.joueurs) {
    const noms = j.membres?.length ? j.membres : [j.nom];
    for (const nom of noms.map((n) => n.trim())) {
      if (nom) await db.runAsync("INSERT OR IGNORE INTO joueurs (nom) VALUES (?)", [nom]);
    }
  }

  return res.lastInsertRowId;
}

/** Note et commentaire libre sur une partie terminée. */
export async function noterPartie(id: number, evaluation: number | null, note: string) {
  const db = await getDb();
  await db.runAsync("UPDATE parties SET evaluation = ?, note = ? WHERE id = ?", [
    evaluation && evaluation > 0 ? evaluation : null,
    note.trim() || null,
    id,
  ]);
}

export async function listerParties(): Promise<PartieEnregistree[]> {
  const db = await getDb();
  return db.getAllAsync<PartieEnregistree>("SELECT * FROM parties ORDER BY date DESC");
}

/** Pour chaque jeu : combien de parties, et la date de la dernière. Sert au tri du catalogue. */
export async function statistiquesParJeu(): Promise<Record<string, StatsJeu>> {
  const db = await getDb();
  const lignes = await db.getAllAsync<{ jeu_id: string; parties: number; derniere: string }>(
    "SELECT jeu_id, COUNT(*) AS parties, MAX(date) AS derniere FROM parties GROUP BY jeu_id",
  );
  const stats: Record<string, StatsJeu> = {};
  for (const l of lignes) {
    stats[l.jeu_id] = { parties: l.parties, derniere: l.derniere };
  }
  return stats;
}

/** Corrige une partie déjà enregistrée (scores, vainqueur, ou issue en coopératif). */
export async function modifierPartie(
  id: number,
  joueurs: JoueurScore[],
  gagnant: string,
  scoreGagnant: number,
  resultat: Resultat | null = null,
) {
  const db = await getDb();
  await db.runAsync(
    "UPDATE parties SET details = ?, gagnant = ?, score_gagnant = ?, nb_joueurs = ?, resultat = ? WHERE id = ?",
    [JSON.stringify(joueurs), gagnant, scoreGagnant, joueurs.length, resultat, id],
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
