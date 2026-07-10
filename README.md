# Meep Meep

Application mobile pour gérer sa ludothèque de jeux de société : parcourir ses jeux, consulter les règles, et tenir les scores des parties. Fonctionne entièrement **hors-ligne** — aucune donnée ne quitte le téléphone.

Créée par Zaraki.

## Fonctionnalités

Le catalogue liste les jeux avec une recherche, des filtres (favoris, catégorie, nombre de joueurs, durée) et un tri (alphabétique, les plus joués, joués récemment). Chaque jeu a une fiche avec sa description, ses règles, ses extensions et ses personnages.

Cinq modes de score couvrent la plupart des jeux :

- **Compteur** — des points qu'on monte et descend, le plus ou le moins de points gagne (Catan, 6 qui prend !).
- **Manches** — une ligne par manche, total calculé automatiquement, scores négatifs acceptés (belote, Skull King).
- **Objectif** — pas de points, on désigne le vainqueur. Chaque joueur peut choisir son personnage (Villainous).
- **Feuille de score** — une grille de catégories avec sections, aides et bonus optionnel (Yams).
- **Coopératif** — pas de classement : toute la table gagne ou perd ensemble (Pandémie).

Tous les modes acceptent le jeu **en équipes** : la ligne représente alors une équipe, et la victoire est créditée à chacun de ses membres. Une partie peut se terminer sur une **égalité**, qui ne crédite personne. Un chronomètre tourne pendant la partie, un tirage au sort désigne le premier joueur, et une partie interrompue se reprend là où elle s'était arrêtée, même après avoir fermé l'app. Un bandeau sur le catalogue rappelle les parties qui attendent.

À la fin d'une partie, on peut lui donner une note en étoiles et y attacher une anecdote.

Les parties terminées vont dans un historique consultable, filtrable et modifiable, avec sélection multiple pour le ménage. Un onglet Statistiques en tire un tableau de bord (classement, meilleurs scores, jeux les mieux notés, durées, activité mensuelle), et un onglet Joueurs mène à la fiche de chacun : taux de victoire par jeu, adversaire favori, plus longue série de victoires. Un joueur se renomme ou se fusionne avec un autre, et peut porter une photo.

Un jeu s'ajoute de quatre façons : depuis la **bibliothèque** de jeux tout prêts livrée avec l'app, en le saisissant, en collant un jeu partagé par quelqu'un d'autre, ou en l'important depuis BoardGameGeek. Une fois au catalogue, tous les jeux se valent : chacun se modifie et se supprime. Les données s'exportent et se restaurent dans un fichier.

L'app propose un thème clair (crème) et un thème sombre, et six couleurs d'accent qui s'appliquent à toute l'interface, logo compris. Un écran d'aide explique les modes de score et les syntaxes de saisie. L'interface est étiquetée pour les lecteurs d'écran, et ses contrastes atteignent le seuil WCAG AA.

## Stack technique

- **Expo (React Native)** + TypeScript
- **Expo Router** pour la navigation par fichiers
- **expo-sqlite** pour le stockage local (parties, joueurs, jeux, favoris, partie en cours)
- **AsyncStorage** pour le thème et la couleur d'accent
- **expo-font** avec Fredoka pour la police de marque
- **jest-expo** pour les tests

## Démarrer

Il faut Node.js (LTS) et l'app **Expo Go** sur son téléphone.

```bash
npm install
npx expo start
```

Scanner le QR code affiché avec Expo Go. Pour repartir d'un cache propre : `npx expo start -c`.

```bash
npm test        # la suite de tests
npm run lint    # eslint
```

L'import BoardGameGeek demande un jeton, à placer dans un fichier `.env.local` non versionné :

```
EXPO_PUBLIC_BGG_TOKEN=...
```

En attendant ce jeton, le bouton « Chercher sur BoardGameGeek » est retiré du formulaire. L'écran `app/bgg.tsx` et `lib/bgg.ts` sont intacts : il n'y a qu'à remettre le bouton.

## Structure

```
app/                    écrans (Expo Router)
  (tabs)/               catalogue, historique, joueurs, statistiques
  jeu/[id]              fiche d'un jeu
  joueur/[nom]          fiche d'un joueur
  partie/[jeuId]        mode compteur
  manches/[jeuId]       mode manches
  objectif/[jeuId]      mode objectif
  grille/[jeuId]        mode feuille de score
  coop/[jeuId]          mode coopératif
  bibliotheque.tsx      ajouter un jeu tout prêt
  import.tsx            saisie / modification d'un jeu
  bgg.tsx               recherche BoardGameGeek
  aide.tsx              mode d'emploi
  reglages.tsx          thème, couleurs, sauvegarde, à propos
components/             en-tête, dialogues, avatar, visuel de jeu
constants/              palette de couleurs, polices
context/                thème, et source unique des jeux
data/
  jeux.ts               la FORME d'un jeu (types seulement)
  bibliotheque.ts       les jeux tout prêts livrés avec l'app
  aide.ts               le contenu de l'écran d'aide
db/                     accès SQLite, une table par fichier
hooks/                  use-partie (le tronc commun), use-chrono
lib/                    fonctions pures — aucune base, aucun JSX
  score.ts              totaux, bonus, classement, seuil de fin
  lignes-partie.ts      lire une partie : qui joue, qui a gagné
  stats-joueur.ts       statistiques d'un joueur
  renommage.ts          renommer un joueur dans l'historique
  parse-jeu.ts          texte ↔ cases, extensions, personnages
  jeu-partage.ts        format d'échange d'un jeu
  tri-catalogue.ts      tri du catalogue
  images.ts             cycle de vie des photos
  route-partie.ts       quel écran pour quel mode de score
  duree.ts, bgg.ts
__tests__/              157 tests, un fichier par module de lib/
```

## Notes d'architecture

Ce qui suit n'est pas une description : ce sont les pièges. Chacun a coûté un bug.

### Les données n'existent qu'à un seul endroit

Tout est en SQLite sur le téléphone. Les migrations sont des `ALTER TABLE … ADD COLUMN` enveloppés dans un `try/catch` : la colonne existe déjà, ou elle est ajoutée. Il n'y a pas de numéro de version de schéma.

**Aucun jeu ne vit dans le code.** `data/jeux.ts` ne contient que des types. `data/bibliotheque.ts` contient des jeux *tout prêts*, qui n'existent qu'une fois ajoutés au catalogue. Au premier lancement, cinq d'entre eux sont déposés en base avec leurs identifiants d'origine — ainsi les favoris et l'historique des versions précédentes restent valables. Un drapeau dans la table `meta` empêche un jeu supprimé de réapparaître au lancement suivant.

### Les jeux pilotent les écrans

Un écran de score ne connaît pas les règles d'un jeu : il lit `scoreMode`, `scoreVictoire`, `seuilFin`, `categories`, `bonus`, `equipes` et se configure. Ajouter un jeu ne demande donc pas d'écrire du code.

Corollaire : **modifier un jeu peut invalider une partie en cours.** L'état sauvegardé porte le mode qui l'a produit ; si le mode a changé, l'état est effacé plutôt que rouvert amputé. Et la feuille de score jette, à la reprise, les cases que le jeu ne connaît plus.

### Le tronc commun des parties vit dans `hooks/use-partie.ts`

Les cinq écrans de score y délèguent les joueurs, le chronomètre, la sauvegarde de la partie en cours, les dialogues et l'enregistrement final. Chacun ne garde que sa façon de compter les points.

Attention en le modifiant :

- Les valeurs lues dans ses effets passent par des `ref`. Un objet recréé à chaque rendu relancerait l'effet en boucle.
- `terminerPartie` **corrige** la ligne d'historique quand la partie a déjà été enregistrée — c'est ce qui fait marcher « continuer à modifier ». L'identifiant de la partie est persisté avec l'état sauvegardé, sinon une reprise après « continuer » créerait un doublon.

### Une ligne de partie n'est pas un joueur

C'est l'invariant le plus coûteux de l'app. Le champ `details` d'une partie contient un tableau de **lignes**. Une ligne est un joueur, **ou une équipe** qui en cache plusieurs. Et `gagnant` porte le nom de la **ligne** victorieuse : en équipes, c'est le nom de l'équipe, jamais celui d'un joueur.

Quatre écrans avaient chacun leur façon de s'en sortir, et chacun se trompait différemment. Tout passe désormais par `lib/lignes-partie.ts` :

- `lignesDe(details)` — un `JSON.parse` réussi ne garantit rien : `JSON.parse("null")` rend `null`.
- `personnesDe(ligne)` — les membres d'une équipe, ou le joueur lui-même.
- `participantsDe(lignes)` — sans doublon : un joueur inscrit dans deux équipes ne joue qu'une partie.
- `vainqueursDe(partie)` — les membres de l'équipe gagnante, toute la table sur un coopératif gagné, personne sur une égalité ou une défaite.

### L'issue d'une partie se lit en deux temps

En compétitif, `gagnant` porte le nom du vainqueur, ou **une chaîne vide pour une égalité**. En coopératif, `gagnant` est vide et c'est la colonne `resultat` qui vaut `victoire` ou `defaite`.

Conséquence : un joueur dont on a vidé le nom aurait une victoire indistinguable d'une égalité. Les écrans enregistrent donc `nomDe(joueur)`, qui rend son nom par défaut à un champ effacé.

### Le seuil de fin regarde le pire score

`seuilFin` s'apprécie sur le score le plus **haut**, même quand le moins de points gagne. Au 6 qui prend, la partie s'arrête quand quelqu'un atteint 66 têtes de bœuf — et c'est le plus bas total qui l'emporte. D'où `meilleur` et `pire`, deux notions distinctes dans `lib/score.ts`.

### `lib/` ne connaît pas la base

Tout ce qui est dans `lib/` est pur : pas de SQLite, pas de JSX, pas d'état. C'est ce qui le rend testable, et c'est pourquoi le renommage d'un joueur y a été extrait de `db/joueurs.ts`. Quand la base a besoin d'effacer un fichier, elle **rend le chemin** à l'appelant plutôt que de toucher au disque.

Les 157 tests portent tous sur `lib/`. Les écrans ne sont pas testés — mais ils ne calculent plus rien.

### Les photos ont un cycle de vie

Une photo choisie dans la galerie est recopiée dans le stockage de l'app, sinon elle disparaît avec le cache du téléphone. Ce qui est copié doit être effacé : à la suppression du jeu ou du joueur, au remplacement de la photo, et par un balayage des orphelines au démarrage (`lib/menage-images.ts`). Une URL, elle, ne nous appartient pas — on n'y touche jamais.

### Les couleurs sont mesurées, pas choisies

Toutes les paires texte/fond de `constants/theme-colors.ts` atteignent 4,5:1 dans les deux thèmes et les six accents. Deux exceptions assumées : `textFaint` ne sert qu'à des **icônes** inactives (seuil 3:1, jamais de texte), et les bordures sont décoratives. Si tu touches à une couleur, refais le calcul.

### L'en-tête est maison

L'en-tête natif de la pile se plaçait parfois sous la barre d'état sur Android ; `headerShown` est donc à `false` partout, et chaque écran dessine son `<Entete />`.
