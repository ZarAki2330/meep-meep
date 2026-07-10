# Meep Meep

Application mobile pour gérer sa ludothèque de jeux de société : parcourir ses jeux, consulter les règles, et tenir les scores des parties en cours. Fonctionne entièrement **hors-ligne** — aucune donnée ne quitte le téléphone.

Créée par Zaraki.

## Fonctionnalités

Le catalogue liste les jeux avec une recherche, des filtres (favoris, catégorie, nombre de joueurs, durée) et un tri (alphabétique, les plus joués, joués récemment). Chaque jeu a une fiche avec sa description, ses règles dépliables, ses extensions et ses personnages.

Cinq modes de score couvrent la plupart des jeux :

- **Compteur** — des points qu'on monte et descend, le plus ou le moins de points gagne (Catan, 6 qui prend!).
- **Manches** — une ligne par manche, total calculé automatiquement, scores négatifs acceptés (belote, Skull King).
- **Objectif** — pas de points, on désigne le vainqueur. Chaque joueur peut choisir son personnage (Villainous).
- **Feuille de score** — une grille de catégories avec sections, aides et bonus optionnel (Yams).
- **Coopératif** — pas de classement : toute la table gagne ou perd ensemble (Pandémie).

Tous les modes acceptent le jeu **en équipes** : la ligne représente alors une équipe, et la victoire est créditée à chacun de ses membres. Une partie peut se terminer sur une **égalité**, qui ne crédite personne. Un chronomètre tourne pendant la partie, un tirage au sort désigne le premier joueur, et une partie interrompue se reprend là où elle s'était arrêtée, même après avoir fermé l'app.

À la fin d'une partie, on peut lui donner une note en étoiles et y attacher une anecdote.

Les parties terminées vont dans un historique consultable, filtrable et modifiable. Un onglet Statistiques en tire un tableau de bord (classement, meilleurs scores, durées, activité mensuelle), et un onglet Joueurs suit chacun individuellement, avec renommage et fusion.

On peut ajouter, modifier et supprimer ses propres jeux depuis l'app, en les saisissant, en collant un jeu partagé par quelqu'un d'autre, ou en les important depuis BoardGameGeek. Les données s'exportent et se restaurent dans un fichier.

L'app propose un thème clair (crème) et un thème sombre, et six couleurs d'accent qui s'appliquent à toute l'interface, logo compris. Ces préférences sont mémorisées.

## Stack technique

- **Expo (React Native)** + TypeScript
- **Expo Router** pour la navigation par fichiers
- **expo-sqlite** pour le stockage local (parties, joueurs, jeux, favoris, partie en cours)
- **AsyncStorage** pour le thème et la couleur d'accent
- **expo-font** avec Fredoka pour la police de marque

## Démarrer

Il faut Node.js (LTS) et l'app **Expo Go** sur son téléphone.

```bash
npm install
npx expo start
```

Scanner le QR code affiché avec Expo Go. Pour repartir d'un cache propre : `npx expo start -c`.

L'import BoardGameGeek demande un jeton, à placer dans un fichier `.env.local` non versionné :

```
EXPO_PUBLIC_BGG_TOKEN=...
```

## Structure

```
app/                 écrans (Expo Router)
  (tabs)/            catalogue, historique, joueurs, statistiques
  jeu/[id]           fiche d'un jeu
  partie/[jeuId]     mode compteur
  manches/[jeuId]    mode manches
  objectif/[jeuId]   mode objectif
  grille/[jeuId]     mode feuille de score
  coop/[jeuId]       mode coopératif
  import.tsx         ajout / modification d'un jeu
  bgg.tsx            recherche BoardGameGeek
  reglages.tsx       thème, couleurs, sauvegarde, à propos
components/          composants réutilisables (en-tête, dialogues)
constants/           palette de couleurs, polices
context/             thème et source des jeux
data/jeux.ts         catalogue intégré
db/                  accès SQLite
hooks/               use-partie, use-chrono
lib/                 fonctions pures (tri, durées, partage, BGG)
```

## Notes d'architecture

**Les données n'existent qu'à un seul endroit.** Tout est en SQLite sur le téléphone. Les migrations sont des `ALTER TABLE … ADD COLUMN` enveloppés dans un `try/catch` : la colonne existe déjà, ou elle est ajoutée.

**Les jeux pilotent les écrans.** Un écran de score ne connaît pas les règles d'un jeu : il lit `scoreMode`, `scoreVictoire`, `seuilFin`, `categories`, `bonus`, `equipes` et se configure. Ajouter un jeu ne demande donc pas d'écrire du code.

**Le tronc commun des parties vit dans `hooks/use-partie.ts`.** Les cinq écrans de score y délèguent les joueurs, le chronomètre, la sauvegarde de la partie en cours, les dialogues et l'enregistrement final. Chacun ne garde que sa façon de compter les points. Attention en le modifiant : les valeurs lues dans ses effets passent par des `ref`, car un objet recréé à chaque rendu relancerait l'effet en boucle.

**L'issue d'une partie se lit en deux temps.** En compétitif, `gagnant` porte le nom du vainqueur, ou une chaîne vide pour une égalité. En coopératif, `gagnant` est vide et c'est la colonne `resultat` qui vaut `victoire` ou `defaite`.

**L'en-tête est maison.** L'en-tête natif de la pile se plaçait parfois sous la barre d'état sur Android ; `headerShown` est donc à `false` partout, et chaque écran dessine son `<Entete />`.
