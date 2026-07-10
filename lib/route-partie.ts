// lib/route-partie.ts
// À quel écran de score mène un jeu ? La fiche du jeu et le bandeau de reprise
// posent la même question : autant n'y répondre qu'une fois.

import { type Jeu } from "@/data/jeux";

const DESTINATIONS = {
  compteur: "/partie/[jeuId]",
  objectif: "/objectif/[jeuId]",
  grille: "/grille/[jeuId]",
  manches: "/manches/[jeuId]",
  cooperatif: "/coop/[jeuId]",
} as const;

export type CheminPartie = (typeof DESTINATIONS)[keyof typeof DESTINATIONS];

export function cheminPartie(jeu: Jeu): CheminPartie {
  return DESTINATIONS[jeu.scoreMode ?? "compteur"];
}
