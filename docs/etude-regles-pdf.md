# Étude de faisabilité — Afficher les règles officielles en PDF

_Meep Meep — juillet 2026. Étude préalable, aucune ligne de code engagée à ce stade._

## Objectif

Pouvoir consulter, depuis la fiche d'un jeu, le livret de règles **officiel** au format PDF (celui de l'éditeur), en complément du résumé de règles en français déjà présent dans l'app.

Deux questions se posent, et la seconde commande la première :

1. **Techniquement**, comment afficher un PDF dans une app Expo ?
2. **Juridiquement**, a-t-on le droit de diffuser le PDF officiel d'un éditeur ?

## Le point qui décide de tout : les droits

C'est le vrai sujet, et il faut le traiter avant la technique.

En droit d'auteur, **les règles d'un jeu en tant que système** (le principe, les mécaniques, la façon de jouer) ne sont pas protégeables : c'est une idée, et une idée ne s'approprie pas. C'est précisément pour cela que Meep Meep peut, en toute légalité, proposer ses **propres résumés de règles rédigés à la main** — ce qu'il fait déjà pour les 390 jeux du catalogue.

En revanche, **le livret de règles officiel en tant que document** — sa rédaction exacte, sa mise en page, ses illustrations, ses schémas — est, lui, une œuvre protégée par le droit d'auteur de l'éditeur. En conséquence :

- **Héberger ou embarquer le PDF officiel** d'un éditeur (le mettre sur notre serveur / catalogue, ou le glisser dans l'app) **sans licence = contrefaçon.** À proscrire.
- **Pointer vers le PDF que l'éditeur héberge lui-même** (un lien vers le fichier officiel sur le site de l'éditeur) est très différent : on ne copie rien, on ne réhéberge rien, on renvoie l'utilisateur vers la source officielle. C'est la voie propre pour de « vraies » règles officielles.
- **Laisser l'utilisateur importer son propre PDF** (celui qu'il possède déjà) pour son usage personnel, stocké sur son téléphone, ne pose pas de problème de rediffusion : rien ne quitte son appareil.

**Conclusion juridique : on ne stocke jamais le PDF d'un éditeur. On se contente soit de lier vers le fichier officiel de l'éditeur, soit de laisser l'utilisateur importer le sien.**

## Ce qui est déjà en place dans l'app

Bonne nouvelle, l'essentiel de la boîte à outils est déjà installé (aucune nouvelle dépendance lourde pour démarrer) :

- `expo-linking` — ouvrir une URL externe (le PDF officiel dans le navigateur du téléphone).
- `expo-document-picker` — laisser l'utilisateur choisir un PDF sur son appareil.
- `expo-file-system` — copier / stocker / mettre en cache un fichier dans l'app.
- `expo-sharing` — rouvrir un fichier via la visionneuse PDF native du téléphone.

Ne sont **pas** installés : `react-native-webview`, `expo-web-browser`, ni `react-native-pdf`. Ils ne sont nécessaires que pour l'affichage **intégré** (dans l'app), pas pour les deux premières étapes.

## Les options techniques

### Option A — Lien vers les règles officielles (le plus simple, le plus propre)

On ajoute au jeu un champ `reglesUrl` (l'adresse de la page ou du PDF de règles chez l'éditeur). Sur la fiche, un bouton « Règles officielles » ouvre ce lien.

- Ouverture dans le navigateur du téléphone : `Linking.openURL(url)` — **déjà possible, zéro dépendance ajoutée, fonctionne dans Expo Go.**
- Variante plus confortable : `expo-web-browser` ouvre un onglet **dans** l'app (l'utilisateur revient d'un geste). Une seule petite dépendance, sans build natif particulier.

Avantages : légal (on lie, on n'héberge pas), trivial à implémenter, marche partout, aucun poids ajouté à l'app.
Limite : dépend d'un lien externe (connexion requise ; à maintenir si l'éditeur déplace son fichier).

### Option B — Import d'un PDF par l'utilisateur

L'utilisateur importe **son** livret (`expo-document-picker`), on le copie dans l'app (`expo-file-system`), et on le rouvre à la demande via la visionneuse du téléphone (`expo-sharing`).

Avantages : légal (copie personnelle), fonctionne hors-ligne une fois importé, réutilise des dépendances déjà présentes.
Limite : demande une action manuelle à l'utilisateur ; occupe de l'espace de stockage (un livret PDF pèse souvent 5–30 Mo → prévoir un cache et un moyen de supprimer).

### Option C — Visionneuse PDF intégrée, en plein écran dans l'app

Afficher le PDF **sans quitter l'app**, dans un écran dédié. Trois sous-options :

1. **`react-native-pdf`** (+ son config-plugin Expo) : rend un PDF local ou distant nativement. **Nécessite un build EAS** (impossible dans Expo Go), et il existe **actuellement des soucis de rendu iOS signalés depuis le passage à Expo SDK 54** (issue ouverte côté bibliothèque). À surveiller avant de s'engager. À vérifier aussi : compatibilité avec la **New Architecture** (activée dans notre `app.json`).
2. **`rn-pdf-reader-js`** (pdf.js dans une WebView) : multiplateforme, mais nécessite `react-native-webview`, et le rendu peut être un peu lourd sur gros fichiers.
3. **WebView + visionneuse hébergée** (Google Docs Viewer : `docs.google.com/gview?embedded=true&url=…`) : simple et multiplateforme, mais dépend d'un service tiers et d'une connexion — et **ne peut viser que des PDF publics** (donc, ici encore, seulement des liens officiels, jamais un fichier privé).

Avantages : la meilleure expérience (tout se passe dans l'app).
Limites : plus de travail, un build natif obligatoire (Option C.1), des dépendances supplémentaires, et des cas particuliers Android/iOS. À réserver à une v2.

## Comparatif

| Critère | A — Lien officiel | B — Import perso | C — Visionneuse intégrée |
|---|---|---|---|
| Effort | Très faible | Faible | Élevé |
| Nouvelle dépendance | Aucune (ou `expo-web-browser`) | Aucune | `react-native-pdf` ou WebView |
| Fonctionne dans Expo Go | Oui | Oui | Non (build EAS) |
| Hors-ligne | Non | Oui (après import) | Selon la source |
| Légalité | ✅ on lie, sans héberger | ✅ copie personnelle | ✅ si liens publics uniquement |
| Expérience | Correcte | Correcte | La meilleure |

## Recommandation, par étapes

1. **Étape 1 — Option A.** Ajouter un champ `reglesUrl` au type `Jeu` (optionnel), l'exposer dans le formulaire d'ajout, et afficher sur la fiche un bouton « Règles officielles » quand il est renseigné. Ouverture via `expo-web-browser` (onglet in-app) avec repli sur `Linking`. Rapide, légal, sans build particulier. On peut renseigner progressivement les liens officiels des éditeurs (Gigamic, Ravensburger…), à côté de nos résumés maison.
2. **Étape 2 — Option B**, si le besoin « hors-ligne » se confirme. L'utilisateur importe son propre livret ; on le stocke et on le rouvre. Réutilise `document-picker`/`file-system`/`sharing` déjà installés. Prévoir un cache et un bouton de suppression.
3. **Étape 3 — Option C**, seulement si l'on veut la visionneuse plein écran intégrée, et une fois que `react-native-pdf` est stabilisé sur Expo 54 + New Architecture. Nécessite un build EAS.

## À retenir

Le résumé de règles maison **reste la colonne vertébrale** de l'app : c'est lui qui est toujours disponible, hors-ligne, homogène et sans risque juridique. Le PDF officiel vient **en complément** — via un lien vers la source de l'éditeur, ou via un import personnel — jamais en réhébergeant le document d'un tiers.

Point de vigilance : cette note décrit le cadre général du droit d'auteur ; pour un déploiement commercial, un avis juridique dédié reste recommandé (notamment si un jour on souhaitait négocier une licence pour embarquer de vrais livrets).
