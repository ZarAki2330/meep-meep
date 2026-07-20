// lib/regroupement.ts
// Regroupement des extensions et éditions sous leur jeu de base.
//
// Une entrée dont le "type" vaut "extension" ou "edition" est rattachée à un
// jeu de base via "jeuParent". Dans les listes, on masque ces entrées au premier
// niveau (elles apparaissent sous leur jeu de base) — sauf si leur parent est
// absent de la liste, pour ne jamais faire disparaître un jeu.

import { type Jeu } from "@/data/jeux";

/** Un jeu à part entière (le champ "type" absent vaut "jeu"). */
export function estJeuDeBase(j: Jeu): boolean {
  return !j.type || j.type === "jeu";
}

/** Les extensions et éditions rattachées à ce jeu de base, présentes dans la liste. */
export function enfantsDe(id: string, liste: Jeu[]): Jeu[] {
  return liste.filter((j) => j.jeuParent === id);
}

/**
 * Les entrées à afficher au premier niveau d'une liste : on masque les extensions
 * et éditions dont le jeu de base est présent (elles sont regroupées sous lui).
 * Une extension orpheline (parent absent) reste visible pour ne rien cacher.
 */
export function premierNiveau(liste: Jeu[]): Jeu[] {
  const ids = new Set(liste.map((j) => j.id));
  return liste.filter((j) => estJeuDeBase(j) || !j.jeuParent || !ids.has(j.jeuParent));
}
