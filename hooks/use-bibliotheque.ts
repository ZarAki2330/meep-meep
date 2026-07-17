// hooks/use-bibliotheque.ts
// La bibliothèque « tout prêt » à afficher : d'abord celle livrée avec l'app
// (immédiate, hors-ligne), puis, dès qu'il est disponible, le catalogue distant
// fusionné. Un rafraîchissement en arrière-plan est lancé au montage.

import { useEffect, useState } from "react";

import { BIBLIOTHEQUE } from "@/data/bibliotheque";
import { type Jeu } from "@/data/jeux";
import { catalogueEnCache, fusionnerBibliotheque, rafraichirCatalogue } from "@/lib/catalogue";

export function useBibliotheque(): Jeu[] {
  const [liste, setListe] = useState<Jeu[]>(BIBLIOTHEQUE);

  useEffect(() => {
    let actif = true;
    const appliquer = (cache: Jeu[]) => {
      if (actif && cache.length) setListe(fusionnerBibliotheque(cache));
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
