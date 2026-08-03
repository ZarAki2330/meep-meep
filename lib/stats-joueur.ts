// lib/stats-joueur.ts
// Tout ce que l'historique sait d'un joueur. Fonctions pures : aucune base,
// aucun composant, et donc faciles à vérifier.
//
// Deux subtilités traversent ce fichier :
//  - une ligne de partie peut être un joueur, ou une équipe dont il est membre ;
//  - en coopératif, toute la table gagne ou perd ensemble : les autres joueurs
//    sont des coéquipiers, pas des adversaires.

import { type JoueurScore, type PartieEnregistree } from "@/db/parties";

import { ligneAGagne, lignesDe as lireLignes } from "./lignes-partie";

export type StatsParJeu = { jeu: string; parties: number; victoires: number; taux: number };

/** Quelqu'un croisé autour de la table, adversaire ou coéquipier. */
export type Compagnon = { nom: string; parties: number };

/**
 * Quelqu'un qui s'est trouvé en face. Ni les coéquipiers d'une même équipe,
 * ni les partenaires d'un coopératif : on ne gagne pas « contre » eux.
 */
export type Adversaire = { nom: string; duels: number; victoiresContre: number };

export type StatsJoueur = {
  parties: number;
  victoires: number;
  taux: number; // en pourcentage, arrondi
  parJeu: StatsParJeu[]; // du plus joué au moins joué
  compagnons: Compagnon[]; // du plus fréquent au moins fréquent
  adversaires: Adversaire[]; // du plus affronté au moins affronté
  meilleureSerie: number;
  serieEnCours: number;
  historique: PartieEnregistree[]; // ses parties, la plus récente en tête
};

function lignesDe(p: PartieEnregistree): JoueurScore[] {
  return lireLignes(p.details);
}

/** La ligne du joueur, parmi des lignes déjà lues : lui-même, ou son équipe. */
function sienneParmi(lignes: JoueurScore[], nom: string): JoueurScore | undefined {
  return lignes.find((l) => (l.membres?.length ? l.membres.includes(nom) : l.nom === nom));
}

/** Les personnes derrière une ligne : une équipe en cache plusieurs. */
function personnes(l: JoueurScore): string[] {
  return l.membres?.length ? l.membres : [l.nom];
}

/**
 * Une égalité n'est une victoire pour personne, et une partie à objectif peut
 * se gagner à plusieurs : c'est la marque portée par la ligne qui tranche
 * (`ligneAGagne` retombe sur le nom pour les parties d'avant ce marquage).
 */
function aGagne(p: PartieEnregistree, sienne: JoueurScore, lignes: JoueurScore[]): boolean {
  return ligneAGagne(p, sienne, lignes);
}

/** Les parties auxquelles ce joueur a pris part, la plus récente en tête. */
export function partiesDe(parties: PartieEnregistree[], nom: string): PartieEnregistree[] {
  return parties
    .filter((p) => sienneParmi(lignesDe(p), nom))
    .sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * La plus longue suite de victoires, et celle qui court encore.
 * Les parties sont lues de la plus ancienne à la plus récente ; une défaite,
 * une égalité ou une déroute coopérative brisent la série.
 */
function series(partiesDuJoueur: PartieEnregistree[], nom: string) {
  let meilleure = 0;
  let courante = 0;
  // partiesDuJoueur arrive la plus récente en tête : on remonte le temps à l'endroit.
  for (const p of [...partiesDuJoueur].reverse()) {
    const lignes = lignesDe(p);
    const sienne = sienneParmi(lignes, nom);
    if (sienne && aGagne(p, sienne, lignes)) {
      courante++;
      if (courante > meilleure) meilleure = courante;
    } else {
      courante = 0;
    }
  }
  return { meilleureSerie: meilleure, serieEnCours: courante };
}

export function statsJoueur(parties: PartieEnregistree[], nom: string): StatsJoueur {
  const siennes = partiesDe(parties, nom);

  let victoires = 0;
  const parJeu: Record<string, { parties: number; victoires: number }> = {};
  const compagnons: Record<string, Compagnon> = {};
  const adversaires: Record<string, Adversaire> = {};

  for (const p of siennes) {
    // Une seule lecture des lignes : « sa ligne » doit être comparable aux autres.
    const lignes = lignesDe(p);
    const sienne = sienneParmi(lignes, nom);
    if (!sienne) continue;
    const gagne = aGagne(p, sienne, lignes);
    if (gagne) victoires++;

    const j = (parJeu[p.jeu_nom] ??= { parties: 0, victoires: 0 });
    j.parties++;
    if (gagne) j.victoires++;

    // Un coopératif n'oppose personne : tout le monde y est du même côté.
    const duel = !p.resultat;
    for (const ligne of lignes) {
      const enFace = duel && ligne !== sienne;
      for (const autre of personnes(ligne)) {
        if (autre === nom) continue;
        (compagnons[autre] ??= { nom: autre, parties: 0 }).parties++;
        if (enFace) {
          const a = (adversaires[autre] ??= { nom: autre, duels: 0, victoiresContre: 0 });
          a.duels++;
          if (gagne) a.victoiresContre++;
        }
      }
    }
  }

  const taux = siennes.length ? Math.round((victoires / siennes.length) * 100) : 0;

  return {
    parties: siennes.length,
    victoires,
    taux,
    parJeu: Object.entries(parJeu)
      .map(([jeu, s]) => ({
        jeu,
        parties: s.parties,
        victoires: s.victoires,
        taux: Math.round((s.victoires / s.parties) * 100),
      }))
      .sort((a, b) => b.parties - a.parties || b.taux - a.taux),
    compagnons: Object.values(compagnons).sort((a, b) => b.parties - a.parties),
    adversaires: Object.values(adversaires).sort((a, b) => b.duels - a.duels),
    ...series(siennes, nom),
    historique: siennes,
  };
}
