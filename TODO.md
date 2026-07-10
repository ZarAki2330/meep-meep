# Meep Meep — Feuille de route

Liste des fonctionnalités à faire et des améliorations.

**Progression : 54 / 57 — 95 %**

`███████████████████░`

## Priorité haute

- [ ] **Compiler l'app (EAS build)** — installer l'app pour de vrai sur le téléphone, sans passer par Expo Go. C'est aussi ce qui fera apparaître l'icône Meep Meep.

## Qualité du projet


## Nouvelles fonctionnalités

- [ ] **Étudier la faisabilité d'une API maison** — se renseigner sur ce qu'il faudrait pour héberger sa propre API : à quoi elle servirait (bibliothèque de jeux partagée et mise à jour sans republier l'app, synchronisation entre appareils, sauvegarde en ligne, contournement du jeton BoardGameGeek), quel hébergement, quel coût, quelles obligations (RGPD, comptes utilisateurs), et si un simple fichier JSON servi en statique suffirait.


## En attente

- [ ] **Jeton BoardGameGeek** — demande d'application envoyée, réponse sous une semaine ou plus. Le code d'import est déjà prêt. Le bouton « Chercher sur BoardGameGeek » est retiré du formulaire en attendant : l'écran `app/bgg.tsx` et `lib/bgg.ts` sont intacts, il n'y a qu'à remettre le bouton.
- [ ] **Logo « Powered by BGG »** — obligatoire si l'application est déclarée publique.

## Terminé

- [x] Accessibilité vérifiée sur un vrai téléphone
- [x] README réécrit : structure réelle, et des notes d'architecture qui listent les pièges plutôt que les évidences
- [x] Bugs connus corrigés : mode de score changé, case supprimée, abandon depuis la fiche, tirage en équipes, homonymes
- [x] Chasse aux bugs : « continuer à modifier », noms vides, équipes confondues avec des joueurs, JSON non-tableau
- [x] Revue de code : douze fichiers morts supprimés, JSON de l'historique analysé une seule fois par écran
- [x] Logique de score extraite des écrans dans `lib/score.ts`, et testée (Yams, Skull King, 6 qui prend)
- [x] Tests automatisés : 157 tests sur `lib/` (jest-expo), et le renommage d'un joueur extrait de la base
- [x] Accessibilité : contrastes WCAG AA sur les six accents et les deux thèmes, grandes polices, tableaux de manches et de feuille de score
- [x] Accessibilité : libellés, rôles et états pour les lecteurs d'écran sur tout ce qui se touche
- [x] Photos des joueurs dans les écrans de partie (compteur, objectif, coopératif)
- [x] Skull King éprouvé en conditions réelles (mode manches, scores négatifs, total cumulé)
- [x] Photo de profil par joueur, avec le même cycle de vie que les photos de jeux
- [x] Tableaux de statistiques limités à cinq lignes, avec « Voir les N autres »
- [x] Bulles « ? » dans le formulaire, ouvrant la bonne section de l'aide
- [x] Écran d'aide dans les Réglages, en sections dépliables
- [x] Fiche par joueur : taux de victoire par jeu, adversaire favori, plus longue série, dernières parties
- [x] Note moyenne dans les statistiques : métrique globale et classement « Jeux les mieux notés »
- [x] Extensions et personnages modifiables depuis le formulaire, parseurs isolés dans `lib/parse-jeu.ts`
- [x] Nettoyage des photos : effacées avec leur jeu, à leur remplacement, et balayage des orphelines au démarrage
- [x] Vider l'historique : sélection multiple par appui long, et remise à zéro dans les Réglages
- [x] Fiche de jeu : vignette carrée à gauche, nom et catégorie à sa droite, au lieu de la bannière pleine largeur
- [x] Bandeau « Reprendre votre… » sur le catalogue, pastille sur les jeux concernés, abandon avec confirmation
- [x] Bibliothèque de jeux prédéfinis : écran « Ajouter un jeu tout prêt », 18 jeux livrés
- [x] Plus de distinction entre jeux « natifs » et jeux « ajoutés » : tous vivent en base, tous se modifient et se suppriment
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
