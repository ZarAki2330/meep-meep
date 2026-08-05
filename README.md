<h1 align="center">
  <img src="assets/images/logo-readme.png" alt="" height="38" />
  &nbsp;Meep Meep
</h1>

<p align="center">
  <strong>Ta ludothèque de jeux de société, dans ta poche.</strong><br/>
  Retrouve une grande liste de jeux, lis leurs règles en français,<br/>
  et gère les scores de tes parties en direct — le tout 100&nbsp;% hors-ligne, sans compte.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Expo-SDK%2054-000020?logo=expo&logoColor=white" alt="Expo" />
  <img src="https://img.shields.io/badge/React%20Native-0.81-61DAFB?logo=react&logoColor=black" alt="React Native" />
  <img src="https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/SQLite-local-003B57?logo=sqlite&logoColor=white" alt="SQLite" />
  <img src="https://img.shields.io/badge/100%25-hors--ligne-2ea44f" alt="Hors-ligne" />
  <img src="https://img.shields.io/badge/Accessibilit%C3%A9-WCAG%20AA-2ea44f" alt="Accessibilité" />
  <img src="https://img.shields.io/badge/catalogue-428%20jeux-7a5195" alt="Catalogue" />
</p>

## Fonctionnalités

- **Catalogue de 428 jeux** avec description, catégorie, éditeur et **règles résumées en français**.
- **5 modes de score** : compteur de points, objectif (sans points), manches, feuille de score (type *Yams*) et coopératif — avec **plusieurs vainqueurs possibles** là où la victoire se joue en camp (L'Imposteur, Bang!, Villainous).
- **Extensions & éditions** rattachées à chaque jeu de base (Villainous, Loup-Garou, Cyclades…).
- **Personnages / rôles jouables** avec un avatar chacun (photo, logo ou pastille colorée) — pratique pour Villainous, L'Imposteur ou le Loup-Garou.
- **Historique des parties** et **statistiques** par jeu et par joueur.
- **Favoris**, **recherche**, **filtres** (catégorie, nombre de joueurs, durée) et **tris**.
- **Ajout de tes propres jeux** via un formulaire complet, ou import d'un **jeu partagé**.
- **Partage** par la feuille de partage du téléphone : un jeu (réimportable tel quel par le destinataire) ou le **compte-rendu d'une partie** — classement, équipes, durée, note. Sans compte et sans serveur : c'est toi qui choisis le destinataire.
- **Liens vers les règles officielles** des éditeurs, directement sur la fiche.
- **Thème clair/sombre** et **couleur d'accent** au choix.
- Pensée pour l'**accessibilité** (contrastes vérifiés, lecteurs d'écran).

## Structure du projet

| Dossier / fichier | Rôle |
|---|---|
| `app/` | Les écrans (*expo-router*) : accueil, fiche d'un jeu, écrans de partie, historique… |
| `components/` | Composants réutilisables (visuels, avatars, dialogues…) |
| `db/` | La base locale *SQLite* (jeux, parties, favoris, parties en cours) |
| `data/` | Les types et la bibliothèque de départ |
| `lib/` | La logique métier (score, catalogue, regroupement, parsing…) |
| `hooks/` · `context/` | État partagé et hooks |
| `constants/` | Thème, couleurs, police |
| `__tests__/` | Les tests unitaires de la logique métier |
| `catalogue.json` | Le **catalogue des jeux**, servi à distance et mis en cache |

## Lancer le projet

1. `npm install`
2. `npx expo start`
3. Scanne le QR code avec l'app **Expo Go**, ou lance un build : `eas build --profile preview --platform android`.

> Certains éléments natifs (icône de l'app, écran de démarrage, barre de navigation) ne s'affichent qu'en **build EAS**, pas dans Expo Go — c'est normal.

Les tests unitaires de la logique métier (scores, vainqueurs, tris, partage…) se lancent avec `npm test`.

## Le catalogue

Le fichier `catalogue.json` est **servi depuis GitHub** et mis en cache par l'app : on peut ajouter ou corriger des jeux sans republier l'application. Chaque jeu porte sa catégorie, son éditeur, ses règles, un visuel et son mode de score.

Le téléchargement est **conditionnel** : l'app présente au serveur la signature de la version qu'elle détient (`If-None-Match`), et ne retélécharge rien tant que le catalogue n'a pas changé. Sans réseau, elle se contente du dernier cache connu — rien n'est jamais bloquant.

> Toutes les règles du catalogue sont des **résumés originaux rédigés à la main**, jamais le texte officiel des livrets.

## Stack

*Expo SDK 54* · *React Native* · *TypeScript* · *expo-router* · *expo-sqlite* · *expo-image* · police *Fredoka*. Tout est stocké en local : aucune donnée ne quitte l'appareil, sauf ce que tu envoies toi-même par le partage.

## Licence

© 2026 — **Tous droits réservés**. Voir [`LICENSE`](./LICENSE). Les noms de jeux, visuels et règles officielles des éditeurs référencés dans l'application restent la propriété de leurs détenteurs respectifs.
