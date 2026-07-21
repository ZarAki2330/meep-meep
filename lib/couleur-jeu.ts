// lib/couleur-jeu.ts
// Couleur du visuel de secours d'un jeu (la tuile colorée avec l'initiale,
// affichée quand le jeu n'a pas de photo).
//
// La couleur suit la CATÉGORIE du jeu : deux jeux de la même catégorie
// partagent la même teinte, ce qui rend les listes lisibles d'un coup d'œil.
// Chaque teinte est assez foncée pour que l'initiale blanche posée dessus
// reste lisible (contraste ≥ 3,7:1 avec le blanc, vérifié à la main), dans le
// thème clair comme dans le thème sombre. Une catégorie inconnue reçoit une
// teinte stable, tirée de la palette par un petit hachage de son nom : la même
// catégorie donne toujours la même couleur.

import { type Jeu } from "@/data/jeux";

// Couleur par catégorie connue. Ajouter ici toute nouvelle catégorie du
// catalogue pour lui donner une teinte dédiée.
const COULEURS_CATEGORIE: Record<string, string> = {
  Cartes: "#1D8F6B",
  Ambiance: "#C24E77",
  Coopératif: "#6E55A8",
  Stratégie: "#2B6CB0",
  Rapidité: "#C56A1E",
  Enquête: "#4759B8",
  Réflexion: "#2C8079",
  Bluff: "#A83E72",
  Familial: "#B4671A",
  Famille: "#B4671A",
  Enfants: "#C74E82",
  Aventure: "#4E8B3B",
  Dés: "#BC4A46",
  Abstrait: "#556E86",
  "Casse-tête": "#835497",
  Adresse: "#9C6534",
  Extension: "#6B655E",
  Course: "#3F8FA0",
  Mémoire: "#7A6AC0",
  Dessin: "#C25A9E",
  Lettres: "#4A7CB0",
  Chiffres: "#2E8A6E",
};

// Palette de repli pour une catégorie non répertoriée. Ordre volontairement
// « écarté » pour que des catégories voisines tombent sur des teintes distinctes.
const PALETTE = [
  "#2B6CB0",
  "#1D8F6B",
  "#C24E77",
  "#6E55A8",
  "#C56A1E",
  "#4759B8",
  "#BC4A46",
  "#2C8079",
  "#835497",
  "#556E86",
];

/** Hachage déterministe et stable d'une chaîne (variante de djb2). */
function hachage(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** La couleur du visuel de secours d'un jeu, à partir de sa catégorie. */
export function couleurJeu(jeu: Jeu): string {
  const cat = jeu.categorie?.trim() ?? "";
  const connue = COULEURS_CATEGORIE[cat];
  if (connue) return connue;
  // Catégorie vide ou inconnue : teinte stable tirée de la palette.
  return PALETTE[hachage(cat || jeu.id) % PALETTE.length];
}

/**
 * Couleur de l'avatar d'un personnage sans photo, tirée de son nom. Le même
 * personnage garde toujours la même teinte ; deux personnages voisins tombent
 * sur des teintes distinctes. Assez foncée pour une initiale blanche lisible.
 */
export function couleurRole(nom: string): string {
  return PALETTE[hachage(nom.trim().toLowerCase() || "role") % PALETTE.length];
}
