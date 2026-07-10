// data/aide.ts
// Le contenu de l'écran d'aide. Chaque section porte une clé : le formulaire
// d'ajout d'un jeu s'en sert pour ouvrir directement la bonne explication.
//
// Ajouter une section, c'est ajouter une entrée. Un bloc est un paragraphe
// (une chaîne) ou une liste à puces (un tableau de chaînes).

export type Bloc = string | string[];

export type CleAide =
  | "modes"
  | "feuille"
  | "extensions"
  | "equipes"
  | "reprise"
  | "notes"
  | "catalogue"
  | "partage"
  | "joueurs"
  | "donnees";

export type SectionAide = { cle: CleAide; titre: string; blocs: Bloc[] };

export const SECTIONS_AIDE: SectionAide[] = [
  {
    cle: "modes",
    titre: "Les cinq modes de score",
    blocs: [
      "Chaque jeu choisit sa façon de compter. Le mode se règle dans le formulaire du jeu, et détermine l'écran qui s'ouvre quand tu lances une partie.",
      [
        "Compteur : des boutons + et − par joueur. Pour Catan, 7 Wonders, tout ce qui se compte au fil de l'eau.",
        "Manches : une ligne par manche, total automatique. Pour la belote, Skull King, le tarot. Les scores négatifs sont acceptés.",
        "Objectif : pas de points du tout, on désigne le vainqueur à la fin. Pour Villainous, Codenames.",
        "Feuille de score : une grille de cases à remplir, avec sections et bonus. Pour le Yams, et tout jeu à feuille.",
        "Coopératif : pas de classement, toute la table gagne ou perd ensemble. Pour Pandémie, The Crew.",
      ],
      "« Qui gagne ? » n'apparaît qu'en mode compteur et manches : c'est là qu'un score peut être une pénalité, comme au 6 qui prend. Le seuil de fin de partie s'y règle aussi — 1000 à la belote, 66 au 6 qui prend.",
    ],
  },
  {
    cle: "feuille",
    titre: "Écrire une feuille de score",
    blocs: [
      "En mode « feuille de score », les cases se saisissent en texte : une ligne, une case.",
      [
        "« Full | 25 » crée une case Full, avec l'aide « 25 » affichée en gris.",
        "« # Partie haute » ouvre une section : toutes les cases suivantes lui appartiennent, jusqu'à la section suivante.",
        "Une ligne sans barre verticale est une case sans aide.",
      ],
      "Le bonus, lui, se coche à part. Tu choisis les cases sur lesquelles porte le total — toutes, ou une seule section — puis le seuil à atteindre et les points gagnés. Au Yams : la section « Partie haute », seuil 63, 35 points.",
    ],
  },
  {
    cle: "extensions",
    titre: "Extensions et personnages",
    blocs: [
      "Les extensions se saisissent une par ligne. Elles apparaissent alors sur la fiche du jeu, à cocher avant de lancer une partie.",
      "Les personnages s'écrivent « Nom | origine | objectif | extension ». Seul le nom est obligatoire : « Médecin | Retire tous les cubes d'une couleur » suffit pour Pandémie.",
      "La dernière colonne relie un personnage à une extension : il ne s'affichera que si tu coches cette extension. Si tu nommes une extension qui n'existe pas dans la liste au-dessus, le formulaire te prévient — le personnage resterait invisible.",
      "Une fois une partie lancée, chaque joueur peut choisir son personnage parmi ceux qui sont disponibles.",
    ],
  },
  {
    cle: "equipes",
    titre: "Jouer en équipes",
    blocs: [
      "La case « Jeu en équipes » change le sens du décompte : le nombre de joueurs devient un nombre d'équipes, et « Joueur 1 » devient « Équipe 1 ».",
      "Chaque équipe se voit attribuer ses membres, choisis parmi tes joueurs. Une victoire d'équipe est créditée à chacun d'eux dans les statistiques.",
      "Cela vaut pour les modes compteur, manches, objectif et coopératif.",
    ],
  },
  {
    cle: "reprise",
    titre: "Reprendre une partie",
    blocs: [
      "Une partie non terminée est enregistrée à chaque saisie. Ferme l'app, éteins le téléphone : elle t'attend.",
      "Un bandeau « Reprendre votre… » apparaît en haut du catalogue, et une pastille « Partie en cours » sur les jeux concernés. La croix du bandeau abandonne la partie — elle n'ira pas dans l'historique.",
      "Depuis la fiche du jeu, « Repartir de zéro » efface la partie en cours et en ouvre une neuve.",
    ],
  },
  {
    cle: "notes",
    titre: "Égalités, notes et anecdotes",
    blocs: [
      "Quand deux joueurs finissent à égalité, l'app te le dit et te laisse choisir : départager à la main, ou enregistrer l'égalité telle quelle. Une égalité ne compte de victoire pour personne.",
      "À la fin d'une partie, tu peux poser une note en étoiles et une anecdote. Les notes nourrissent la section « Jeux les mieux notés » des statistiques ; les parties non notées n'y comptent pas.",
    ],
  },
  {
    cle: "catalogue",
    titre: "Le catalogue",
    blocs: [
      "L'étoile met un jeu en favori. Les filtres croisent favoris, catégorie, nombre de joueurs et durée ; le tri range par ordre alphabétique, par jeux les plus joués, ou par parties récentes.",
      "Le bouton + propose la bibliothèque de jeux tout prêts, un jeu partagé à coller, ou le formulaire complet.",
      "Tous les jeux se valent : celui que tu as créé et celui qui vient de la bibliothèque se modifient et se suppriment de la même façon, depuis leur fiche.",
    ],
  },
  {
    cle: "partage",
    titre: "Partager un jeu",
    blocs: [
      "L'icône de partage, sur la fiche d'un jeu, en produit une description complète en texte. Envoie-la à qui tu veux.",
      "En face, « Coller un jeu partagé » remplit le formulaire à partir de ce texte. Rien n'est enregistré avant que tu ne valides : tu peux tout relire, et tout corriger.",
    ],
  },
  {
    cle: "joueurs",
    titre: "Joueurs et statistiques",
    blocs: [
      "Les noms saisis pendant une partie rejoignent la liste des joueurs. Touche un joueur pour voir sa fiche : ses parties, son taux de victoire par jeu, son adversaire favori, sa plus longue série de victoires.",
      "Renommer un joueur le renomme dans tout l'historique. Lui donner le nom d'un joueur existant fusionne les deux, et additionne leurs statistiques — pratique quand « Alex » et « alex » se sont glissés dans la base.",
      "Retirer un joueur de la liste ne touche pas à ses parties passées.",
    ],
  },
  {
    cle: "donnees",
    titre: "Sauvegarde et données",
    blocs: [
      "« Exporter mes données » écrit un fichier contenant tout : parties, joueurs, jeux et favoris. Garde-le quelque part.",
      "« Restaurer une sauvegarde » remplace l'intégralité des données actuelles par celles du fichier. Le dialogue annonce ce qu'il contient avant de rien toucher.",
      "« Vider l'historique », dans la zone dangereuse, efface les parties et rien d'autre : les jeux, les joueurs et les favoris restent. C'est sans retour, alors exporte d'abord.",
      "Dans l'historique, un appui long sur une partie ouvre la sélection multiple, pour un ménage plus fin.",
    ],
  },
];
