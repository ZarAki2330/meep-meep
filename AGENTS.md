# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing any code.

# Meep Meep

App de scores de jeux de société, en français. Le code, les commentaires et les
noms de variables sont en français.

Avant de toucher au code, lire les **notes d'architecture** du `README.md`. Elles
listent les pièges qui ont chacun coûté un bug — en particulier :

- Une **ligne** de partie est un joueur **ou une équipe**. `gagnant` porte le nom
  de la ligne, jamais celui d'un membre. Tout passe par `lib/lignes-partie.ts`.
- Un `gagnant` vide signifie **égalité**. Un joueur au nom vidé produirait la même
  chose : d'où `nomDe()`.
- Le **seuil de fin** regarde le score le plus haut, même quand le moins de points
  gagne.
- `lib/` est pur : pas de base, pas de JSX, pas d'état. C'est ce qui le rend testable.
- Les couleurs de `constants/theme-colors.ts` sont **mesurées** (WCAG AA). Refaire
  le calcul avant d'en changer une.

## Vérifier

```bash
npx tsc --noEmit
npm test
npm run lint
```

Tout changement dans `lib/` doit être accompagné d'un test.
