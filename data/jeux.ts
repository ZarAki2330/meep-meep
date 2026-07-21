// data/jeux.ts
// La forme d'un jeu. Rien d'autre : le contenu vit dans data/bibliotheque.ts,
// et les jeux du catalogue vivent en base locale (SQLite).

// Une case de la feuille de score (mode "grille").
export type CategorieScore = {
  cle: string;
  label: string;
  aide?: string; // ex. "25", "somme des dés"
  section?: string; // ex. "Partie haute"
};

// Bonus optionnel : si la somme des cases listées atteint le seuil, on ajoute des points.
export type BonusGrille = {
  label: string;
  surCles: string[];
  seuil: number;
  points: number;
};

// Un rôle / personnage jouable. Si "extension" est renseigné, le rôle
// n'apparaît que lorsque cette extension est cochée sur la fiche du jeu.
export type RoleJeu = {
  nom: string;
  origine?: string;
  objectif?: string;
  extension?: string;
  // Photo ou logo du personnage (URL, ou chemin d'une image copiée dans l'app).
  // Si vide, un avatar coloré avec l'initiale du personnage s'affiche.
  image?: string;
};

export type Jeu = {
  id: string;
  nom: string;
  description: string;
  joueursMin: number;
  joueursMax: number;
  dureeMin: number; // en minutes
  ageMin: number;
  categorie: string;
  // Éditeur du jeu (ex. « Gigamic »). Optionnel : affiché sur la fiche s'il est renseigné.
  editeur?: string;
  // Règles présentées en points courts (une entrée = un point).
  regles: string[];
  // URL d'une image de couverture, ou chemin d'une photo copiée dans l'app.
  // Si vide, un visuel coloré s'affiche.
  image?: string;
  // Façon de compter les points :
  //  - "max" : le plus de points gagne (Catan, 7 Wonders...)
  //  - "min" : le moins de points gagne, ce sont des pénalités (6 qui prend)
  scoreVictoire: "max" | "min";
  // Score qui déclenche la fin de la partie (optionnel).
  seuilFin?: number;
  // Mode de saisie des scores :
  //  - "compteur" (défaut) : boutons +/- par joueur
  //  - "objectif" : pas de points, on désigne simplement le vainqueur
  //  - "grille" : feuille de score par catégorie (voir "categories")
  //  - "manches" : une ligne par manche, total automatique
  //  - "cooperatif" : pas de classement, toute la table gagne ou perd ensemble
  scoreMode?: "compteur" | "objectif" | "grille" | "manches" | "cooperatif";
  // Pour le mode "grille" : les cases de la feuille de score.
  categories?: CategorieScore[];
  // Pour le mode "grille" : bonus optionnel.
  bonus?: BonusGrille;
  // Le score se compte par équipe et non par joueur (belote, Codenames…).
  equipes?: boolean;
  // Extensions disponibles pour ce jeu (optionnel).
  // Si renseigné, on peut les cocher sur la fiche du jeu.
  extensions?: string[];
  // Rôles / personnages jouables (optionnel).
  roles?: RoleJeu[];
  // Certains jeux (ex. L'Imposteur) ont des rôles destinés à être partagés :
  // un même rôle peut être attribué à plusieurs joueurs. Par défaut (absent ou
  // false), chaque rôle est exclusif — un seul joueur peut le prendre (Villainous).
  rolesPartageables?: boolean;
  // Nature de l'entrée dans le catalogue :
  //  - "jeu" (défaut, ou champ absent) : un jeu à part entière, affiché dans la liste.
  //  - "extension" : un module qui nécessite un jeu de base (ex. Oriflamme Alliance).
  //  - "edition" : une déclinaison d'un jeu existant — mini/pocket, version junior,
  //    thème différent, réédition (ex. Similo : Contes, Quarto mini).
  // Les extensions et éditions sont rattachées à leur jeu de base via "jeuParent"
  // et regroupées sous lui plutôt que listées à part.
  type?: "jeu" | "extension" | "edition";
  // Identifiant du jeu de base auquel cette entrée est rattachée (si type ≠ "jeu").
  jeuParent?: string;
};
