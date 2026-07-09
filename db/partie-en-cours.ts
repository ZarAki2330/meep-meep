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
