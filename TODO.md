# Meep Meep — Feuille de route

Liste des fonctionnalités à faire et des améliorations. Les cases cochées sont terminées.

## Priorité haute

- [x] ~~**Export / import des données**~~ — fait : écran Réglages, export dans un fichier JSON partageable, restauration avec confirmation.
- [x] ~~**Gestion des égalités**~~ — fait : dialogue au moment de terminer, départage manuel ou enregistrement d'une égalité.
- [ ] **Compiler l'app (EAS build)** — installer l'app pour de vrai sur le téléphone, sans passer par Expo Go. C'est aussi ce qui fera apparaître l'icône Meep Meep.

## Améliorations des fonctionnalités existantes

- [ ] **Couleur d'accent au choix** — dans les Réglages, proposer 5 pastilles de couleurs prédéfinies (violet, bleu, vert, corail, jaune…). Le choix s'applique à toute l'app **et au logo**, et s'adapte automatiquement au thème clair comme au thème sombre. Mémorisé entre les sessions.
  - Technique : chaque couleur définit un jeu de teintes (accent, accentText, accentSoft) pour le mode clair et le mode sombre. Le logo étant monochrome avec transparence, il peut être recoloré à la volée avec `tintColor` sur le composant `Image` — inutile de générer un PNG par couleur.

- [ ] **Renommer / fusionner des joueurs** — « Lucie » et « lucie » créent deux joueurs distincts et faussent les statistiques.
- [ ] **Modifier une partie passée** — aujourd'hui on ne peut que la supprimer si un score est faux.
- [ ] **Chronomètre de partie** — mesurer la durée réelle, puis l'exploiter dans les statistiques (durée moyenne par jeu, partie la plus longue).
- [ ] **Recherche et filtres dans l'historique** — retrouver une partie précise quand la liste sera longue.
- [ ] **Mode « manches »** — un quatrième mode de score, avec une colonne par manche et un total automatique (utile pour le 6 qui prend).
- [ ] **Image depuis la galerie** — choisir une photo de sa propre boîte de jeu au lieu de coller une URL.

## Petits plus

- [ ] **Tirage au sort du premier joueur**
- [ ] **Notes sur une partie** — consigner une anecdote
- [x] ~~**Écran « À propos »**~~ — fait : intégré au bas des Réglages (logo, version, signature)

## En attente

- [ ] **Jeton BoardGameGeek** — demande d'application envoyée, réponse sous une semaine ou plus. Le code d'import est déjà prêt.
- [ ] **Logo « Powered by BGG »** — obligatoire si l'application est déclarée publique.

## Terminé

- [x] Catalogue avec recherche et filtres (favoris, catégorie, joueurs, durée)
- [x] Fiche de jeu : description, règles dépliables, extensions, personnages
- [x] Trois modes de score : compteur, objectif, feuille de score
- [x] Feuille de score générique (sections, aides, bonus, scores négatifs)
- [x] Choix du personnage par joueur (Villainous), filtré par extensions
- [x] Historique des parties, avec détail au clic
- [x] Onglet Joueurs : liste, statistiques, sélection rapide en partie
- [x] Onglet Statistiques : tableau de bord et filtre par jeu
- [x] Favoris avec étoile cliquable
- [x] Ajouter, modifier et supprimer ses propres jeux
- [x] Thème clair (crème) et thème sombre, mémorisés
- [x] Logo, police Fredoka, icône de l'app
- [x] Dialogues de confirmation personnalisés
- [x] Bouton partager
- [x] Reprise d'une partie en cours après fermeture de l'app
- [x] Projet versionné sur GitHub
