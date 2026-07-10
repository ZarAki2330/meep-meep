// lib/score.ts
// Le calcul des scores, hors des écrans.
//
// Trois écrans comptaient des points chacun de leur côté — compteur, manches,
// feuille de score — avec les mêmes fonctions recopiées trois fois. Elles vivent
// ici, sans JSX, sans état : on peut enfin les mettre à l'épreuve.
//
// Deux règles traversent tout ce fichier :
//  - une case vide vaut zéro, jamais NaN ;
//  - le seuil de fin regarde le score le plus HAUT, même quand le moins de
//    points gagne : au 6 qui prend, la partie s'arrête quand quelqu'un atteint
//    66 têtes de bœuf, et c'est le plus bas total qui l'emporte.

import { type BonusGrille, type CategorieScore } from "@/data/jeux";

export type Sens = "max" | "min";

/** Les cases d'un joueur : une clé de catégorie, ou un numéro de manche. */
export type CasesJoueur = Record<string, string> | undefined;

// ——— Saisie ———

/** Ne garde que des chiffres. Pour le compteur, où les scores sont positifs. */
export function nettoyerEntier(texte: string): string {
  return texte.replace(/[^0-9]/g, "");
}

/**
 * Ne garde que des chiffres, en tolérant un signe moins en tête.
 * Skull King punit un contrat manqué, le militaire de 7 Wonders coûte des points.
 */
export function nettoyerEntierSigne(texte: string): string {
  const negatif = texte.trimStart().startsWith("-");
  return (negatif ? "-" : "") + nettoyerEntier(texte);
}

/** Lit une saisie. Vide, absente, ou réduite à un signe : zéro. */
export function lireCase(texte: string | undefined): number {
  const n = parseInt(texte ?? "", 10);
  return isNaN(n) ? 0 : n;
}

// ——— Totaux ———

export function sommeCles(cases: CasesJoueur, cles: string[]): number {
  return cles.reduce((s, c) => s + lireCase(cases?.[c]), 0);
}

/** Le bonus tombe si la somme des cases visées atteint le seuil. */
export function bonusGagne(cases: CasesJoueur, bonus?: BonusGrille): number {
  if (!bonus) return 0;
  return sommeCles(cases, bonus.surCles) >= bonus.seuil ? bonus.points : 0;
}

export function totalGrille(
  cases: CasesJoueur,
  categories: CategorieScore[],
  bonus?: BonusGrille,
): number {
  return (
    sommeCles(
      cases,
      categories.map((c) => c.cle),
    ) + bonusGagne(cases, bonus)
  );
}

/** Les manches sont numérotées de 1 à nbManches ; les cases absentes valent zéro. */
export function totalManches(cases: CasesJoueur, nbManches: number): number {
  let somme = 0;
  for (let m = 1; m <= nbManches; m++) somme += lireCase(cases?.[String(m)]);
  return somme;
}

/** Le compteur ne descend jamais sous zéro. */
export function incrementer(score: number, delta: number): number {
  return Math.max(0, score + delta);
}

// ——— Classement ———

export type Classement<T> = {
  /** Le score qui gagne, selon le sens. Zéro s'il n'y a personne. */
  meilleur: number;
  /** Le score le plus haut, quel que soit le sens. Sert au seuil de fin. */
  pire: number;
  gagnants: T[];
  /** Tout le monde au même score. Vrai aussi pour un joueur seul. */
  tousEgaux: boolean;
  /** Plusieurs joueurs à égalité en tête : il faut départager. */
  egalite: boolean;
};

export function classer<T>(joueurs: T[], score: (j: T) => number, sens: Sens): Classement<T> {
  const scores = joueurs.map(score);
  if (scores.length === 0) {
    return { meilleur: 0, pire: 0, gagnants: [], tousEgaux: true, egalite: false };
  }
  // Math.min d'un tableau vide vaut Infinity : d'où le garde ci-dessus.
  const bas = Math.min(...scores);
  const haut = Math.max(...scores);
  const meilleur = sens === "min" ? bas : haut;
  const gagnants = joueurs.filter((j) => score(j) === meilleur);
  return {
    meilleur,
    pire: haut,
    gagnants,
    tousEgaux: bas === haut,
    egalite: gagnants.length > 1,
  };
}

/** La partie s'arrête quand le score le plus haut atteint le seuil. */
export function seuilAtteint(pire: number, seuilFin?: number): boolean {
  return seuilFin !== undefined && pire >= seuilFin;
}

/** Retire les cases d'un joueur qui quitte la table. */
export function oublierJoueur<T>(cases: Record<string, T>, joueurId: string): Record<string, T> {
  const copie = { ...cases };
  delete copie[joueurId];
  return copie;
}

/**
 * Ne garde, chez chaque joueur, que les cases que le jeu connaît encore.
 *
 * Modifier un jeu pendant qu'une partie l'attend peut supprimer une case de sa
 * feuille de score. À la reprise, sa valeur restait en mémoire — invisible,
 * exclue du total, et ressuscitée à chaque sauvegarde automatique.
 */
export function purgerCases(
  scores: Record<string, Record<string, string>>,
  clesConnues: string[],
): Record<string, Record<string, string>> {
  const gardees = new Set(clesConnues);
  const propre: Record<string, Record<string, string>> = {};
  for (const [joueurId, cases] of Object.entries(scores)) {
    propre[joueurId] = Object.fromEntries(
      Object.entries(cases).filter(([cle]) => gardees.has(cle)),
    );
  }
  return propre;
}
