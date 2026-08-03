// lib/lignes-partie.ts
// Lire une partie enregistrée. Chaque écran s'en chargeait seul, et chacun se
// trompait à sa façon : voici la réponse unique aux trois questions qui reviennent.
//
//  - Que contient `details` ? Du JSON, parfois abîmé, parfois valide mais pas un
//    tableau. Un `JSON.parse` réussi ne garantit rien.
//  - Qui joue ? Une ligne est un joueur, ou une équipe qui en cache plusieurs.
//    Un même joueur peut figurer dans deux équipes : il ne compte qu'une fois.
//  - Qui a gagné ? Une partie peut se gagner à plusieurs : les lignes
//    victorieuses portent `gagnant: true`. La colonne `gagnant` ne retient
//    qu'un nom — celui de la première d'entre elles — et sert de repli pour
//    les parties enregistrées avant ce marquage. En équipes, ce nom est celui
//    de l'équipe, jamais celui d'un joueur.

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
 * Vrai si ces lignes portent la marque du vainqueur.
 *
 * Les parties enregistrées avant les vainqueurs multiples n'en ont aucune :
 * on retombe alors sur la comparaison des noms, comme autrefois.
 */
export function lignesMarquees(lignes: JoueurScore[]): boolean {
  return lignes.some((l) => l.gagnant === true);
}

/**
 * Les lignes victorieuses d'une partie compétitive.
 *
 * Plusieurs en mode objectif, où l'on gagne parfois en camp. Vide sur une
 * égalité. Rend une liste vide en coopératif : là, personne ne devance
 * personne, c'est `resultat` qui tranche.
 */
export function lignesGagnantes(partie: PartieLisible): JoueurScore[] {
  if (partie.resultat) return [];
  const lignes = lignesDe(partie.details);
  if (lignesMarquees(lignes)) return lignes.filter((l) => l.gagnant === true);
  if (!partie.gagnant) return []; // égalité enregistrée
  // Deux lignes peuvent porter le même nom : elles gagnent alors ensemble.
  return lignes.filter((l) => l.nom === partie.gagnant);
}

/**
 * Les noms des lignes victorieuses, sans doublon — le nom de l'équipe en
 * équipes. C'est ce que l'historique affiche ; les statistiques, elles,
 * créditent les personnes derrière ces lignes (voir `vainqueursDe`).
 */
export function nomsGagnantsDe(partie: PartieLisible): string[] {
  const gagnantes = lignesGagnantes(partie);
  if (gagnantes.length === 0) {
    // Une partie dont la ligne gagnante a disparu : on s'en tient au nom retenu.
    return partie.resultat || !partie.gagnant ? [] : [partie.gagnant];
  }
  return Array.from(new Set(gagnantes.map((l) => l.nom)));
}

/**
 * Les personnes créditées de la victoire, sans doublon.
 *
 * Vide sur une égalité (aucune ligne gagnante), vide sur une défaite
 * coopérative. En coopératif gagné, toute la table l'emporte. En équipes, ce
 * sont les membres des équipes victorieuses — jamais les équipes elles-mêmes.
 * Plusieurs lignes peuvent avoir gagné : chacun n'est crédité qu'une fois.
 */
export function vainqueursDe(partie: PartieLisible): string[] {
  if (partie.resultat) {
    return partie.resultat === "victoire" ? participantsDe(lignesDe(partie.details)) : [];
  }

  const gagnantes = lignesGagnantes(partie);
  if (gagnantes.length === 0) {
    // Une partie dont la ligne gagnante a disparu : on s'en tient au nom retenu.
    return partie.gagnant ? [partie.gagnant] : [];
  }
  return participantsDe(gagnantes);
}

/** Vrai si cette personne a remporté la partie, seule ou avec son camp. */
export function aGagne(partie: PartieLisible, nom: string): boolean {
  return vainqueursDe(partie).includes(nom);
}

/**
 * Vrai si CETTE ligne l'a emporté.
 *
 * Répond là où `aGagne` ne suffit pas : deux lignes homonymes, ou une équipe
 * dont on tient déjà la ligne. `lignes` est la table entière — c'est elle qui
 * dit si la partie porte des marques de vainqueur ou relève de l'ancien format.
 */
export function ligneAGagne(
  partie: PartieLisible,
  ligne: JoueurScore,
  lignes: JoueurScore[],
): boolean {
  if (partie.resultat) return partie.resultat === "victoire";
  if (lignesMarquees(lignes)) return ligne.gagnant === true;
  return !!partie.gagnant && partie.gagnant === ligne.nom;
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
