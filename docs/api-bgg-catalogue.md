# Alimenter le catalogue maison depuis l'API BoardGameGeek

_Note d'étude + mode d'emploi du script `scripts/generer-catalogue.mjs`. Rédigé le 17/07/2026._

## L'idée

Plutôt que de saisir chaque jeu à la main dans `catalogue.json`, on récupère les faits de base depuis l'API BoardGameGeek (BGG) et on les convertit en entrées de catalogue. C'est un **outil de développement** (un script Node lancé à la demande) : il n'est pas embarqué dans l'app, il produit simplement le `catalogue.json` que l'app télécharge ensuite (voir `lib/catalogue.ts`).

## Ce que l'API BGG fournit — et ce qu'elle ne fournit pas

L'API XML v2 de BGG (`https://boardgamegeek.com/xmlapi2`) donne, pour un jeu :

- le **nom**, une **description**, l'**image** de couverture ;
- le nombre de **joueurs** min/max, la **durée**, l'**âge** minimum ;
- des catégories et mécaniques génériques.

Elle **ne donne pas** ce qui fait la valeur de Meep Meep : les **règles** rédigées en points, les **rôles / personnages**, le **mode de score** (compteur, objectif, feuille de score…), le sens de victoire, les extensions. Ces champs restent à écrire à la main.

Conclusion : BGG remplit la « coquille » d'un jeu (identité + chiffres + visuel), et toi tu ajoutes ensuite la partie riche. Le script est donc un **gain de temps sur la saisie**, pas un remplacement du travail éditorial.

## Les deux endpoints utiles

- **Recherche** : `…/xmlapi2/search?type=boardgame&query=NOM` → une liste de résultats `{ id, nom, année }`. Sert à retrouver l'`id` d'un jeu à partir de son nom (c'est déjà ce que fait l'écran BGG de l'app).
- **Détails** : `…/xmlapi2/thing?id=ID` → toutes les infos d'un ou plusieurs jeux. On peut passer **plusieurs id d'un coup** (`thing?id=1,2,3`), ce qui réduit le nombre d'appels.

Depuis juillet 2025, l'API exige un **jeton Bearer** (le même que celui de l'app, dans `.env.local`).

## Les limites de débit (le point délicat)

- L'endpoint `thing` peut répondre **`202 Accepted`** : la requête est mise en file d'attente, il faut **réessayer après un court délai** jusqu'à obtenir le `200`. C'est le piège classique de l'API BGG.
- En cas d'abus, un **`429`** (trop de requêtes) peut survenir → attendre puis réessayer.

Le script gère les deux : reprise automatique sur `202` et `429`, requêtes groupées par lots de 20 id, et une petite pause entre les lots pour rester poli.

## Le mapping vers le modèle `Jeu`

Le script produit, pour chaque id BGG, une entrée de ce type :

- `id` = `bgg<ID>` (préfixe « bgg » : c'est ce qui permet au logo « Powered by BGG » de renvoyer vers la bonne page du jeu) ;
- `nom`, `description` (tronquée), `image`, `joueursMin`, `joueursMax`, `dureeMin`, `ageMin` : depuis BGG ;
- `categorie` = « Importé », `scoreMode` = « compteur », `scoreVictoire` = « max », `regles` = `[]` : **valeurs par défaut à ajuster à la main**.

C'est exactement le même mapping que l'import intégré à l'app (`lib/bgg.ts`), réutilisé côté script.

## Mode d'emploi

1. Renseigne les identifiants BGG voulus dans `scripts/bgg-ids.txt` (un par ligne). L'`id` d'un jeu se lit dans l'URL de sa page BGG : `…/boardgame/266192/wingspan` → `266192`.
2. Assure-toi que ton jeton est dans `.env.local` (`EXPO_PUBLIC_BGG_TOKEN=…`).
3. Lance :

   ```
   node scripts/generer-catalogue.mjs
   ```

4. Le script **ajoute** au `catalogue.json` les jeux encore absents (les entrées déjà présentes sont laissées telles quelles — tes ajouts manuels ne sont jamais écrasés).
5. Complète à la main les champs riches (règles, rôles, mode de score, catégorie) directement dans `catalogue.json`.
6. `git commit` + `git push` de `catalogue.json` : l'app le récupère au prochain lancement.

Pour **rafraîchir** un jeu déjà présent (nouvelle image, joueurs corrigés…), retire son entrée de `catalogue.json` puis relance le script.

## Choix de conception

- **Liste curée, pas tout BGG.** On ne veut pas déverser la base entière : le script part d'une liste d'id choisis. C'est volontaire — la bibliothèque « tout prêt » a vocation à rester sélective et soignée.
- **Le script n'écrase jamais.** Il n'ajoute que les nouveautés. C'est le comportement le plus sûr : on peut le relancer sans risque pour le travail éditorial déjà fait.
- **Outillage, pas runtime.** Tout se passe hors de l'app, à froid. L'app, elle, ne fait que lire le `catalogue.json` fini (aucune dépendance à BGG au démarrage, aucun jeton exposé côté catalogue).

## Piste d'amélioration (plus tard)

Un mode « enrichir » qui, pour les entrées existantes, ne remplirait que les **champs vides** (par ex. une image manquante) sans toucher au reste — utile si tu crées d'abord des jeux à la main puis veux récupérer leur visuel depuis BGG. Non fait ici pour garder le comportement simple et non destructif.
