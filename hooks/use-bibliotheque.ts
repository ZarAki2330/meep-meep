// hooks/use-bibliotheque.ts
// La bibliothèque « tout prêt » à afficher : le catalogue distant fusionné avec
// celle livrée dans l'app.
//
// Deux mémoires se superposent, et c'est voulu. `lib/catalogue` conserve le
// catalogue analysé pour toute la session, partagé avec le contexte des jeux.
// Ici on conserve en plus le résultat de la *fusion*, parce que celle-ci trie
// 428 entrées avec `localeCompare` — quelques milliers de comparaisons Intl,
// assez coûteuses pour se voir à l'ouverture de l'écran. Une fois suffit.

import { useEffect, useState } from "react";

import { BIBLIOTHEQUE } from "@/data/bibliotheque";
import { type Jeu } from "@/data/jeux";
import { catalogueEnCache, fusionnerBibliotheque, rafraichirCatalogue } from "@/lib/catalogue";

// La liste fusionnée et triée, conservée entre les montages et partagée par tous
// les écrans. Null tant qu'aucun catalogue distant n'a encore été lu.
let catalogueMemoire: Jeu[] | null = null;

// Lecture du cache amorcée une seule fois, et partagée : deux écrans qui
// s'ouvrent coup sur coup attendent la même promesse au lieu de déclencher deux
// lectures concurrentes.
let amorce: Promise<void> | null = null;

function amorcer(): Promise<void> {
  if (!amorce) {
    amorce = catalogueEnCache()
      .then((c) => {
        if (c.length) catalogueMemoire = fusionnerBibliotheque(c);
      })
      .catch(() => {});
  }
  return amorce;
}

// Amorce dès l'import du module, pour que la mémoire soit déjà prête quand on
// ouvre « Ajouter un jeu tout prêt » — c'est devenu le premier écran atteint
// depuis le « + » de l'accueil, donc celui dont la lenteur se verrait le plus.
amorcer();

export function useBibliotheque(): { liste: Jeu[]; chargement: boolean } {
  // Au montage : la fusion déjà connue si elle existe, sinon la bibliothèque
  // livrée (repli hors-ligne, uniquement au tout premier lancement sans cache).
  const [liste, setListe] = useState<Jeu[]>(() => catalogueMemoire ?? BIBLIOTHEQUE);
  // En chargement seulement quand rien n'est encore en mémoire : sur les
  // ouvertures suivantes, l'écran s'affiche directement, sans spinner.
  const [chargement, setChargement] = useState<boolean>(() => catalogueMemoire === null);

  useEffect(() => {
    let actif = true;

    const appliquer = (donnees: Jeu[]) => {
      if (!donnees.length) return;
      const fusion = fusionnerBibliotheque(donnees);
      catalogueMemoire = fusion;
      if (actif) setListe(fusion);
    };

    // Mémoire froide : on attend l'amorce (au pire, on la déclenche). Mémoire
    // déjà chaude : rien à relire, rien à retrier, l'écran est déjà à jour.
    if (catalogueMemoire === null) {
      amorcer().then(() => {
        if (!actif) return;
        if (catalogueMemoire) setListe(catalogueMemoire);
        setChargement(false);
      });
    }

    // Puis une mise à jour en arrière-plan, sans bloquer l'affichage. La
    // fonction ne déclenche qu'une requête par session et renvoie directement
    // le catalogue frais, ou null s'il n'a pas changé.
    rafraichirCatalogue()
      .then((frais) => {
        if (frais) appliquer(frais);
      })
      .catch(() => {});

    return () => {
      actif = false;
    };
  }, []);

  return { liste, chargement };
}
