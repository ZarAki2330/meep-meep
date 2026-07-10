// lib/renommage.ts
// Le cœur du renommage d'un joueur : remplacer son nom dans une partie enregistrée.
//
// Trois endroits le portent, et on les oublie facilement :
//  - la ligne du joueur, quand il joue seul ;
//  - les membres d'une équipe, quand il joue en équipe ;
//  - le vainqueur, qui est le nom du joueur ou celui de son équipe.
//
// Fonction pure : ni base, ni JSON.parse hors d'ici. db/joueurs.ts ne fait
// plus que lire les lignes, appeler ceci, et réécrire.

/** Une ligne du champ `details` d'une partie : un joueur, ou une équipe. */
export type LigneJoueur = {
  nom: string;
  score: number;
  role?: string;
  membres?: string[];
};

export type PartieARenommer = {
  /** JSON des lignes, tel qu'il est stocké. */
  details: string;
  gagnant: string;
};

export type PartieRenommee = PartieARenommer & {
  /** Faux si le joueur n'apparaissait pas, ou si le JSON était illisible. */
  touchee: boolean;
};

/**
 * Remplace `ancien` par `nouveau` dans une partie.
 *
 * Rend la partie inchangée, et `touchee: false`, quand le joueur n'y figure
 * pas — ou quand le JSON est abîmé : mieux vaut une ligne intacte qu'une
 * ligne réécrite à partir de rien.
 */
export function renommerDansPartie(
  partie: PartieARenommer,
  ancien: string,
  nouveau: string,
): PartieRenommee {
  const inchangee = { ...partie, touchee: false };
  if (!ancien || !nouveau || ancien === nouveau) return inchangee;

  let lignes: LigneJoueur[];
  try {
    lignes = JSON.parse(partie.details) as LigneJoueur[];
  } catch {
    return inchangee;
  }
  if (!Array.isArray(lignes)) return inchangee;

  const participe = lignes.some((l) => l.nom === ancien || l.membres?.includes(ancien));
  const etaitGagnant = partie.gagnant === ancien;
  if (!participe && !etaitGagnant) return inchangee;

  const majLignes = lignes.map((l) => ({
    ...l,
    nom: l.nom === ancien ? nouveau : l.nom,
    ...(l.membres ? { membres: l.membres.map((m) => (m === ancien ? nouveau : m)) } : {}),
  }));

  return {
    details: JSON.stringify(majLignes),
    gagnant: etaitGagnant ? nouveau : partie.gagnant,
    touchee: true,
  };
}

/**
 * Qui garde le portrait après une fusion ?
 * Le joueur d'arrivée, s'il en avait un ; sinon il hérite de celui du joueur
 * absorbé. La photo perdante est rendue à l'appelant, seul à savoir effacer
 * un fichier.
 */
export function arbitrerPhotos(
  fusion: boolean,
  photoAncien: string | null,
  photoCible: string | null,
): { retenue: string | null; orpheline: string | null } {
  if (!fusion) return { retenue: photoAncien, orpheline: null };
  if (!photoCible) return { retenue: photoAncien, orpheline: null };
  return {
    retenue: photoCible,
    orpheline: photoAncien && photoAncien !== photoCible ? photoAncien : null,
  };
}
