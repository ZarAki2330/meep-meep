// data/jeux.ts
// Liste de jeux "en dur" pour démarrer.
// Plus tard, ces données viendront de la base locale (SQLite) et de l'import BoardGameGeek.

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

export type Jeu = {
  id: string;
  nom: string;
  description: string;
  joueursMin: number;
  joueursMax: number;
  dureeMin: number; // en minutes
  ageMin: number;
  categorie: string;
  // Règles présentées en points courts (une entrée = un point).
  regles: string[];
  // URL d'une image de couverture (optionnel).
  // Colle ici l'adresse d'une image (clic droit sur une image dans ton navigateur
  // → « Copier l'adresse de l'image »). Si vide, un visuel coloré s'affiche.
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
  scoreMode?: "compteur" | "objectif" | "grille" | "manches";
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
  // Chaque rôle a une fiche. Si "extension" est renseigné, le rôle n'apparaît
  // que lorsque cette extension est cochée.
  roles?: { nom: string; origine?: string; objectif?: string; extension?: string }[];
};

export const JEUX: Jeu[] = [
  {
    id: "catan",
    nom: "Catan",
    description: "Bâtissez des colonies, échangez des ressources et étendez votre territoire.",
    joueursMin: 3,
    joueursMax: 4,
    dureeMin: 75,
    ageMin: 10,
    categorie: "Stratégie",
    scoreVictoire: "max",
    seuilFin: 10,
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/A%20game%20of%20Settlers%20of%20Catan.jpg?width=600",
    regles: [
      "À ton tour, lance les deux dés : chaque joueur récolte les ressources des tuiles portant ce numéro et voisines de ses colonies.",
      "Échange des ressources avec les autres joueurs ou avec la banque.",
      "Construis des routes, des colonies et des villes, ou achète des cartes développement.",
      "Le premier à atteindre 10 points de victoire remporte la partie.",
    ],
  },
  {
    id: "6quiprend",
    nom: "6 qui prend !",
    description:
      "Posez vos cartes sans récolter de têtes de bœuf : ici, les points sont des pénalités.",
    joueursMin: 2,
    joueursMax: 10,
    dureeMin: 45,
    ageMin: 10,
    categorie: "Cartes",
    scoreVictoire: "min",
    seuilFin: 66,
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/6%20nimmt!.jpg?width=600",
    regles: [
      "Chaque manche, tous les joueurs choisissent une carte en secret, puis on les révèle.",
      "Les cartes se posent dans l'ordre croissant sur quatre rangées, à la suite de la carte la plus proche et inférieure.",
      "Poser la 6e carte d'une rangée fait ramasser les 5 précédentes : leurs têtes de bœuf sont des points de pénalité.",
      "À la fin des 10 cartes, chacun note ses têtes de bœuf.",
      "Dès qu'un joueur atteint 66, la partie s'arrête : le joueur avec le MOINS de points gagne.",
    ],
  },
  {
    id: "villainous",
    nom: "Villainous",
    description:
      "Incarnez un célèbre méchant Disney et accomplissez votre objectif secret avant vos adversaires.",
    joueursMin: 2,
    joueursMax: 6,
    dureeMin: 50,
    ageMin: 10,
    categorie: "Stratégie",
    scoreVictoire: "max",
    scoreMode: "objectif",
    image: "https://www.bcd-jeux.fr/14143-pdt_771/villainous-ravensburger.jpg",
    extensions: [
      "Mauvais jusqu'à l'os",
      "La Fin est Proche",
      "Cruellement Infects",
      "Monstrueusement Malsains",
      "Plus Grands, Plus Méchants",
      "Larmes de Fond",
    ],
    roles: [
      {
        nom: "Maléfique",
        origine: "La Belle au bois dormant",
        objectif: "Commencer son tour avec une Malédiction sur chacun des 4 lieux de son royaume.",
      },
      {
        nom: "Capitaine Crochet",
        origine: "Peter Pan",
        objectif: "Vaincre Peter Pan au lieu du Jolly Roger.",
      },
      {
        nom: "Prince Jean",
        origine: "Robin des Bois",
        objectif: "Commencer son tour avec au moins 20 jetons de Pouvoir.",
      },
      {
        nom: "Jafar",
        origine: "Aladdin",
        objectif: "Hypnotiser le Génie et posséder la Lampe magique à la Caverne aux Merveilles.",
      },
      {
        nom: "Reine de Cœur",
        origine: "Alice au pays des merveilles",
        objectif: "Réussir une exécution en ayant une arche de croquet à chaque lieu.",
      },
      {
        nom: "Ursula",
        origine: "La Petite Sirène",
        objectif: "Posséder le Trident et la Couronne à son Palais en début de tour.",
      },
      {
        nom: "La Méchante Reine",
        origine: "Blanche-Neige",
        objectif:
          "Préparer la pomme empoisonnée en jouant 4 ingrédients différents, retrouver Blanche-Neige et l'éliminer avec la carte « Croque ! ».",
        extension: "Mauvais jusqu'à l'os",
      },
      {
        nom: "Hadès",
        origine: "Hercule",
        objectif: "Commencer son tour avec au moins 3 Titans non entravés sur le Mont Olympe.",
        extension: "Mauvais jusqu'à l'os",
      },
      {
        nom: "Dr Facilier",
        origine: "La Princesse et la Grenouille",
        objectif: "Contrôler le Talisman et jouer la carte « Régner sur la Nouvelle-Orléans ».",
        extension: "Mauvais jusqu'à l'os",
      },
      {
        nom: "Scar",
        origine: "Le Roi Lion",
        objectif:
          "Trouver et vaincre Mufasa, puis vaincre d'autres héros jusqu'à totaliser 15 points de force dans sa pile Succession.",
        extension: "La Fin est Proche",
      },
      {
        nom: "Yzma",
        origine: "Kuzco, l'empereur mégalo",
        objectif:
          "Débusquer Kuzco dans ses pioches du Destin, le jouer, puis l'éliminer grâce à Kronk.",
        extension: "La Fin est Proche",
      },
      {
        nom: "Ratigan",
        origine: "Basil, détective privé",
        objectif:
          "Jouer la Reine robot et la conduire à Buckingham Palace, où elle doit rester jusqu'au début de son tour.",
        extension: "La Fin est Proche",
      },
      {
        nom: "Cruella d'Enfer",
        origine: "Les 101 Dalmatiens",
        objectif: "Réunir 99 chiots pour confectionner son manteau de fourrure.",
        extension: "Cruellement Infects",
      },
      {
        nom: "Capitaine Pat",
        origine: "Mickey Mouse",
        objectif:
          "Accomplir l'objectif du lieu où se trouve son pion : il change au fil de la partie.",
        extension: "Cruellement Infects",
      },
      {
        nom: "Mère Gothel",
        origine: "Raiponce",
        objectif: "Gagner la confiance de Raiponce afin de la garder sous son emprise.",
        extension: "Cruellement Infects",
      },
      {
        nom: "Gaston",
        origine: "La Belle et la Bête",
        objectif: "Courtiser Belle et la convaincre qu'il est l'homme à épouser.",
        extension: "Monstrueusement Malsains",
      },
      {
        nom: "Lady Tremaine",
        origine: "Cendrillon",
        objectif: "Convaincre le Prince d'épouser l'une de ses filles plutôt que Cendrillon.",
        extension: "Monstrueusement Malsains",
      },
      {
        nom: "Le Roi Cornu",
        origine: "Taram et le Chaudron magique",
        objectif:
          "Lever une armée de morts-vivants en réanimant des guerriers sur plusieurs lieux de son royaume.",
        extension: "Monstrueusement Malsains",
      },
      {
        nom: "Syndrome",
        origine: "Les Indestructibles",
        objectif: "Vaincre un Omnidroïde amélioré ainsi que tous les héros présents dans son royaume.",
        extension: "Plus Grands, Plus Méchants",
      },
      {
        nom: "Lotso",
        origine: "Toy Story 3",
        objectif:
          "Piéger quatre héros réduits à 0 point de force, ainsi que Buzz l'Éclair, dans la salle des Chenilles.",
        extension: "Plus Grands, Plus Méchants",
      },
      {
        nom: "Madame Mim",
        origine: "Merlin l'Enchanteur",
        objectif: "Surpasser Merlin en magie et l'emporter lors du duel de sorciers.",
        extension: "Plus Grands, Plus Méchants",
      },
      {
        nom: "Davy Jones",
        origine: "Pirates des Caraïbes",
        objectif: "Réunir 5 trésors à l'aide du Kraken.",
        extension: "Larmes de Fond",
      },
      {
        nom: "Tamatoa",
        origine: "Vaiana",
        objectif: "Ramener le crochet de Maui et le cœur de Te Fiti dans son repaire.",
        extension: "Larmes de Fond",
      },
    ],
    regles: [
      "Chaque joueur contrôle un méchant Disney avec son plateau (le Royaume), son deck Machiavélique et un deck du Destin.",
      "À ton tour, déplace ton pion sur un lieu de ton plateau.",
      "Effectue les actions du lieu : gagner du Pouvoir, jouer des cartes, activer des capacités.",
      "Tu peux jouer une carte du Destin contre un adversaire pour le gêner.",
      "Chaque méchant a un objectif unique : le premier à le remplir gagne.",
    ],
  },
  {
    id: "yams",
    nom: "Yams",
    description:
      "Lancez cinq dés et remplissez votre feuille : 1 à 6, brelan, carré, full, suites, yams et chance.",
    joueursMin: 1,
    joueursMax: 8,
    dureeMin: 30,
    ageMin: 8,
    categorie: "Dés",
    scoreVictoire: "max",
    scoreMode: "grille",
    categories: [
      { cle: "d1", label: "Total des 1", section: "Partie haute" },
      { cle: "d2", label: "Total des 2", section: "Partie haute" },
      { cle: "d3", label: "Total des 3", section: "Partie haute" },
      { cle: "d4", label: "Total des 4", section: "Partie haute" },
      { cle: "d5", label: "Total des 5", section: "Partie haute" },
      { cle: "d6", label: "Total des 6", section: "Partie haute" },
      { cle: "brelan", label: "Brelan", aide: "somme des dés", section: "Partie basse" },
      { cle: "carre", label: "Carré", aide: "somme des dés", section: "Partie basse" },
      { cle: "full", label: "Full", aide: "25", section: "Partie basse" },
      { cle: "petiteSuite", label: "Petite suite", aide: "30", section: "Partie basse" },
      { cle: "grandeSuite", label: "Grande suite", aide: "40", section: "Partie basse" },
      { cle: "yams", label: "Yams", aide: "50", section: "Partie basse" },
      { cle: "chance", label: "Chance", aide: "somme des dés", section: "Partie basse" },
    ],
    bonus: {
      label: "Bonus (≥ 63)",
      surCles: ["d1", "d2", "d3", "d4", "d5", "d6"],
      seuil: 63,
      points: 35,
    },
    image: "https://m.media-amazon.com/images/I/51nF2ugGh6L._AC_SL1000_.jpg",
    regles: [
      "À ton tour, lance les cinq dés. Tu peux relancer les dés de ton choix jusqu'à deux fois (trois lancers en tout).",
      "Inscris ensuite ton résultat dans une case libre de ta feuille.",
      "Partie haute (1 à 6) : additionne les dés de la valeur choisie. Bonus de 35 si le total haut atteint 63.",
      "Partie basse : Brelan et Carré = somme des dés ; Full = 25 ; Petite suite = 30 ; Grande suite = 40 ; Yams = 50 ; Chance = somme des dés.",
      "Quand toutes les cases sont remplies, le plus grand total gagne.",
    ],
  },
];
