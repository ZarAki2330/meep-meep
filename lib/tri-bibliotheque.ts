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

  return copie.sort(parNom);
}
