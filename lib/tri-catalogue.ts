// lib/tri-catalogue.ts
// Le tri du catalogue. Fonction pure : facile à tester, aucun accès à la base.

import { type Jeu } from "@/data/jeux";

export type TriCle = "defaut" | "alpha" | "plusJoues" | "recents";

/** Ce que l'historique nous apprend sur un jeu. */
export type StatsJeu = { parties: number; derniere: string };

export const TRIS: { cle: TriCle; label: string }[] = [
  { cle: "defaut", label: "Par défaut" },
  { cle: "alpha", label: "A → Z" },
  { cle: "plusJoues", label: "Les plus joués" },
  { cle: "recents", label: "Joués récemment" },
];

/** Compare deux noms comme le ferait un francophone : « Élan » avant « Escrime ». */
function parNom(a: Jeu, b: Jeu): number {
  return a.nom.localeCompare(b.nom, "fr", { sensitivity: "base" });
}

/**
 * Trie une liste de jeux. Ne modifie pas la liste reçue.
 * Les jeux jamais joués finissent en bas des tris « plus joués » et « récents »,
 * rangés entre eux par ordre alphabétique.
 */
export function trierJeux(
  jeux: Jeu[],
  tri: TriCle,
  stats: Record<string, StatsJeu> = {},
): Jeu[] {
  if (tri === "defaut") return jeux;

  const copie = [...jeux];

  if (tri === "alpha") {
    return copie.sort(parNom);
  }

  if (tri === "plusJoues") {
    return copie.sort((a, b) => {
      const ecart = (stats[b.id]?.parties ?? 0) - (stats[a.id]?.parties ?? 0);
      return ecart !== 0 ? ecart : parNom(a, b);
    });
  }

  return copie.sort((a, b) => {
    const da = stats[a.id]?.derniere ?? "";
    const db = stats[b.id]?.derniere ?? "";
    if (da === db) return parNom(a, b);
    if (!da) return 1; // jamais joué : à la fin
    if (!db) return -1;
    return db.localeCompare(da); // dates ISO : l'ordre du texte est l'ordre du temps
  });
}
