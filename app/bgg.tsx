// app/bgg.tsx — import BoardGameGeek désactivé.
//
// L'accès à BoardGameGeek a été retiré du formulaire d'ajout. On garde cette
// route pour ne pas casser un éventuel lien direct : elle redirige simplement
// vers l'écran d'ajout d'un jeu. Le code complet de l'écran BGG (recherche,
// import, attribution) reste disponible dans l'historique git si besoin.

import { Redirect } from "expo-router";

export default function ImporterBgg() {
  return <Redirect href="/import" />;
}
