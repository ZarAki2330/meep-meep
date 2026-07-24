// lib/tri-bibliotheque.ts
// Le tri de l'écran « Ajouter un jeu tout prêt ». Fonction pure, sans accès à la
// base : les jeux ne sont pas encore joués, on ne trie donc que sur leurs
// caractéristiques (nom, catégorie, durée, nombre de joueurs).
//
// Il n'y a volontairement pas de tri « nouveautés » : le catalogue ne porte
// aucune date de sortie ou d'ajout, un tel tri serait donc arbitraire. Le jour
// où le type `Jeu` gagne un champ de date, on pourra en ajouter un ici.

import { type Jeu } from "@/data/jeux";

export type TriBiblioCle = "alpha" | "categorie" | "duree" | "joueurs";

export const TRIS_BIBLIO: { cle: TriBiblioCle; label: string }[] = [
  { cle: "alpha", label: "A → Z" },
  { cle: "categorie", label: "Catégorie" },
  { cle: "duree", label: "Durée" },
  { cle: "joueurs", label: "Joueurs" },
];

/** Compare deux noms comme le ferait un francophone : « Élan » avant « Escrime ». */
function parNom(a: Jeu, b: Jeu): number {
  return a.nom.localeCompare(b.nom, "fr", { sensitivity: "base" });
}

/**
 * Première lettre normalisée d'un nom : accents retirés (É → E), en majuscule.
 * Tout ce qui n'est pas A–Z (chiffres, symboles) est regroupé sous « # ».
 * Sert au tri alphabétique comme à la barre d'index de l'écran.
 */
export function lettreInitiale(nom: string): string {
  const c = nom
    .trim()
    .charAt(0)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
  return c >= "A" && c <= "Z" ? c : "#";
}

/**
 * Tri alphabétique de l'écran : d'abord les jeux commençant par une lettre
 * (A → Z), puis, tout à la fin, ceux qui commencent par un chiffre ou un
 * symbole (« 6 qui prend », « 7 Wonders »…), rangés entre eux par nom.
 */
function parAlpha(a: Jeu, b: Jeu): number {
  const aChiffre = lettreInitiale(a.nom) === "#";
  const bChiffre = lettreInitiale(b.nom) === "#";
  if (aChiffre !== bChiffre) return aChiffre ? 1 : -1;
  return parNom(a, b);
}

/**
 * Trie une liste de jeux sans modifier la liste reçue. À valeur égale sur le
 * critère choisi, on départage toujours par ordre alphabétique — l'ordre reste
 * ainsi stable et prévisible.
 */
export function trierBibliotheque(jeux: Jeu[], tri: TriBiblioCle): Jeu[] {
  const copie = [...jeux];

  if (tri === "categorie") {
    return copie.sort(
      (a, b) =>
        a.categorie.localeCompare(b.categorie, "fr", { sensitivity: "base" }) || parNom(a, b),
    );
  }

  if (tri === "duree") {
    // Du plus court au plus long.
    return copie.sort((a, b) => a.dureeMin - b.dureeMin || parNom(a, b));
  }

  if (tri === "joueurs") {
    // Par nombre minimum de joueurs, puis par maximum (un jeu à 2 avant un 3-5).
    return copie.sort(
      (a, b) => a.joueursMin - b.joueursMin || a.joueursMax - b.joueursMax || parNom(a, b),
    );
  }

  return copie.sort(parAlpha);
}
