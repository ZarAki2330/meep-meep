# Meep Meep — Feuille de route

Liste des fonctionnalités à faire et des améliorations.

## Priorité haute

- [ ] **Compiler l'app (EAS build)** — installer l'app pour de vrai sur le téléphone, sans passer par Expo Go. C'est aussi ce qui fera apparaître l'icône Meep Meep.

## Qualité du projet

- [ ] **Tests automatisés** — toute la logique délicate est déjà isolée dans des fonctions pures : calcul des totaux et du bonus, détection des égalités, renommage d'un joueur propagé à l'historique, parseur de catégories, format d'échange des jeux. Quelques tests les verrouilleraient bien plus sûrement qu'un parcours manuel.
- [ ] **Revue de code et optimisation** — supprimer le code mort, vérifier les rendus inutiles et les dépendances des effets.
- [ ] **Chasse aux bugs** — parcourir méthodiquement chaque écran et chaque cas limite : aucun joueur, un seul joueur, noms vides, scores négatifs, très longues listes, thème sombre, rotation, reprise de partie.
- [ ] **Tester le jeu Skull King** — bon cas d'épreuve pour le mode manches : dix manches de longueur fixe, scores négatifs quand le contrat n'est pas rempli, et le plus de points gagne. Vérifier la saisie du signe moins, l'ajout de manches, et le total cumulé.
- [ ] **Documenter le projet** — le README et ses notes d'architecture sont à jour. Reste à commenter les endroits délicats du code au fil des relectures.

## Manques repérés

- [ ] **Aucune partie en cours visible depuis le catalogue** — il faut ouvrir la fiche d'un jeu pour découvrir qu'une partie attend. Un bandeau « Reprendre votre Yams » sur l'accueil réglerait ça.
- [ ] **Impossible de vider l'historique** — ni suppression multiple, ni remise à zéro.
- [ ] **Les photos des jeux supprimés restent dans le stockage** — prévoir un nettoyage à la suppression.

## Nouvelles fonctionnalités

- [ ] **Bibliothèque de jeux prédéfinis** — un écran « Ajouter un jeu tout prêt » proposant une liste de jeux déjà décrits (Skull King, belote, 7 Wonders, et tous ceux qui sont aujourd'hui codés en dur). On en choisit un, il atterrit dans le catalogue comme un jeu ajouté : modifiable et supprimable. À terme, les jeux natifs de `data/jeux.ts` viendraient de cette bibliothèque, ce qui supprimerait la distinction entre jeux « natifs » et jeux « importés ».
- [ ] **Note moyenne par jeu dans les statistiques** — maintenant que les parties sont notées, savoir quel jeu procure les meilleures soirées.
- [ ] **Écran de détail par joueur** — ses parties, son taux de victoire par jeu, son adversaire favori, sa plus longue série de victoires.
- [ ] **Tutoriel / aide dans les Réglages** — un écran d'aide expliquant les fonctionnalités : les modes de score et quand utiliser chacun, la syntaxe des cases et du bonus, les extensions et personnages, les favoris, l'export/import, la reprise de partie. Idéalement des sections dépliables, et de petites bulles d'aide contextuelles dans le formulaire d'ajout de jeu.
- [ ] **Accessibilité** — libellés pour les lecteurs d'écran, contrastes, tailles de police.


## En attente

- [ ] **Jeton BoardGameGeek** — demande d'application envoyée, réponse sous une semaine ou plus. Le code d'import est déjà prêt.
- [ ] **Logo « Powered by BGG »** — obligatoire si l'application est déclarée publique.

## Terminé

- [x] Catalogue avec recherche et filtres (favoris, catégorie, joueurs, durée)
- [x] Tri du catalogue : alphabétique, les plus joués, joués récemment
- [x] Fiche de jeu : description, règles dépliables, extensions, personnages
- [x] Cinq modes de score : compteur, manches, objectif, feuille de score, coopératif
- [x] Hook `usePartie` : joueurs, chronomètre, reprise et enregistrement, écrits une seule fois
- [x] Feuille de score générique (sections, aides, bonus, scores négatifs)
- [x] Mode équipes dans les quatre modes de score : membres par équipe, victoires créditées à chacun
- [x] Seuil de fin de partie configurable depuis le formulaire
- [x] Choix du personnage par joueur (Villainous), filtré par extensions
- [x] Gestion des égalités : départage manuel ou enregistrement d'une égalité
- [x] Chronomètre de partie, durée enregistrée et exploitée dans les statistiques
- [x] Reprise d'une partie en cours après fermeture de l'app
- [x] Tirage au sort du premier joueur
- [x] Note en étoiles et anecdote à la fin d'une partie
- [x] Historique des parties, avec détail et modification au clic
- [x] Recherche et filtres dans l'historique (jeu, joueur, période)
- [x] Onglet Joueurs : liste, statistiques, renommage et fusion
- [x] Onglet Statistiques : tableau de bord et filtre par jeu
- [x] Favoris avec étoile cliquable
- [x] Ajouter, modifier et supprimer ses propres jeux
- [x] Image d'un jeu choisie dans la galerie du téléphone (ou par URL)
- [x] Export et import des données (sauvegarde)
- [x] Thème clair (crème) et thème sombre, mémorisés
- [x] Six couleurs d'accent au choix, appliquées à toute l'app et au logo
- [x] Logo, police Fredoka, icône de l'app
- [x] Dialogues de confirmation personnalisés
- [x] Écran Réglages avec « À propos »
- [x] Bouton partager
- [x] En-tête maison, corrigeant le chevauchement avec la barre d'état sur Android
- [x] Projet versionné sur GitHub
