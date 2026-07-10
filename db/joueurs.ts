// db/joueurs.ts
// Liste des joueurs récurrents (pour ne pas retaper les noms), et leur portrait.

import { arbitrerPhotos, renommerDansPartie } from "@/lib/renommage";

import { getDb } from "./database";

export type JoueurEnregistre = { id: number; nom: string; photo: string | null };

export async function listerJoueurs(): Promise<JoueurEnregistre[]> {
  const db = await getDb();
  return db.getAllAsync<JoueurEnregistre>(
    "SELECT id, nom, photo FROM joueurs ORDER BY nom COLLATE NOCASE",
  );
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

/** Le portrait d'un joueur, ou null. Sert avant une suppression : après, il est perdu. */
export async function photoJoueur(nom: string): Promise<string | null> {
  const db = await getDb();
  const ligne = await db.getFirstAsync<{ photo: string | null }>(
    "SELECT photo FROM joueurs WHERE nom = ?",
    [nom],
  );
  return ligne?.photo ?? null;
}

/** Pose ou retire le portrait d'un joueur. Le joueur est créé s'il n'existe pas encore. */
export async function definirPhotoJoueur(nom: string, photo: string | null) {
  const n = nom.trim();
  if (!n) return;
  const db = await getDb();
  await db.runAsync("INSERT OR IGNORE INTO joueurs (nom) VALUES (?)", [n]);
  await db.runAsync("UPDATE joueurs SET photo = ? WHERE nom = ?", [photo, n]);
}

export type ResultatRenommage = {
  parties: number;
  fusion: boolean;
  /** Photo dont plus personne ne veut : à l'appelant de l'effacer du disque. */
  photoOrpheline: string | null;
};

/**
 * Renomme un joueur partout : dans la liste et dans tout l'historique
 * (noms des participants et vainqueur). Si le nouveau nom existe déjà,
 * les deux joueurs sont fusionnés.
 *
 * Le portrait suit le nom. En cas de fusion, celui du joueur d'arrivée gagne ;
 * s'il n'en a pas, il hérite de celui du joueur absorbé. La photo perdante est
 * rendue à l'appelant, seul à savoir effacer un fichier.
 */
export async function renommerJoueur(ancien: string, nouveau: string): Promise<ResultatRenommage> {
  const a = ancien.trim();
  const n = nouveau.trim();
  if (!a || !n || a === n) return { parties: 0, fusion: false, photoOrpheline: null };

  const db = await getDb();
  const photoAncien = await photoJoueur(a);
  const existant = await db.getFirstAsync<{ nom: string; photo: string | null }>(
    "SELECT nom, photo FROM joueurs WHERE nom = ? COLLATE NOCASE",
    [n],
  );
  const fusion = !!existant && existant.nom !== a;

  const lignes = await db.getAllAsync<{ id: number; gagnant: string; details: string }>(
    "SELECT id, gagnant, details FROM parties",
  );

  let partiesTouchees = 0;
  for (const l of lignes) {
    const maj = renommerDansPartie(l, a, n);
    if (!maj.touchee) continue;
    await db.runAsync("UPDATE parties SET details = ?, gagnant = ? WHERE id = ?", [
      maj.details,
      maj.gagnant,
      l.id,
    ]);
    partiesTouchees++;
  }

  const { retenue: photoRetenue, orpheline: photoOrpheline } = arbitrerPhotos(
    fusion,
    photoAncien,
    existant?.photo ?? null,
  );

  await db.runAsync("DELETE FROM joueurs WHERE nom = ?", [a]);
  await db.runAsync("INSERT OR IGNORE INTO joueurs (nom) VALUES (?)", [n]);
  await db.runAsync("UPDATE joueurs SET photo = ? WHERE nom = ?", [photoRetenue, n]);

  return { parties: partiesTouchees, fusion, photoOrpheline };
}
