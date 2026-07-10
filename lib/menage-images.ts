// lib/menage-images.ts
// Le balayage des photos orphelines, au démarrage. Il vit ici plutôt que dans
// lib/images.ts pour que celui-ci ignore tout de la base.

import { listerJeux } from "@/db/jeux";
import { listerJoueurs } from "@/db/joueurs";

import { DOSSIER_JEUX, DOSSIER_JOUEURS, nettoyerImagesOrphelines } from "./images";

/**
 * Efface les photos que ni un jeu ni un joueur ne réclame.
 * Chaque dossier est confronté à sa propre table : une erreur de lecture sur
 * l'une ne doit surtout pas déclencher le balayage de l'autre à vide.
 */
export async function nettoyerToutesLesImages() {
  const jeux = await listerJeux().catch(() => null);
  if (jeux) await nettoyerImagesOrphelines(DOSSIER_JEUX, jeux.map((j) => j.image)).catch(() => {});

  const joueurs = await listerJoueurs().catch(() => null);
  if (joueurs) {
    await nettoyerImagesOrphelines(DOSSIER_JOUEURS, joueurs.map((j) => j.photo)).catch(() => {});
  }
}
