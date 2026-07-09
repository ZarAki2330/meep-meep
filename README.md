# Meep Meep

Application mobile pour gérer sa ludothèque de jeux de société : parcourir ses jeux, consulter les règles, et tenir les scores des parties en cours. Fonctionne entièrement **hors-ligne**.

## Fonctionnalités

Le catalogue liste les jeux avec une recherche et des filtres (favoris, catégorie, nombre de joueurs, durée). Chaque jeu a une fiche avec sa description, ses règles dépliables, ses extensions et ses personnages.

Trois modes de score couvrent la plupart des jeux :

- **Compteur** — des points qu'on monte et descend, le plus ou le moins de points gagne (Catan, 6 qui prend!).
- **Objectif** — pas de points, on désigne le vainqueur. Chaque joueur peut choisir son personnage (Villainous).
- **Feuille de score** — une grille de catégories avec sections, aides et bonus optionnel (Yams).

Les parties terminées sont enregistrées dans un historique, avec des statistiques par joueur (parties jouées, victoires, jeu favori). On peut aussi ajouter, modifier et supprimer ses propres jeux depuis l'app, y compris leur feuille de score personnalisée.

L'app propose un thème clair (crème) et un thème sombre, mémorisé entre les sessions.

## Stack technique

- **Expo (React Native)** + TypeScript
- **Expo Router** pour la navigation par fichiers
- **expo-sqlite** pour le stockage local (parties, joueurs, jeux, favoris)
- **AsyncStorage** pour la préférence de thème
- **expo-font** avec Fredoka pour la police de marque

## Démarrer

Il faut Node.js (LTS) et l'app **Expo Go** sur son téléphone.

```bash
npm install
npx expo start
```

Scanner le QR code affiché avec Expo Go. Pour repartir d'un cache propre : `npx expo start -c`.

## Structure

```
app/                 écrans (Expo Router)
  (tabs)/            catalogue, historique, joueurs
  jeu/[id]           fiche d'un jeu
  partie/[jeuId]     mode compteur
  objectif/[jeuId]   mode objectif
  grille/[jeuId]     mode feuille de score
  import.tsx         ajout / modification d'un jeu
components/          composants réutilisables
constants/           palette de couleurs, polices
context/             thème et source des jeux
data/jeux.ts         catalogue intégré
db/                  accès SQLite
```
