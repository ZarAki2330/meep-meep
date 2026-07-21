// hooks/use-bibliotheque.ts
// La bibliothèque « tout prêt » à afficher : le catalogue distant fusionné avec
// celle livrée dans l'app. On garde le dernier catalogue connu en mémoire (pour
// toute la session) et on l'amorce dès le chargement du module, afin de ne jamais
// afficher, même une fraction de seconde, la bibliothèque livrée — plus ancienne
// (images périmées, jeux d'autrefois) — avant l'arrivée du catalogue distant.

import { useEffect, useState } from "react";

import { BIBLIOTHEQUE } from "@/data/bibliotheque";
import { type Jeu } from "@/data/jeux";
import { catalogueEnCache, fusionnerBibliotheque, rafraichirCatalogue } from "@/lib/catalogue";

// Conservé entre les montages, et partagé par tous les écrans qui lisent la
// bibliothèque. Null tant qu'aucun catalogue distant n'a encore été lu.
let catalogueMemoire: Jeu[] | null = null;

// Amorce la lecture du cache dès l'import du module (au démarrage de l'app),
// pour que la mémoire soit déjà prête quand on ouvre « Ajouter un jeu tout prêt ».
catalogueEnCache()
  .then((c) => {
    if (c.length) catalogueMemoire = fusionnerBibliotheque(c);
  })
  .catch(() => {});

export function useBibliotheque(): Jeu[] {
  // Au montage : le dernier catalogue connu s'il existe, sinon la bibliothèque
  // livrée (repli hors-ligne, uniquement au tout premier lancement sans cache).
  const [liste, setListe] = useState<Jeu[]>(() => catalogueMemoire ?? BIBLIOTHEQUE);

  useEffect(() => {
    let actif = true;
    const appliquer = (cache: Jeu[]) => {
      if (!cache.length) return;
      const fusion = fusionnerBibliotheque(cache);
      catalogueMemoire = fusion;
      if (actif) setListe(fusion);
    };
    // Affiche tout de suite le dernier catalogue connu…
    catalogueEnCache().then(appliquer);
    // …puis tente une mise à jour en arrière-plan, sans bloquer.
    rafraichirCatalogue().then((maj) => {
      if (maj) catalogueEnCache().then(appliquer);
    });
    return () => {
      actif = false;
    };
  }, []);

  return liste;
}
