// lib/joueurs.ts
// Affichage du nombre de joueurs d'un jeu, au même format partout : quand le
// minimum et le maximum sont égaux, on n'affiche qu'un seul chiffre (« 2 »,
// pas « 2–2 »). L'unité s'adapte aux jeux en équipes.

import { type Jeu } from "@/data/jeux";

/** « équipes » pour un jeu en équipes, « joueurs » sinon. */
export function uniteJoueurs(jeu: Pick<Jeu, "equipes">): string {
  return jeu.equipes ? "équipes" : "joueurs";
}

/** Plage courte : « 2 » quand min = max, sinon « 2–4 ». */
export function plageJoueurs(jeu: Pick<Jeu, "joueursMin" | "joueursMax">): string {
  return jeu.joueursMin === jeu.joueursMax
    ? `${jeu.joueursMin}`
    : `${jeu.joueursMin}–${jeu.joueursMax}`;
}

/** Texte complet : « 2 joueurs », « 2–4 joueurs », « 3–6 équipes »… */
export function texteJoueurs(jeu: Pick<Jeu, "joueursMin" | "joueursMax" | "equipes">): string {
  return `${plageJoueurs(jeu)} ${uniteJoueurs(jeu)}`;
}
