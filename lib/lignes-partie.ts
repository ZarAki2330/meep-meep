// lib/lignes-partie.ts
// Lire une partie enregistrée. Chaque écran s'en chargeait seul, et chacun se
// trompait à sa façon : voici la réponse unique aux trois questions qui reviennent.
//
//  - Que contient `details` ? Du JSON, parfois abîmé, parfois valide mais pas un
//    tableau. Un `JSON.parse` réussi ne garantit rien.
//  - Qui joue ? Une ligne est un joueur, ou une équipe qui en cache plusieurs.
//    Un même joueur peut figurer dans deux équipes : il ne compte qu'une fois.
//  - Qui a gagné ? `gagnant` est le nom de la LIGNE victorieuse. En équipes,
//    c'est le nom de l'équipe, jamais celui d'un joueur.

import { type JoueurScore, type PartieEnregistree } from "@/db/parties";

/** La partie, réduite à ce qu'il faut pour désigner ses vainqueurs. */
export type PartieLisible = Pick<PartieEnregistree, "details" | "gagnant" | "resultat">;

/**
 * Les lignes d'une partie. Rend une liste vide plutôt que de laisser passer
 * une valeur qui n'en est pas une : `JSON.parse("null")` réussit, et rend `null`.
 */
export function lignesDe(details: string): JoueurScore[] {
  try {
    const brut: unknown = JSON.parse(details);
    return Array.isArray(brut) ? (brut as JoueurScore[]) : [];
  } catch {
    return [];
  }
}

/**
 * Les personnes derrière une ligne : une équipe en cache plusieurs.
 * Un même nom saisi deux fois dans une équipe ne désigne qu'une personne.
 */
export function personnesDe(ligne: JoueurScore): string[] {
  return Array.from(new Set(ligne.membres?.length ? ligne.membres : [ligne.nom]));
}

/**
 * Tous les participants d'une partie, sans doublon.
 * Un joueur inscrit dans deux équipes ne joue pas deux parties.
 */
export function participantsDe(lignes: JoueurScore[]): string[] {
  const vus = new Set<string>();
  for (const ligne of lignes) for (const nom of personnesDe(ligne)) vus.add(nom);
  return Array.from(vus);
}

/**
 * Les personnes créditées de la victoire, sans doublon.
 *
 * Vide sur une égalité (vainqueur vide), vide sur une défaite coopérative.
 * En coopératif gagné, toute la table l'emporte. En équipes, ce sont les
 * membres de l'équipe victorieuse — jamais l'équipe elle-même.
 */
export function vainqueursDe(partie: PartieLisible): string[] {
  const lignes = lignesDe(partie.details);

  if (partie.resultat) {
    return partie.resultat === "victoire" ? participantsDe(lignes) : [];
  }
  if (!partie.gagnant) return []; // égalité enregistrée

  // Deux lignes peuvent porter le même nom : la victoire ne se compte qu'une fois.
  const gagnantes = lignes.filter((l) => l.nom === partie.gagnant);
  if (gagnantes.length === 0) {
    // Une partie dont la ligne gagnante a disparu : on s'en tient au nom retenu.
    return [partie.gagnant];
  }
  return participantsDe(gagnantes);
}

/** Vrai si cette personne a remporté la partie, seule ou avec son équipe. */
export function aGagne(partie: PartieLisible, nom: string): boolean {
  return vainqueursDe(partie).includes(nom);
}

/** La ligne de cette personne : elle-même, ou l'équipe dont elle est membre. */
export function ligneDe(lignes: JoueurScore[], nom: string): JoueurScore | undefined {
  return lignes.find((l) => personnesDe(l).includes(nom));
}

/**
 * Un nom présentable. Le champ du nom est librement modifiable, donc vidable —
 * et un vainqueur au nom vide serait enregistré comme une égalité.
 */
export function nomPropre(nom: string, defaut: string): string {
  return nom.trim() || defaut;
}
