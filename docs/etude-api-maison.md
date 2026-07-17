# Étude de faisabilité — API maison pour Meep Meep

_Rédigé le 17/07/2026. Chiffres d'hébergement vérifiés à cette date : les tarifs et quotas des offres gratuites évoluent, à recontrôler au moment de décider._

## 1. Point de départ

Meep Meep est aujourd'hui une application **100 % locale** : Expo / React Native, base SQLite sur le téléphone, aucune donnée ne quitte l'appareil. Les données manipulées sont en partie **personnelles** : noms des joueurs, photos de profil, scores, historique des parties. La seule « sauvegarde » actuelle est l'export / import manuel d'un fichier.

Il n'y a donc aucun serveur. La question est : qu'apporterait une API maison, à quel prix, et avec quelles obligations ?

## 2. À quoi servirait une API

Quatre usages ont été évoqués. Ils n'ont ni la même valeur, ni le même coût, ni surtout le même poids réglementaire. C'est la distinction clé de toute l'étude.

**a. Bibliothèque de jeux partagée, mise à jour sans republier l'app.** Aujourd'hui, enrichir le catalogue « tout prêt » impose une nouvelle version de l'app sur les stores. Une source distante permettrait d'ajouter des jeux à distance, vus par tous. → Donnée **publique**, pas de compte, pas de données personnelles.

**b. Proxy pour le jeton BoardGameGeek.** Le jeton BGG est actuellement embarqué dans l'app (`EXPO_PUBLIC_BGG_TOKEN`) : quiconque décompile l'APK peut le lire. Un petit serveur qui garde le jeton et relaie les requêtes le protégerait, et permettrait de mettre en cache / limiter le débit. → Pas de données personnelles, juste un secret à cacher.

**c. Sauvegarde en ligne.** Envoyer une copie des données (parties, joueurs, photos) sur un serveur pour ne pas tout perdre si le téléphone est cassé ou changé. → **Données personnelles** stockées à distance.

**d. Synchronisation multi-appareils / comptes.** Retrouver ses parties sur plusieurs téléphones, à plusieurs. → **Données personnelles + comptes utilisateurs**, le plus lourd de tous.

Les usages **a** et **b** sont légers et sans risque réglementaire. Les usages **c** et **d** changent complètement la nature du projet : ils font de toi un **responsable de traitement** de données personnelles.

## 3. Trois niveaux d'ambition

### Niveau 0 — un simple fichier JSON statique

Un fichier `catalogue.json` (la liste des jeux prêts) hébergé quelque part de public. L'app le télécharge au démarrage, le met en cache localement, et se rabat sur sa copie si hors-ligne. **Ce n'est pas vraiment une API** — juste un fichier servi — mais ça couvre entièrement l'usage **a**.

- Effort : faible (générer un JSON, l'héberger, ajouter un `fetch` + cache côté app).
- Coût : **gratuit**.
- Maintenance : quasi nulle.
- RGPD : **aucun** (donnée publique, aucune donnée personnelle ne circule).

### Niveau 1 — quelques fonctions serverless

De petites fonctions à la demande (sans serveur à administrer) pour : le **proxy BGG** (usage b), et éventuellement servir le catalogue de façon un peu dynamique (recherche, filtrage). Typiquement un Cloudflare Worker.

- Effort : modéré (écrire et déployer une ou deux fonctions).
- Coût : **gratuit** à l'échelle de Meep Meep (voir §4).
- Maintenance : faible.
- RGPD : négligeable tant qu'aucune donnée personnelle n'y transite.

### Niveau 2 — un vrai backend (comptes + sync + sauvegarde)

Base de données en ligne, authentification, stockage des photos : usages **c** et **d**. On ne réinvente pas ça soi-même — on prend un « Backend-as-a-Service » managé (Supabase, Firebase…).

- Effort : **élevé** (schéma, auth, règles de sécurité, gestion des conflits de synchro, intégration app, écrans de connexion).
- Coût : gratuit pour prototyper, puis ~25 $/mois dès que c'est sérieux (voir §4).
- Maintenance : réelle et continue (sécurité, sauvegardes, incidents, migrations).
- RGPD : **significatif** (voir §6).

## 4. Options d'hébergement et coûts (juillet 2026)

### Pour du statique (Niveau 0)

- **GitHub Pages** : gratuit pour un dépôt public, idéal pour un `catalogue.json`. Le repo Meep Meep est déjà sur GitHub.
- **Cloudflare Pages / R2** : gratuit à cette échelle, CDN mondial rapide.

Dans les deux cas, coût **0 €** et mise à jour = un simple push / upload de fichier.

### Pour du serverless (Niveau 1)

- **Cloudflare Workers** — offre gratuite : **100 000 requêtes/jour**, 10 ms de CPU par appel. Large de plusieurs ordres de grandeur pour Meep Meep. Base **D1** (SQLite managé) gratuite : 5 M lignes lues/jour, 100 k écrites/jour, 5 Go. Stockage **R2** gratuit : 10 Go-mois. Passage payant : **5 $/mois** minimum, très au-delà de ce dont tu aurais besoin.

### Pour un backend complet (Niveau 2)

- **Supabase** (Postgres + Auth + Storage, hébergement possible en région UE) — offre gratuite : **500 Mo** de base, **2 projets actifs**, **50 000** utilisateurs authentifiés/mois, **1 Go** de stockage fichiers, **5 Go** d'egress. ⚠️ **Un projet gratuit est mis en pause après 1 semaine d'inactivité** — rédhibitoire pour une sauvegarde censée être toujours disponible. Offre **Pro : 25 $/mois** (8 Go de base, pas de mise en pause, sauvegardes quotidiennes).
- **Firebase** (Google) : alternative équivalente avec un palier gratuit ; hébergement des données moins clairement UE, à examiner pour le RGPD.

## 5. Est-ce qu'un simple JSON statique suffit ?

**Pour l'usage principal (bibliothèque partagée), oui, largement.** Un `catalogue.json` hébergé gratuitement, récupéré au démarrage et mis en cache, permet d'enrichir la liste des jeux prêts **sans republier l'app** — l'objectif numéro un — pour un coût nul, une maintenance quasi inexistante et **zéro obligation RGPD**. C'est de loin le meilleur rapport valeur / effort / risque.

En revanche, le JSON statique **ne couvre pas** :

- le **proxy BGG** (b) : cacher un secret exige un serveur, même minuscule ;
- la **sauvegarde** (c) et la **synchro** (d) : elles supposent d'**écrire** des données côté serveur et donc de l'authentification — un fichier statique est en lecture seule.

Autrement dit : le JSON statique règle **a** parfaitement, et rien d'autre.

## 6. Obligations (RGPD et sécurité)

C'est le point le plus important à peser, car il ne dépend pas de la technique mais de **ce que tu stockes**.

**Tant que tout reste local (aujourd'hui), ou que le serveur ne sert qu'un catalogue public (Niveau 0/1 sans données perso) :** la charge RGPD est **minime**. Une politique de confidentialité reste requise pour publier sur les stores (déjà notée dans la feuille de route), mais tu ne « collectes » rien côté serveur.

**Dès que tu stockes en ligne des noms de joueurs, des photos et des scores (Niveaux c/d) :** tu deviens **responsable de traitement** au sens du RGPD. Cela implique, entre autres :

- une **base légale** (typiquement le consentement) et une **politique de confidentialité** détaillée : quelles données, où, combien de temps, pourquoi ;
- la **minimisation** : ne stocker que le nécessaire ;
- les **droits des personnes** : accès, rectification, **suppression** (« droit à l'oubli ») — donc un moyen technique de supprimer un compte et ses données ;
- l'**hébergement dans l'UE** ou des garanties équivalentes (Supabase permet de choisir une région UE ; Firebase demande vérification) ;
- la **sécurité** : chiffrement en transit et au repos, gestion des accès.

Deux facteurs **aggravent** le sujet pour Meep Meep : ce sont des **photos de personnes** (identifiantes), et c'est une app de **jeux en famille** — donc potentiellement des **données de mineurs**, qui appellent une vigilance renforcée. Pour un projet solo de loisir, assumer ces responsabilités n'est pas anodin : c'est un engagement durable, pas une case à cocher.

## 7. Recommandation : une approche par étapes

L'idée directrice : **n'introduire un serveur que quand c'est indispensable, et ne s'imposer les obligations RGPD que le plus tard possible.**

**Étape 1 — Catalogue JSON statique (recommandé).** Héberge la bibliothèque de jeux sur GitHub Pages ou Cloudflare (gratuit). L'app le récupère, le met en cache, fusionne avec les jeux ajoutés par l'utilisateur sans les écraser. Tu peux enrichir le catalogue à distance dès demain, sans store, sans coût, sans RGPD. **C'est le meilleur premier pas, et peut-être le seul nécessaire.**

**Étape 2 — Proxy BGG (si l'app devient publique).** Un petit Cloudflare Worker qui détient le jeton et relaie les requêtes BGG (avec cache et limitation de débit). Gratuit à cette échelle, et ça évite de livrer le secret dans l'APK. À faire seulement si l'usage BGG monte en charge ou si l'app est diffusée largement.

**Étape 3 — Sauvegarde / synchro (seulement si un vrai besoin émerge).** Là seulement, envisager un backend managé (Supabase, région UE). Prototype possible sur l'offre gratuite, mais la **mise en pause après inactivité** la rend inadaptée à une sauvegarde « toujours dispo » : compter ~25 $/mois pour du sérieux, **et** assumer pleinement le RGPD. Piste intermédiaire plus légère : réutiliser l'export existant pour un **envoi chiffré vers un stockage objet** (type R2), repéré par un simple code, **sans comptes** — ça donne une sauvegarde en ligne sans la lourdeur de l'authentification et des profils.

## 8. Récapitulatif

| Usage | Solution mini | Coût | Effort | RGPD |
|---|---|---|---|---|
| a. Bibliothèque partagée | JSON statique (GitHub/CF Pages) | 0 € | Faible | Aucun |
| b. Proxy jeton BGG | Cloudflare Worker | 0 € | Moyen | Négligeable |
| c. Sauvegarde en ligne | R2 + export chiffré, ou Supabase | 0 → 25 $/mois | Moyen à élevé | Significatif |
| d. Synchro + comptes | Supabase (Postgres + Auth) | ~25 $/mois | Élevé | Lourd |

## 9. Notes techniques pour l'implémentation (le jour venu)

- **Rester hors-ligne d'abord** : quel que soit le choix, l'app doit continuer à marcher sans réseau (cache local, dégradation propre). C'est déjà sa force.
- **Versionner le catalogue** : un champ `version` (ou un ETag) dans le JSON pour ne re-télécharger que si nécessaire.
- **Fusion sans écrasement** : les jeux du catalogue distant doivent porter des identifiants stables et distincts de ceux ajoutés par l'utilisateur, pour ne jamais effacer les jeux persos (l'app unifie déjà natifs et ajoutés en base — la logique de fusion doit préserver les modifications locales).
- **Secrets** : un jeton (BGG ou autre) ne doit jamais être livré en clair dans l'app dès lors qu'elle est publique — d'où l'intérêt du proxy (Étape 2).
