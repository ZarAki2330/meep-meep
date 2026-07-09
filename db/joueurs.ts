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

/**
 * Renomme un joueur partout : dans la liste et dans tout l'historique
 * (noms des participants et vainqueur). Si le nouveau nom existe déjà,
 * les deux joueurs sont fusionnés.
 */
export async function renommerJoueur(ancien: string, nouveau: string) {
  const a = ancien.trim();
  const n = nouveau.trim();
  if (!a || !n || a === n) return { parties: 0, fusion: false };

  const db = await getDb();
  const existant = await db.getFirstAsync<{ nom: string }>(
    "SELECT nom FROM joueurs WHERE nom = ? COLLATE NOCASE",
    [n],
  );
  const fusion = !!existant && existant.nom !== a;

  const lignes = await db.getAllAsync<{ id: number; gagnant: string; details: string }>(
    "SELECT id, gagnant, details FROM parties",
  );

  let partiesTouchees = 0;
  for (const l of lignes) {
    let joueurs: { nom: string; score: number; role?: string }[];
    try {
      joueurs = JSON.parse(l.details);
    } catch {
      continue;
    }
    const participe = joueurs.some((j) => j.nom === a);
    const etaitGagnant = l.gagnant === a;
    if (!participe && !etaitGagnant) continue;

    const majJoueurs = joueurs.map((j) => (j.nom === a ? { ...j, nom: n } : j));
    await db.runAsync("UPDATE parties SET details = ?, gagnant = ? WHERE id = ?", [
      JSON.stringify(majJoueurs),
      etaitGagnant ? n : l.gagnant,
      l.id,
    ]);
    partiesTouchees++;
  }

  await db.runAsync("DELETE FROM joueurs WHERE nom = ?", [a]);
  await db.runAsync("INSERT OR IGNORE INTO joueurs (nom) VALUES (?)", [n]);

  return { parties: partiesTouchees, fusion };
}
