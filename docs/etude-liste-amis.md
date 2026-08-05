# Étude de faisabilité — dimension sociale (liste d'amis en ligne)

_Rédigé le 05/08/2026. Prolonge l'étude « API maison » (`claude/etude-api-maison.md`, 17/07/2026), qui décrivait quatre usages possibles d'une API. La liste d'amis en serait un **cinquième**, et de loin le plus exigeant : il suppose des comptes, un identifiant public par personne et des relations entre comptes._

_Chiffres d'hébergement vérifiés le 05/08/2026 ; les tarifs et quotas des offres gratuites bougent, à recontrôler au moment de décider._

> ⚠️ **Étude d'abord, décision ensuite.** Ce document ne propose rien à implémenter. Il cherche à établir si l'usage réel justifie le coût, et surtout l'engagement.

---

## 1. Ce que l'étude doit trancher

Cinq questions, posées au départ :

1. À quoi sert **concrètement** la liste d'amis ? C'est elle qui détermine tout le reste.
2. Quel backend : Supabase région UE, ou Firebase ?
3. Quel coût réel à petite échelle ?
4. Comment ajoute-t-on un ami **sans exposer d'adresse e-mail** ?
5. Comment gère-t-on le blocage, le refus, la suppression ?

Plus un volet distinct, qui partageait le même socle : **alléger l'app** en déportant le catalogue et les images côté serveur.

Ce volet allègement se traite en premier, parce qu'il se mesure — et parce que la mesure change les termes du débat.

---

## 2. Volet allègement : le travail est déjà fait

L'hypothèse de départ était que le catalogue et ses images sont « aujourd'hui embarqués » et pèsent sur l'application. **Ce n'est plus le cas.** L'étape 1 recommandée par l'étude de juillet a été implémentée entre-temps.

### Ce que l'app embarque réellement

`lib/catalogue.ts` télécharge déjà le catalogue depuis GitHub en statique (`raw.githubusercontent.com/ZarAki2330/meep-meep/main/catalogue.json`), le met en cache dans la table `meta` de SQLite et le fusionne avec la bibliothèque livrée. Les 428 jeux et leurs 497 ko **ne sont pas dans le binaire** : ils arrivent par le réseau, gratuitement, et le cache prend le relais hors-ligne.

Ce qui reste embarqué, c'est `data/bibliotheque.ts` : **18 jeux**, le filet de sécurité pour une première ouverture sans réseau.

Quant aux images de jeux : les 428 fiches pointent **toutes** vers des URL distantes (318 chez `gigamic.com`, 100 chez `espritjeu.com`, le reste dispersé). Aucune couverture de jeu n'est embarquée. Là non plus, il n'y a rien à déporter — c'est déjà fait.

### Les chiffres

Mesures faites en construisant réellement le bundle Android (`expo export --platform android`, SDK 54, Hermes) :

| Élément | Poids | Part du bundle JS |
|---|---|---|
| Bundle JS complet (Hermes `.hbc`) | **4,16 Mio** | 100 % |
| dont bibliothèque livrée (18 jeux) | **30,8 ko** | **0,72 %** |
| Ressources exportées (35 fichiers) | 635,8 ko | — |
| dont polices `.ttf` | **592,1 ko** | — |
| dont images | ~43 ko | — |
| `catalogue.json` (déjà distant) | 497 ko brut / 121 ko gzip | 0 % — pas dans le bundle |

Mesure du coût de la bibliothèque : bundle avec les 18 jeux = 4 359 830 octets ; bundle avec `BIBLIOTHEQUE = []` = 4 328 312 octets. Différence : 31 518 octets.

### Verdict

**Déporter des données côté serveur ne peut plus alléger l'app de façon significative.** Tout ce qui pouvait partir est déjà parti. Le seul contenu de données restant pèse 0,72 % du bundle JS, et c'est précisément celui qu'il faut garder : il fait tourner l'app à la première ouverture, sans réseau. Le supprimer échangerait 31 ko contre un premier lancement dégradé — mauvaise affaire.

L'argument « le même socle allégerait l'app » ne tient donc plus. **Il ne doit pas servir à justifier un serveur.** Si un serveur se construit un jour, ce sera pour la valeur sociale seule.

### En revanche, deux gains gratuits, sans serveur

La mesure a mis au jour ce qui pèse réellement dans les ressources embarquées — et ce ne sont pas les images. L'export Android livre 35 ressources pour **635,8 ko, dont 592,1 ko de polices**. Les images, elles, ne représentent qu'une quarantaine de kilo-octets au total, la plus grosse étant `meeple-body.png` à 12,5 ko. Le détail des polices :

| Fichier | Poids | Origine |
| --- | --- | --- |
| `MaterialIcons.ttf` | 356 840 o | `@expo/vector-icons`, une seule famille déjà |
| Fredoka × 5 graisses | ~50 ko chacune | `@expo-google-fonts/fredoka` |

Les cinq graisses de Fredoka partent dans le bundle alors que **l'app n'en utilise qu'une**. La cause est l'import barillet en tête de `app/_layout.tsx` :

```ts
import { Fredoka_600SemiBold, useFonts } from "@expo-google-fonts/fredoka";
```

Remplacé par l'import direct de la seule graisse utilisée :

```ts
import { Fredoka_600SemiBold } from "@expo-google-fonts/fredoka/600SemiBold";
import { useFonts } from "expo-font";
```

l'export retombe à **31 ressources pour 440,9 ko** (polices : 397,2 ko). **Gain mesuré : ~195 ko**, pour deux lignes, sans rien changer au rendu ni au bundle JS (inchangé à 4,36 Mio). C'est **six fois** ce que pèse la bibliothèque embarquée que l'on envisageait de déporter.

Le reste, `MaterialIcons.ttf` à 357 ko, est le vrai poids lourd. Il est déjà réduit au minimum (une seule famille d'icônes), et le découper suppose de générer une police sur mesure limitée aux glyphes utilisés — faisable, mais c'est un chantier d'outillage, pas un gain gratuit.

Second point, de propreté cette fois : **huit fichiers image ne sont référencés nulle part** dans le code, `app.json` ou le README — `logo.png` (120 ko), `logo-header.png`, `logo-header-dark.png`, `meeple-logo.png`, et les quatre restes du gabarit Expo (`react-logo.png`, `@2x`, `@3x`, `partial-react-logo.png`). Soit **~228 ko dans le dépôt**. Metro ne les embarque pas — ils n'alourdissent donc pas l'app, seulement le dépôt et les clones. À supprimer par hygiène, sans en attendre de gain de poids applicatif.

Troisième point, réseau celui-là : `rafraichirCatalogue()` fait un `fetch` **inconditionnel**. À chaque rafraîchissement, 497 ko passent, même si le catalogue n'a pas bougé d'un octet. Un `If-None-Match` avec l'ETag renvoyé par GitHub (stocké à côté du cache dans `meta`) ramènerait ça à une réponse `304` quasi vide. C'est quelques lignes, ça ne coûte rien, et ça soulage le forfait data des utilisateurs — surtout ceux en 4G limitée. **C'est le vrai gain d'optimisation identifié par cette étude.**

---

## 3. À quoi servirait la liste d'amis ?

Quatre usages étaient sur la table. Ils ne se valent pas — et l'un d'eux se heurte à une objection structurelle qu'il faut poser d'emblée.

### L'objection de la table commune

Meep Meep est une app de **jeu de société en présentiel**. Autour d'une table, les scores sont saisis sur **un seul téléphone** — celui de la personne qui tient les comptes. Conséquence directe : **la base locale contient déjà toutes les données de tous les joueurs de la table.**

Ce n'est pas une supposition, c'est ce que le code fait déjà. `lib/stats-joueur.ts` calcule pour chaque joueur ses `compagnons` (qui il croise autour de la table) et ses `adversaires` (contre qui il gagne, contre qui il perd, avec le compte des duels). Une forme de « statistiques entre amis » **existe déjà, hors-ligne, sans compte et sans serveur.**

Autrement dit : pour les gens avec qui tu joues vraiment, un serveur n'apporte rien. Il n'apporte quelque chose que dans un cas précis — **des joueurs qui tiennent chacun leur propre historique, sur leur propre téléphone, et qui veulent le confronter.** C'est-à-dire des foyers différents.

C'est la question qui décide de tout : *combien de personnes, autour de Meep Meep, tiennent un historique séparé qu'elles voudraient comparer ?* Tant que la réponse est « je ne sais pas », il ne faut rien construire.

### Les quatre usages, évalués

**a. Comparer ses statistiques.** Voir le taux de victoire d'un ami, ses jeux favoris, un face-à-face. C'est l'usage le plus demandé spontanément — et le plus directement touché par l'objection ci-dessus. Il n'a de sens qu'entre foyers séparés. Techniquement, il suppose de publier un **résumé agrégé** (nombre de parties, victoires, top jeux) et pas l'historique brut : c'est plus léger, moins intrusif, et bien plus conforme au principe de minimisation. Valeur : moyenne, conditionnée. Coût : le socle complet.

**b. Partager une partie ou un jeu.** Envoyer à un ami la fiche d'un jeu qu'on a créé, ou le compte-rendu d'une partie. **Cet usage ne nécessite ni compte ni serveur** : `lib/jeu-partage.ts` existe déjà, et un partage par lien ou par fichier via le partage natif du téléphone couvre le besoin. Valeur : réelle. Coût : quasi nul. **À traiter séparément, tout de suite, sans backend.**

**c. Classement entre amis.** Un tableau des scores du groupe. Séduisant sur le papier, mais c'est aussi l'usage qui transforme une app familiale en app compétitive — et qui, dans un contexte familial avec des enfants, peut mal vieillir. Il dépend entièrement de (a) : sans statistiques partagées, pas de classement. Valeur : à interroger. Coût : le socle complet + de la modération.

**d. Inviter à une partie en cours.** Le plus exigeant : il suppose du **temps réel** (qui est disponible, qui rejoint), donc des connexions persistantes, des notifications push, une gestion d'état côté serveur. Et il se heurte frontalement au présentiel : autour d'une table, on invite en parlant. Valeur : faible pour un jeu de société physique. Coût : le plus élevé de tous. **À écarter.**

### Ce que ça donne

L'usage **b** est utile et gratuit : à faire, hors de cette étude. L'usage **d** est à écarter. Les usages **a** et **c** partagent le même socle lourd et dépendent d'une hypothèse non vérifiée sur les foyers séparés.

**Recommandation de cadrage : si un jour un socle se construit, il ne doit viser que (a), et sous sa forme minimale — un résumé agrégé, consulté à la demande.** Pas de flux, pas de temps réel, pas de classement au départ.

---

## 4. L'obstacle qu'on n'avait pas vu : il n'y a pas d'identité

Avant de parler d'hébergement, un point de structure, qui pèse plus lourd que le choix du backend.

**Dans Meep Meep, un joueur est un nom.** La table `joueurs` a pour clé `nom TEXT UNIQUE` ; `parties.gagnant` stocke un nom ; `parties.details` est un JSON de lignes de score identifiées par nom ; les équipes listent leurs `membres` par nom. Il n'existe **aucun identifiant stable de personne**. C'est un choix cohérent avec une app locale — et `lib/renommage.ts` existe justement pour arbitrer quand un nom change.

Une liste d'amis exige exactement l'inverse : un identifiant public, stable, indépendant du nom affiché, unique à l'échelle du monde.

Cela veut dire qu'avant même la première ligne de code serveur, il faut :

- introduire un identifiant de personne côté local, et le rattacher aux joueurs existants ;
- écrire l'écran qui dit « le "Papa" de ma liste, c'est le compte de cet ami » — car rien ne le devine ;
- gérer les homonymes, les surnoms, les invités d'un soir qu'on ne veut surtout pas transformer en compte ;
- ne jamais casser l'existant : un utilisateur qui refuse tout compte doit continuer à saisir « Papa » comme aujourd'hui.

**C'est un chantier de migration de données, pas une fonctionnalité.** Il est probablement plus long que le backend lui-même, et il est irréversible : une fois les identifiants introduits, le modèle local est plus complexe pour tout le monde, y compris pour ceux qui n'utiliseront jamais la fonction. C'est le principal argument technique contre.

---

## 5. Le backend : Supabase région UE ou Firebase ?

_Si_ le socle se construit un jour, voici l'état des lieux au 05/08/2026.

### Supabase

Postgres managé, avec authentification, stockage et sécurité au niveau ligne (RLS). Offre gratuite : **500 Mo** de base par projet, **1 Go** de stockage fichiers, **50 000** utilisateurs actifs/mois, **5 Go** d'egress, **2 projets actifs**. Offre **Pro : à partir de 25 $/mois** — 8 Go de base, 100 Go de stockage, 100 000 MAU, 250 Go d'egress, sauvegardes quotidiennes conservées 7 jours, plafond de dépense actif par défaut.

Le point qui tranche : **un projet gratuit est mis en pause après une semaine d'inactivité.** Pour un prototype, sans importance. Pour une fonction sociale censée répondre quand un ami ouvre l'app après quinze jours, c'est rédhibitoire. Une liste d'amis, par nature, connaît des semaines creuses.

Sur le RGPD : Supabase permet de choisir la région d'hébergement, dont des régions européennes, ce qui règle la question de la localisation. Il reste que Supabase est une société américaine ; l'hébergement en UE ne fait pas disparaître le débat sur l'accès extraterritorial aux données (CLOUD Act). Pour un projet familial, ce n'est probablement pas le risque dimensionnant, mais il faut le savoir plutôt que le découvrir.

### Firebase

Firestore + Auth, écosystème Google, très bien outillé côté mobile. Offre gratuite (Spark) : **1 Gio** de données stockées, **50 000 lectures**, **20 000 écritures** et **20 000 suppressions par jour**, **10 Gio** d'egress par mois, **50 000** utilisateurs actifs/mois côté Auth. Ces quotas s'appliquent **au projet**, pas à l'app. Au-delà, le passage en Blaze est à l'usage, sans palier fixe.

Deux différences décisives face à Supabase :

- **Pas de mise en pause après inactivité** — l'offre gratuite reste disponible. C'est exactement le défaut qui disqualifiait Supabase en gratuit.
- **Mais** : la localisation des données est à configurer au moment de créer la base (le choix de région est définitif chez Firestore) et l'analyse RGPD d'un service Google est plus lourde à documenter que celle de Supabase. Le modèle Blaze, à l'usage sans plafond par défaut, expose aussi à une facture surprise en cas de boucle de requêtes — un plafond d'alerte est indispensable.

### Le coût réel à petite échelle

Le point important : **à l'échelle de Meep Meep — disons quelques dizaines d'utilisateurs, chacun consultant les stats de quelques amis de temps en temps — les deux offres gratuites sont surdimensionnées de plusieurs ordres de grandeur.** 50 000 lectures par jour, quand la charge réelle serait de quelques centaines par semaine, c'est sans commune mesure.

Le coût réel, dans ce scénario, n'est donc **pas** de 25 $/mois. Il est de **0 €** en hébergement — mais avec, chez Supabase, une mise en pause qui rend le service intermittent, et donc un besoin de payer 25 $/mois pour une disponibilité qui, elle, ne se mesure pas en requêtes mais en confiance.

**Conclusion sur le backend : si socle il y a, Firebase en offre gratuite est plus adapté au profil d'usage (intermittent, très faible volume) — à condition de fixer la région à la création et de poser un plafond de dépense. Supabase reste préférable si la charge devient régulière et si la maîtrise RGPD prime, mais alors il faut compter les 25 $/mois.** Et le vrai coût, dans les deux cas, n'est pas l'hébergement : c'est le temps de maintenance et la responsabilité juridique.

---

## 6. Ajouter un ami sans exposer d'adresse e-mail

C'est la partie la mieux balisée, parce que le problème est classique et les bonnes réponses connues.

**Ce qu'il ne faut pas faire :** chercher un ami par e-mail ou par numéro de téléphone. Cela transforme la base en annuaire inversé (« cet e-mail a-t-il un compte ? »), c'est une fuite de données par conception, et c'est incompatible avec un usage familial.

**Ce qui marche, par ordre de préférence :**

1. **Le code d'invitation à usage unique, à durée de vie courte.** A génère un code (8 caractères, alphabet sans ambiguïté — ni O/0, ni I/1/l), le dit à B de vive voix ou l'envoie par le canal de son choix ; B le saisit ; la relation se crée ; le code expire. Rien n'est exposé, rien n'est cherchable, et le code n'est valable qu'une fois. Décliné en **QR code** pour le cas le plus fréquent — deux personnes dans la même pièce, autour d'une table. C'est la bonne réponse par défaut, et pour Meep Meep elle est particulièrement naturelle.
2. **Le pseudo public + discriminant** (`Adam#4821`), si l'on veut pouvoir retrouver quelqu'un à distance. Le pseudo seul est cherchable, donc énumérable ; le discriminant numérique évite ça. Mais un pseudo public est **modérable** (voir §8) et il crée une surface d'usurpation. À n'ajouter que si le code d'invitation se révèle insuffisant à l'usage.

**Ce qu'il faut de toute façon :** que la demande soit **acceptée explicitement** par le destinataire — jamais d'ajout unilatéral — et qu'un compte soit **invisible par défaut** : pas de découverte, pas de suggestion d'amis, pas d'accès aux contacts du téléphone.

---

## 7. Refus, blocage, suppression

Une relation d'amitié n'est pas un booléen. Il faut une machine à états explicite, et surtout des règles de symétrie claires.

Les états : **aucune relation** → *demande envoyée* → **amis**, avec deux issues latérales, *refusée* et *bloquée*.

Les règles qui comptent :

- **Le refus est silencieux.** Celui qui a demandé ne doit pas savoir s'il a été refusé ou simplement ignoré — sinon le refus devient un acte social coûteux, dans une app qui touche des familles. La demande expire, point.
- **Le blocage est unilatéral et opaque.** Le bloqué ne l'apprend pas ; il voit simplement un compte devenu invisible. Le blocage doit empêcher toute nouvelle demande, y compris avec un nouveau code.
- **La suppression est symétrique et immédiate.** Si A retire B, B perd aussi l'accès aux données de A. Toute autre règle crée une asymétrie que les gens ne comprennent pas et qui trahit leur attente.
- **Supprimer un ami efface les données mises en cache localement à son sujet.** Sinon le « droit à l'oubli » s'arrête à la porte du serveur, ce qui ne suffit pas.
- **Il faut un anti-harcèlement minimal** : limiter le nombre de demandes par jour, et empêcher qu'un compte bloqué revienne par un nouveau compte trop facilement. C'est une charge de conception qu'on sous-estime toujours.

---

## 8. RGPD, mineurs, modération : le vrai prix

L'étude de juillet le disait déjà pour la sauvegarde et la synchro : dès qu'on stocke des données personnelles en ligne, on devient **responsable de traitement**. Une liste d'amis va plus loin que la sauvegarde, parce qu'elle crée des **données relationnelles** — qui connaît qui — qui sont par nature plus sensibles qu'un score.

### Ce que ça implique concrètement

Une base légale et une politique de confidentialité détaillée ; la minimisation (des stats agrégées, pas l'historique brut) ; les droits d'accès, de rectification et de suppression, avec un vrai bouton « supprimer mon compte » qui efface le compte, ses relations **et** les traces chez les autres ; un hébergement UE ; le chiffrement en transit et au repos ; et une durée de conservation définie.

À quoi s'ajoute, spécifique au social : la **suppression en cascade**. Quand A supprime son compte, que devient la relation A–B ? Que deviennent les stats de A affichées chez B ? La réponse correcte (tout disparaît, y compris les caches locaux chez B) demande d'y avoir pensé dès le schéma.

### Les mineurs : le point qui devrait faire hésiter

Meep Meep est une app de jeu **de famille**. Elle touchera des enfants. En France, le seuil est **15 ans** : en dessous, un traitement fondé sur le consentement requiert l'accord d'un titulaire de l'autorité parentale, la CNIL précisant qu'obtenir l'accord d'**un seul** parent est nécessaire et suffisant, l'autre devant pouvoir s'y opposer. Le droit français y ajoute, pour certains traitements optionnels, une logique d'**accord conjoint parent-enfant** — associer le mineur aux décisions qui le concernent.

En pratique, pour un projet solo, cela veut dire : vérifier l'âge à l'inscription (donc traiter une donnée de plus), prévoir un parcours de consentement parental vérifiable, et documenter tout ça. C'est loin d'être une case à cocher.

### La modération

Dès qu'il y a un pseudo public, il y a des pseudos à modérer. Dès qu'il y a des relations, il y a du harcèlement possible. Un projet solo de loisir ne peut pas assurer une modération réactive — et l'absence de modération sur un service qui touche des mineurs est un risque réel, pas théorique.

### Le point à retenir

**Le coût de la dimension sociale n'est pas les 0 à 25 $/mois d'hébergement. C'est un engagement durable :** une responsabilité juridique permanente, une obligation de disponibilité, une charge de modération, et un devoir de réponse aux demandes d'exercice de droits. Sur un projet de loisir mené seul, c'est le facteur limitant — bien avant la technique.

---

## 9. Contraintes non négociables

**Hors-ligne d'abord.** C'est la force actuelle de l'app et ça ne se négocie pas. Concrètement : le social doit être une **couche strictement additive**. Aucun écran existant ne doit dépendre du réseau ; aucune saisie de score ne doit attendre un serveur ; l'absence de compte ne doit dégrader aucune fonction d'aujourd'hui. Les données d'amis sont mises en cache et affichées avec leur date de fraîcheur (« mis à jour il y a 3 jours »), jamais avec un écran de chargement bloquant. Un utilisateur qui n'active jamais la fonction ne doit **rien** voir changer.

**Accessibilité.** Tout écran social respecte les exigences déjà tenues par l'app : libellés explicites pour les lecteurs d'écran, cibles tactiles suffisantes, contrastes conformes, pas d'information portée par la seule couleur. Deux points spécifiques au social : les états de relation (en attente, ami, bloqué) doivent être annoncés en texte et pas seulement par une icône ou une pastille de couleur ; et les changements d'état — demande acceptée, ami retiré — doivent être annoncés, pas seulement affichés.

---

## 10. Recommandation

**Ne rien construire pour l'instant.** Non pas parce que c'est infaisable, mais parce que les trois piliers qui justifieraient le chantier sont absents :

- Le **volet allègement est caduc** — mesuré à 0,72 % du bundle, tout ce qui pouvait être déporté l'est déjà.
- L'**usage principal (comparer ses stats) n'a de sens qu'entre foyers séparés**, et rien ne dit aujourd'hui qu'il en existe autour de Meep Meep. Pour la table commune, la fonction existe déjà, hors-ligne.
- Le **coût réel n'est pas financier mais juridique et humain** : responsabilité de traitement, mineurs, modération, disponibilité — sur un projet solo.

### Ce qu'il faut faire à la place, tout de suite

1. **Le partage sans compte (usage b).** Partager un jeu créé ou un compte-rendu de partie via le partage natif du téléphone. Aucune infrastructure, aucun RGPD, valeur immédiate. `lib/jeu-partage.ts` est déjà là.
2. **Le `If-None-Match` sur le catalogue.** Quelques lignes, économise 497 ko par rafraîchissement inutile.
3. **L'import direct de la police Fredoka** (`@expo-google-fonts/fredoka/600SemiBold` au lieu du barillet, `useFonts` depuis `expo-font`) : deux lignes, **~195 ko de moins** mesurés à l'export — six fois le poids de la bibliothèque embarquée. Et, par hygiène, supprimer les huit images non référencées (~228 ko de dépôt).

### Ce qui déclencherait une réévaluation

Trois signaux, à guetter plutôt qu'à provoquer :

- Des utilisateurs **réclament explicitement** de comparer leurs stats avec quelqu'un qui n'est pas à leur table — et ils sont plusieurs.
- Le partage sans compte (point 1) est **effectivement utilisé**, ce qui prouverait l'appétit social sans avoir rien risqué.
- Le projet cesse d'être solo, ou tu décides d'assumer sciemment la responsabilité de traitement, avec le temps que ça suppose.

### Si le feu vert venait

L'ordre serait : d'abord l'**identité locale stable** (§4 — le vrai chantier, à faire même sans serveur, car il bénéficie aussi au renommage et aux homonymes) ; puis un socle **minimal** — comptes, code d'invitation QR, relation acceptée explicitement, un seul écran « stats agrégées d'un ami » ; sur **Firebase en offre gratuite**, région UE fixée à la création, plafond de dépense armé ; avec un parcours de consentement et un bouton de suppression de compte **écrits avant** la première ligne de fonctionnalité. Pas de classement, pas de temps réel, pas de flux d'activité.

---

## 11. Récapitulatif

| Question posée | Réponse de l'étude |
|---|---|
| Alléger l'app via un serveur ? | **Caduc** — déjà fait, la donnée restante pèse 0,72 % du bundle |
| Où est le vrai poids alors ? | Les polices : 592 ko sur 636 ko de ressources. Un import direct de Fredoka rend **~195 ko** gratuitement |
| Usage : comparer ses stats | Sous condition — n'a de sens qu'entre foyers séparés, existe déjà pour la table commune |
| Usage : partager un jeu / une partie | **À faire tout de suite**, sans compte ni serveur |
| Usage : classement entre amis | À interroger — dépend des stats, et change la nature de l'app |
| Usage : inviter à une partie en cours | **À écarter** — coût maximal, valeur faible en présentiel |
| Quel backend | Firebase gratuit si socle un jour (pas de mise en pause) ; Supabase Pro 25 $/mois si charge régulière |
| Coût réel à petite échelle | 0 € d'hébergement — le coût est juridique et humain |
| Ajouter un ami sans e-mail | Code d'invitation à usage unique + QR ; jamais de recherche par e-mail |
| Blocage / refus / suppression | Refus silencieux, blocage unilatéral et opaque, suppression symétrique avec purge des caches |
| Obstacle non anticipé | **Il n'existe aucune identité stable** — un joueur est un nom. Chantier de migration préalable |

**Décision proposée : ne pas implémenter. Faire les trois actions gratuites du §10, et réévaluer si l'un des trois signaux apparaît.**
