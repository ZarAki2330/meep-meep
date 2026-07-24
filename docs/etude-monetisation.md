# Étude — Monétiser Meep Meep

_Juillet 2026. Panorama des modèles, chiffres à jour et recommandation pour le cas précis de Meep Meep._

> ⚠️ Informations factuelles, pas un conseil financier ni juridique. Les montants (commissions, seuils) évoluent ; vérifie-les au moment de te lancer.

## Le prérequis qui commande tout : les images d'éditeurs

Avant même de parler de modèles, un point bloquant, déjà soulevé dans l'étude sur la propriété : **dès que l'app rapporte de l'argent, afficher des jaquettes et visuels d'éditeurs sans licence devient un vrai risque juridique.** Tant que Meep Meep est gratuit et perso, le risque est faible. Le jour où tu monétises, il faut d'abord :

- soit **obtenir l'autorisation** des éditeurs (long, incertain) ;
- soit **remplacer** les images tierces par tes propres visuels ou par la tuile colorée de secours déjà en place.

Autrement dit : **régler la question des images est la première étape de toute monétisation sérieuse.** Ce n'est pas optionnel.

## Les modèles possibles

### 1. Application payante (achat unique)
L'utilisateur paie une fois pour télécharger (par ex. 1,99–2,99 €).
- **Pour** : simple, pas de pub, pas de serveur, respectueux de la vie privée.
- **Contre** : beaucoup moins de téléchargements (la barrière du prix), pas de revenu récurrent. Sur une niche comme les jeux de société, le volume sera faible.

### 2. Gratuit + achats intégrés (freemium / IAP) — _le plus adapté_
L'app reste gratuite ; on vend des options « premium » : par ex. statistiques avancées, thèmes/accents supplémentaires, sauvegarde dans le cloud, ou simplement un déblocage « Soutien » cosmétique.
- **Pour** : l'app reste accessible à tous (donc plus de téléchargements), et ceux qui aiment paient. Modèle dominant sur mobile.
- **Contre** : il faut concevoir une vraie valeur premium, et implémenter la facturation des stores (voir « côté technique »).

### 3. Abonnement (mensuel/annuel)
Récurrent, pour du premium qui apporte une valeur continue (sync cloud multi-appareils, nouveautés régulières).
- **Pour** : revenu récurrent, le plus rentable *si* la valeur le justifie.
- **Contre** : ici, sans serveur ni contenu qui se renouvelle, difficile de justifier un abonnement. **Probablement inadapté** à ton app pour l'instant.

### 4. Publicité (bannières / interstitiels — AdMob)
App gratuite, revenus via des pubs affichées.
- **Pour** : gratuit pour l'utilisateur, revenu passif.
- **Contre** : dégrade l'expérience (ton app est épurée, la pub casserait ça), revenus **très faibles** sur une niche à petit volume, et surtout **contraintes RGPD/consentement** (bandeau de consentement obligatoire, ATT sur iOS). Pour Meep Meep, je le **déconseille** : mauvais rapport UX/revenu.

### 5. Dons / « tip jar »
Un bouton « Soutenir le développeur » (un achat intégré ponctuel, sans contrepartie ou avec un petit badge).
- **Pour** : zéro pression, respectueux, colle à l'esprit passion-projet.
- **Contre** : revenus très modestes et irréguliers.

### 6. Hybride
Le plus courant : **gratuit + un achat intégré unique** (débloquer le premium / retirer une éventuelle pub / soutenir). C'est le meilleur compromis pour ton cas.

## Les chiffres à connaître

**Commissions des stores** (elles prennent leur part sur tout paiement numérique via l'app) :

| | Taux standard | Taux réduit |
|---|---|---|
| **Apple App Store** | 30 % | **15 %** via le _Small Business Program_ (revenus < 1 M$/an) |
| **Google Play** | 30 % au-delà de 1 M$/an | **15 %** sur le premier million $/an (donc 15 % pour quasiment tout le monde) |

En pratique, à ton échelle, **compte 15 %** de commission prélevée par le store sur chaque vente/achat intégré. Les abonnements sont à 15 % dès le départ côté Google.

**Frais des comptes développeurs** (nécessaires pour publier, voir la tâche « Publier ») :
- **Google Play : 25 $ une fois** (à vie).
- **Apple : 99 $ par an**.

**Bon à savoir** : une app **gratuite sans achat intégré ne paie aucune commission** aux stores. La commission ne s'applique qu'aux paiements numériques passant par la facturation du store. (La pub, elle, passe par une régie type AdMob qui prélève sa propre part.)

## Côté technique (Expo / React Native)

- Les achats intégrés et la pub reposent sur des **modules natifs** : ils **ne fonctionnent pas dans Expo Go**, il faut un **build EAS** (dev build ou preview/production).
- **Achats intégrés** : la solution standard multiplateforme est **RevenueCat** (SDK qui gère App Store + Play Store d'un coup, avec un free tier généreux). Alternative bas niveau : `expo-in-app-purchases` / `react-native-iap`.
- **Publicité** (si un jour) : `react-native-google-mobile-ads` (AdMob) + un module de consentement (RGPD).
- **Pas de serveur nécessaire** pour un achat unique ou un abonnement simple : les stores gèrent la facturation. Un serveur ne devient utile que pour une sync cloud (voir `docs/etude-api-maison.md`).

## Le lien avec le statut d'entreprise

Dès que les stores te **versent de l'argent**, c'est un **revenu** que tu dois pouvoir déclarer légalement. Il te faut donc un **statut** (le plus simple : **micro-entreprise / auto-entrepreneur**). Impossible d'encaisser proprement les versements Apple/Google sans cadre légal. → C'est exactement l'objet de la tâche suivante (« créer une entreprise pour monétiser »).

## Recommandation pour Meep Meep

Honnêtement, c'est un projet de passion sur une niche : **n'en attends pas un revenu significatif**, surtout au début. La stratégie la plus cohérente :

1. **D'abord, régler les images d'éditeurs** — sans ça, pas de monétisation propre.
2. **Garder l'app gratuite** pour maximiser les téléchargements et te faire connaître.
3. Ajouter **un seul achat intégré** : soit un « Premium » cosmétique/pratique (thèmes, stats avancées, sauvegarde), soit un simple **« Soutenir le développeur »**. Via **RevenueCat**, en build EAS.
4. **Éviter la pub** : elle abîmerait ton app épurée pour un gain minime.
5. **Créer une micro-entreprise** avant d'encaisser (tâche suivante).
6. Voir la monétisation comme un **bonus**, pas comme l'objectif : la vraie valeur, c'est l'app utile et bien faite.

---

_Sources : [RevenueCat — Small Business Program (2026)](https://www.revenuecat.com/blog/engineering/small-business-program) ; documentation des commissions App Store / Google Play 2026. Montants à revérifier au lancement. Ceci n'est pas un conseil financier ou juridique._
