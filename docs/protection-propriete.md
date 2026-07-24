# Protéger la propriété de Meep Meep

_Guide de protection intellectuelle — juillet 2026._

> ⚠️ **Ce document donne des informations factuelles, pas un conseil juridique.** Je ne suis pas juriste. Pour un lancement commercial, fais valider ces points par un professionnel (avocat en propriété intellectuelle, ou l'INPI directement).

## L'essentiel en une phrase

**Ton application t'appartient déjà** : en France, le code, le design, le logo et tes résumés de règles sont protégés **automatiquement** par le droit d'auteur dès leur création, sans aucune démarche. Ce qui suit sert à *renforcer* cette protection et à *pouvoir la prouver* en cas de litige.

## 1. Ce qui est protégé automatiquement (droit d'auteur)

En droit français (Code de la propriété intellectuelle, art. L112-2), sont protégés dès leur création, sans dépôt ni mention obligatoire :

- le **code source** de l'app (le logiciel est expressément protégé) ;
- le **design**, les écrans, le **logo meeple** ;
- tes **résumés de règles rédigés à la main** (œuvres originales) ;
- les textes que tu as écrits (descriptions, etc.).

Tu es l'auteur, donc le titulaire des droits. Copier, réutiliser ou republier tout cela sans ton autorisation est déjà **illégal**, même sans que tu aies rien déposé. La suite ne crée pas la protection — elle la **matérialise** et la **rend opposable**.

## 2. Réserver tes droits explicitement (le « interdit de copier »)

C'est simple, gratuit, et ça lève toute ambiguïté :

**a. Mention de copyright.** Ajoute partout où c'est visible :

> © 2026 [Ton nom légal] — Tous droits réservés.

À placer : dans le `README` du dépôt, dans un écran « À propos / Mentions » de l'app (l'app affiche déjà « créé par Zaraki » en pied d'accueil — on peut l'étoffer), et éventuellement en en-tête des fichiers de code.

**b. Fichier `LICENSE` propriétaire.** Un dépôt de code sans licence laisse un flou. Le fichier `LICENSE` fourni avec ce guide déclare noir sur blanc que le code est **propriétaire, tous droits réservés**, et qu'aucune copie/réutilisation n'est autorisée sans accord écrit. (À ne pas confondre avec une licence open source, qui ferait l'inverse.)

**c. Rendre le dépôt GitHub privé.** C'est la mesure pratique la plus importante. Aujourd'hui, si `github.com/ZarAki2330/meep-meep` est **public**, n'importe qui peut lire *et cloner* tout ton code. Le droit d'auteur interdit de le réutiliser, mais la confidentialité empêche d'y accéder tout court. Dans GitHub : `Settings` → `General` → `Danger Zone` → `Change repository visibility` → `Private`. ⚠️ Attention : ton app charge `catalogue.json` depuis GitHub « brut » — si tu passes le dépôt en privé, il faudra soit héberger `catalogue.json` ailleurs (public), soit générer un token, soit le mettre dans un petit dépôt public séparé. À anticiper avant de basculer.

## 3. Se constituer une preuve d'antériorité (qui a créé, et quand)

Le droit d'auteur existe sans dépôt, mais en cas de litige il faut **prouver que tu es l'auteur à une date donnée**. Options, du moins cher au plus formel :

- **L'historique Git (déjà en place).** Tes commits datés sur GitHub constituent une trace, mais elle est faible juridiquement (un historique peut se réécrire).
- **e-Soleau à l'INPI — recommandé.** Un dépôt numérique horodaté par l'INPI qui prouve l'existence de ta création à une date certaine. **15 € jusqu'à 50 Mo**, conservation **5 ans** (prolongeable à 10/15/20 ans). Ça ne donne pas de droit de propriété (les droits, tu les as déjà) : ça donne une **preuve datée** solide. Idéal ici : y déposer une archive du code + des maquettes + tes règles. C'est le meilleur rapport coût/protection pour ton cas.
- **Constat d'huissier** ou **horodatage blockchain** : alternatives plus chères, pas nécessaires à ce stade.

## 4. Protéger le nom et le logo « Meep Meep » (marque) — optionnel

Le droit d'auteur protège ton *logo* en tant qu'œuvre, mais **pas le nom** en tant que tel. Si tu veux empêcher un concurrent d'utiliser « Meep Meep » pour une app/produit de jeux similaire, il faut **déposer une marque** :

- **Dépôt de marque à l'INPI : ~190 € pour 1 classe** (2026), protection **10 ans renouvelable**. Une classe suffit sans doute ici (logiciels/applications, classe 9 ; éventuellement jeux, classe 28).
- **Avant de déposer**, vérifie la disponibilité sur la base des marques de l'INPI (gratuit) : personne ne doit déjà avoir « Meep Meep » sur une classe proche.
- ⚠️ **Point de vigilance** : « Meep Meep » évoque le cri de Bip Bip (Road Runner), marque de Warner Bros. Pour un usage d'app de jeux de société le risque est probablement faible, mais c'est à garder en tête au moment d'un dépôt commercial — un professionnel pourra le sécuriser.

À ne faire que si/quand tu passes en mode commercial — inutile pour un projet perso.

## 5. ⚠️ Le revers de la médaille : le contenu de tiers dans l'app

C'est le point le plus important à comprendre, et il est à double sens : **ta propriété, c'est ton code, ton design et tes règles maison — pas le contenu des éditeurs que l'app affiche.**

Aujourd'hui l'app utilise :

- des **noms de jeux** (« Catan », « Villainous »…) — usage nominatif, généralement acceptable ;
- tes **règles réécrites** — à toi, aucun souci ;
- mais aussi des **images d'éditeurs/revendeurs** récupérées par lien (jaquettes, pions Villainous, visuels Gigamic…) et des **noms d'éditeurs**. Ces images sont la **propriété de leurs éditeurs**.

Pour un usage **personnel/non commercial**, le risque est faible. Mais dès que tu **monétises ou publies sur les stores**, afficher des jaquettes et visuels d'éditeurs **sans licence** t'expose juridiquement — et ça peut fragiliser ta propre app. Avant de commercialiser, il faudra soit obtenir les autorisations, soit remplacer ces images par tes propres visuels (ou la tuile colorée de secours déjà prévue). À traiter en lien avec les tâches « monétisation » et « publication sur les stores ».

De même, une app publiée doit afficher des **mentions légales** (éditeur, contact) et, si elle collecte des données, une **politique de confidentialité (RGPD)**. Ici l'app est locale (SQLite, pas de compte), donc les données restent sur l'appareil — mais les stores exigent quand même une politique de confidentialité. À préparer pour la publication.

## Récapitulatif — quoi faire, dans quel ordre

1. **Gratuit, tout de suite** : ajouter le fichier `LICENSE` (fourni) + la mention `© 2026 [ton nom] — Tous droits réservés` dans le `README` et l'app.
2. **Gratuit, tout de suite** : passer le dépôt GitHub en **privé** (après avoir réglé l'hébergement de `catalogue.json`).
3. **15 €, quand tu veux figer une version** : déposer une **e-Soleau** à l'INPI (preuve d'antériorité).
4. **~190 €, seulement si commercialisation** : déposer la **marque « Meep Meep »** à l'INPI (après vérification de disponibilité).
5. **Avant de monétiser/publier** : régler la question des **images d'éditeurs** et préparer **mentions légales + politique de confidentialité**.

---

_Sources : [INPI — e-Soleau](https://www.inpi.fr/realiser-demarches/propriete-intellectuelle/se-preparer-au-depot-dune-e-soleau), [Bpifrance — protéger un logiciel](https://bpifrance-creation.fr/encyclopedie/trouver-proteger-tester-son-idee/proteger-son-idee/comment-proteger-logiciel), tarifs dépôt de marque INPI 2026. Informations factuelles, ne remplacent pas un conseil juridique professionnel._
