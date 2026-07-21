# Meep Meep — Feuille de route

Liste des fonctionnalités à faire et des améliorations.

**Progression : 82 / 90 — 91 %**

`██████████████████░░`

## Bugs à corriger

_Aucun bug en attente. 🎉_

## Priorité haute

- [ ] **Protéger la propriété de l'application** — affirmer que Meep Meep t'appartient et interdire la copie/redistribution. Concrètement : ajouter un fichier `LICENSE` propriétaire (« tous droits réservés »), un en-tête de copyright, une mention « © Zaraki — Tous droits réservés » dans l'écran « À propos », et vérifier que le dépôt GitHub est en **privé** (un dépôt public est copiable par défaut). ⚠️ Pour une vraie protection juridique (marque, CGU), l'avis d'un professionnel est recommandé — je ne suis pas juriste.
- [ ] **Publier sur le Play Store** — compte développeur Google Play (25 $, une fois). Build `production` en `.aab`, puis `eas submit`. Demandent une fiche : captures d'écran, description, politique de confidentialité (l'app ne collecte rien, mais la déclaration reste obligatoire), et le questionnaire de classification par âge.
- [ ] **Publier sur l'App Store** — adhésion Apple Developer (99 $/an). Même chose côté fiche, plus une revue humaine d'Apple : compter quelques jours et de possibles allers-retours. Le logo « Powered by BGG » devient obligatoire dès que l'app est publique.

## Qualité du projet

- [ ] **Tester le fonctionnement des extensions et éditions** — vérifier le regroupement sous le jeu de base (masquage dans la liste, remontée par la recherche, section « Extensions & éditions » sur la fiche), la migration base (`jeu_type`, `jeu_parent`) et l'ajout depuis la bibliothèque.

## Nouvelles fonctionnalités

- [ ] **Ajouter de nouveaux jeux au catalogue** _(tâche récurrente)_ — enrichir régulièrement `catalogue.json` : nouvelles sorties, gammes complétées, et finalisation des fiches provisoires (voir `claude/gigamic-fiches-provisoires.md`).
- [ ] **Afficher les règles officielles en PDF dans l'app** — se renseigner sur la faisabilité d'intégrer et d'afficher un PDF de règles directement dans la fiche du jeu (visionneuse embarquée, stockage, droits).
- [ ] **Améliorer les interfaces de l'app** — soigner les écrans, par ex. les personnages dans les jeux : une photo ou un logo par personnage.
- [ ] **Revoir le design de l'application et le logo** — rafraîchir l'identité visuelle : maquette globale (couleurs, typographie, écrans clés) et refonte du logo Meep Meep.

## En attente

_(rien en attente)_

## Terminé

- [x] Corrigé — flash des anciens jeux à l'ouverture de « Ajouter un jeu tout prêt » : le hook `useBibliotheque` démarrait sur la bibliothèque livrée (18 vieux jeux, ex. « 6 qui prend » avec son ancienne image) avant l'arrivée du catalogue distant. On garde désormais le dernier catalogue connu en mémoire de session, amorcé dès le chargement du module (`hooks/use-bibliotheque.ts`) : plus de flash de données périmées. La bibliothèque livrée ne sert plus que de repli au tout premier lancement sans cache.
- [x] Optimisé — l'écran « Ajouter un jeu tout prêt » ramait à l'application d'un tri/filtre : la carte de rendu est extraite en composant `memo` (`CarteJeu`), l'objet `styles` et les callbacks (`ajouter`, `voirFiche`, `renderItem`) sont mémoïsés, et la `FlatList` est réglée (`initialNumToRender`, `maxToRenderPerBatch`, `windowSize` — sans `removeClippedSubviews`, qui provoquait un affichage partiel « 12 puis le reste » sur Android). Au tri, les objets `Jeu` gardent la même référence : les ~300 cartes ne se re-rendent plus, elles se repositionnent seulement. Les images distantes restent en cache (`expo-image`) puisque les cartes ne remontent plus.
- [x] Plus aucun jeu pré-installé : `IDS_AMORCAGE` (data/bibliotheque.ts) est vidé — au premier lancement, le catalogue démarre vierge, l'utilisateur ajoute ce qu'il veut depuis « Ajouter un jeu tout prêt ». ⚠️ N'affecte que les nouvelles installations : un appareil qui avait déjà les 5 jeux amorcés (Pandémie, Catan, 6 qui prend, Villainous, Yams) les garde tant qu'on ne les supprime pas à la main (ou qu'on n'efface pas les données de l'app).
- [x] Corrigé — bandeau de navigation (Android) au fond incohérent : selon l'écran, la barre transparente laissait voir le fond **par défaut de React Navigation** (blanc en clair, noir en sombre) au lieu du thème. On passe désormais à `ThemeProvider` un thème dont `background`/`card` valent `colors.page` (`app/_layout.tsx`) : la barre reste transparente et laisse toujours voir le fond au thème, et les icônes s'adaptent (claires en sombre, sombres en clair).
- [x] Extensions dans l'historique des parties : les extensions cochées au lancement sont mémorisées avec la partie (colonne `extensions` de la table `parties` + migration) et affichées dans le détail d'une partie (`app/(tabs)/explore.tsx`). Transmises depuis les cinq modes de score (compteur, objectif, coopératif, manches, feuille de score) via `usePartie`.
- [x] Cocher les extensions avant de lancer une partie : sur la fiche du jeu principal, la section « Extensions » à cocher liste désormais, en plus des extensions internes (modèle Villainous), les extensions installées comme jeux à part et rattachées au jeu (`extensionsJouables` dans `app/jeu/[id].tsx`). Les éditions en sont exclues (ce sont des variantes, pas des ajouts). Le choix est transmis à la partie : pour un jeu qui modélise ses personnages (Villainous) il filtre les rôles, sinon il enregistre simplement les extensions jouées (bandeau de la partie).
- [x] Suppression d'un jeu : proposer de supprimer aussi les extensions/éditions rattachées. Si le jeu de base a des déclinaisons installées, le dialogue propose « Tout supprimer » ou « Le jeu seul » (`app/jeu/[id].tsx`). Fermer un dialogue sans choisir (fond/retour) n'ajoute ni ne supprime plus rien : nouveau `onFermer` du `DialogueConfirmation`, distinct des boutons, appliqué aussi au popup d'ajout d'extension.
- [x] Proposer le jeu de base à l'ajout d'une extension : dans « Ajouter un jeu tout prêt », ajouter une extension/édition dont le jeu de base n'est pas encore dans la ludothèque ouvre un popup qui propose « Ajouter les deux » ou « Seulement l'extension » (certaines extensions se jouent seules, ex. Villainous — donc proposition, pas obligation). Nouvelle variante « accent » du `DialogueConfirmation`. Rappel : la fiche du jeu de base liste déjà ses extensions/éditions installées (section « Extensions & éditions »).
- [x] Corrigé — des jeux manquaient dans « Ajouter un jeu tout prêt » : le regroupement masquait 73 extensions/éditions (sur 308) hors recherche, alors que cet écran n'a pas de fiche pour les atteindre — elles n'étaient donc ajoutables que par la recherche. `app/bibliotheque.tsx` affiche désormais **tous** les jeux, avec un badge « Extension »/« Édition » pour les distinguer. Le catalogue distant, lui, se chargeait bien. (Le regroupement reste en place sur le catalogue principal, où la fiche du jeu donne accès aux déclinaisons.)
- [x] Désactiver l'import BoardGameGeek : bouton « Chercher sur BoardGameGeek » retiré du formulaire d'ajout (`import.tsx`), et l'écran `/bgg` redirige désormais vers l'ajout d'un jeu (`app/bgg.tsx`, ancien code conservé dans git). Le logo « Powered by BGG » n'est plus requis : il ne s'affiche que sur d'anciens jeux importés de BGG (id commençant par « bgg ») en garde-fou de conformité, et disparaît si le catalogue n'en contient aucun. `lib/bgg.ts` devient du code mort (supprimable plus tard).
- [x] Champ éditeur sur tous les jeux : champ `editeur` ajouté au type `Jeu`, à la base (colonne `editeur` + migration), affiché sur la fiche sous le nom **et dans les listes** (catalogue + bibliothèque), et saisissable dans le formulaire d'ajout/édition (`import.tsx`, avec puces des éditeurs déjà utilisés). Renseigné pour les 308 jeux — « Gigamic » pour les 291 jeux du catalogue Gigamic, l'éditeur réel pour les 17 autres (Repos Production, Libellud, Kosmos…).
- [x] Synchronisation des métadonnées au démarrage : au lancement, les jeux déjà en base voient leur **éditeur et leur photo** rafraîchis depuis le catalogue distant (`synchroniserDepuisCatalogue` dans `db/jeux.ts`, branché dans `context/jeux.tsx`). Ne touche qu'à ces deux champs et jamais aux jeux ajoutés à la main. Corrige aussi la photo des anciens jeux (ex. « 6 qui prend » qui gardait une image Wikimedia) sans avoir à les réajouter.
- [x] Trier « Ajouter un jeu tout prêt » : rangée « Trier par » sur l'écran `bibliotheque.tsx` avec quatre tris — A → Z, Catégorie, Durée, Joueurs (`lib/tri-bibliotheque.ts`, fonction pure testée). Pas de tri « nouveautés » : le catalogue ne porte aucune date, à ajouter au type `Jeu` d'abord si besoin.
- [x] Une photo pour tous les jeux : vraies photos du catalogue Gigamic récupérées pour 287 des 309 jeux (`image` renseigné dans `catalogue.json`), et repli visuel amélioré — une tuile colorée par catégorie (`lib/couleur-jeu.ts`, testé, branché dans `components/visuel-jeu.tsx`) pour que chaque jeu sans photo reste distinct. Restent sans photo : les 14 jeux non-Gigamic (Azul, Splendor, Dixit…) et ~7 jeux Gigamic absents du catalogue en ligne (5 ou Moins, Orapa Mine, Solacia, Mémoires d'une chamane, Bellevue — Parthenay) — à compléter à la main si tu as les visuels.
- [x] Alimenter le catalogue depuis l'API BGG : étude (`docs/api-bgg-catalogue.md`) + script d'outillage `scripts/generer-catalogue.mjs` qui récupère les jeux depuis BGG (liste d'ids dans `scripts/bgg-ids.txt`), gère les 202/429 et le groupage, et ajoute au `catalogue.json` sans écraser les entrées existantes. BGG remplit la coquille (nom, image, joueurs, durée) ; règles/rôles/mode de score restent à compléter à la main.
- [x] Logo « Powered by BGG » : composant d'attribution cliquable (`components/powered-by-bgg.tsx`) renvoyant vers BoardGameGeek (page du jeu depuis une fiche importée, accueil sinon), affiché sur l'écran de recherche BGG et les fiches de jeux importés. ⚠️ `assets/images/powered-by-bgg.png` est un placeholder — à remplacer par le logo officiel « Powered by BGG » (même nom de fichier).
- [x] Catalogue de jeux distant (option A de l'étude) : `catalogue.json` (18 jeux) servi en statique depuis GitHub brut, récupéré et mis en cache par l'app (`lib/catalogue.ts`, `hooks/use-bibliotheque.ts`), fusionné dans l'écran « Ajouter un jeu tout prêt » (`app/bibliotheque.tsx`). Le distant prime par id (ajout/correction sans republier), hors-ligne préservé, aucune donnée personnelle. ⚠️ Reste à commit + push `catalogue.json` sur GitHub pour l'activer.
- [x] Étude de faisabilité d'une API maison : document `docs/etude-api-maison.md` (usages, 3 niveaux d'ambition, hébergement et coûts à jour, obligations RGPD, recommandation par étapes). Conclusion : un catalogue JSON statique gratuit couvre l'usage principal (bibliothèque partagée) sans RGPD ; le backend complet (sync/comptes) n'est à envisager que si un vrai besoin émerge.
- [x] Import BoardGameGeek réactivé : bouton « Chercher sur BoardGameGeek » remis dans le formulaire d'ajout (`app/import.tsx`), relié à l'écran `/bgg` (recherche + import) déjà en place. Parsing de l'API XML v2 conforme. ⚠️ Nécessite le jeton dans `.env.local` (`EXPO_PUBLIC_BGG_TOKEN=…`) puis `npx expo start -c`.
- [x] Rôles partageables : nouvelle option de jeu `rolesPartageables` (interrupteur dans le formulaire) — quand elle est activée, un même rôle peut être attribué à plusieurs joueurs (ex. L'Imposteur : plusieurs citoyens, un imposteur), sinon chaque rôle reste exclusif (Villainous). Type, migration base, persistance et sélection non exclusive dans les modes objectif/coop
- [x] Défilement à la sélection d'un personnage : liste virtualisée (`FlatList` au lieu d'un `ScrollView` non virtualisé) dans les modes objectif et coopératif — défilement fluide même avec beaucoup de personnages (`app/objectif/[jeuId].tsx`, `app/coop/[jeuId].tsx`)
- [x] Barre de navigation système adaptée au thème : voile de contraste blanc désactivé au build (`androidNavigationBar.enforceContrast: false` dans `app.json`), fond de fenêtre teinté au thème via `expo-system-ui`, et couleur des icônes pilotée par `expo-navigation-bar` selon le thème interne (`app/_layout.tsx`). ⚠️ Nécessite `npx expo install expo-navigation-bar` puis un nouveau build (config native + module natif).
- [x] Compteur de temps de partie : durée mesurée sur l'horloge réelle depuis un instant de départ persistant (`hooks/use-chrono.ts`, `hooks/use-partie.ts`) — plus de sous-comptage après fermeture/reprise (une partie de 3 h s'enregistre bien comme 3 h)
- [x] Boutons coupés en bas de page : fiches jeu et joueur — le bas de contenu tient compte de la zone de sécurité (`insets.bottom`), les boutons « Supprimer ce jeu » et « Renommer ou fusionner » ne passent plus sous la barre système (`app/jeu/[id].tsx`, `app/joueur/[nom].tsx`)
- [x] Badges d'ajout des joueurs enregistrés : passage à la ligne (`flexWrap`) au lieu d'une rangée qui défile — les noms restent toujours lisibles quel que soit le nombre de joueurs, sur les 5 modes (compteur, coop, objectif, manches, feuille de score)
- [x] Défilement — détail d'une partie (historique) : feuille bornée à l'écran et contenu entièrement défilable (tous les joueurs visibles), boutons épinglés en bas (`app/(tabs)/explore.tsx`)
- [x] Défilement — modale « Coller un jeu » : contenu défilable, feuille bornée, champ de collage remonté au-dessus du clavier (`app/import.tsx`)
- [x] APK compilé par EAS Build et installé sur le téléphone (profil `preview`)
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
