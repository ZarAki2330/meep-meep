// db/partie-en-cours.ts
// Sauvegarde de l'état d'une partie non terminée, pour pouvoir la reprendre.

import { getDb } from "./database";

export async function sauvegarderEtat(jeuId: string, etat: unknown) {
  if (!jeuId) return;
  const db = await getDb();
  await db.runAsync(
    "INSERT OR REPLACE INTO partie_en_cours (jeu_id, date, etat) VALUES (?, ?, ?)",
    [jeuId, new Date().toISOString(), JSON.stringify(etat)],
  );
}

export async function chargerEtat<T>(jeuId: string): Promise<T | null> {
  if (!jeuId) return null;
  const db = await getDb();
  const ligne = await db.getFirstAsync<{ etat: string }>(
    "SELECT etat FROM partie_en_cours WHERE jeu_id = ?",
    [jeuId],
  );
  if (!ligne) return null;
  try {
    return JSON.parse(ligne.etat) as T;
  } catch {
    return null;
  }
}

export async function effacerEtat(jeuId: string) {
  if (!jeuId) return;
  const db = await getDb();
  await db.runAsync("DELETE FROM partie_en_cours WHERE jeu_id = ?", [jeuId]);
}

export async function partieEnCours(jeuId: string): Promise<boolean> {
  return (await chargerEtat(jeuId)) !== null;
}

/** Une partie laissée en plan, telle que le catalogue la présente. */
export type PartieEnAttente = {
  jeuId: string;
  date: string; // ISO
  joueurs: string[];
};

/** Toutes les parties à reprendre, la plus récente en tête. */
export async function listerPartiesEnCours(): Promise<PartieEnAttente[]> {
  const db = await getDb();
  const lignes = await db.getAllAsync<{ jeu_id: string; date: string; etat: string }>(
    "SELECT jeu_id, date, etat FROM partie_en_cours ORDER BY date DESC",
  );

  return lignes.map((l) => {
    let joueurs: string[] = [];
    try {
      const etat = JSON.parse(l.etat) as { joueurs?: { nom?: string }[] };
      joueurs = (etat.joueurs ?? []).map((j) => j.nom ?? "").filter(Boolean);
    } catch {
      // un état illisible reste une partie à reprendre : seuls les noms manquent
    }
    return { jeuId: l.jeu_id, date: l.date, joueurs };
  });
}
