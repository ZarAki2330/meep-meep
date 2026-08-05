// lib/partie-partage.ts
// Met une partie terminée en texte lisible, pour la partager par le partage
// natif du téléphone (SMS, messagerie, mail…).
//
// À la différence de `jeu-partage.ts`, qui sérialise un jeu en JSON pour le
// recréer à l'identique, il s'agit ici d'un **compte-rendu destiné à être lu
// par une personne** : rien n'est réimportable, et c'est voulu. Aucun compte,
// aucun serveur, aucune donnée qui parte d'elle-même — c'est l'utilisateur qui
// choisit le destinataire, dans la feuille de partage de son système.
//
// La fonction est volontairement pure : elle ne lit ni la base, ni le thème, et
// reçoit tout ce dont elle a besoin. Elle se teste donc sans rendu.

import { type JoueurScore, type PartieEnregistree } from "@/db/parties";
import { formatDuree } from "@/lib/duree";
import { lignesDe, lignesMarquees, personnesDe } from "@/lib/lignes-partie";

/**
 * Ce que le compte-rendu ne peut pas deviner de la partie seule.
 *
 * Ces réglages vivent sur le jeu, pas sur la partie — et le jeu peut avoir été
 * supprimé depuis. Les valeurs par défaut décrivent le cas le plus courant :
 * on marque des points, et le plus haut l'emporte.
 */
export type ReglagesPartage = {
  /** Vrai en mode « objectif » : on gagne sans compter de points. */
  objectif?: boolean;
  /** Sens de la victoire quand on compte les points. */
  sens?: "min" | "max";
};

/** La date d'une partie, en toutes lettres. Vide si elle est illisible. */
function dateLisible(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Les positions des lignes victorieuses.
 *
 * Repérées par position et non par identité : ce module relit `details` pour
 * son propre compte, et deux lectures d'un même JSON ne rendent pas les mêmes
 * objets. Repli sur le nom pour les parties enregistrées avant le marquage
 * des vainqueurs multiples.
 */
function positionsGagnantes(partie: PartieEnregistree, lignes: JoueurScore[]): Set<number> {
  if (partie.resultat) return new Set();
  if (lignesMarquees(lignes)) {
    return new Set(lignes.flatMap((l, i) => (l.gagnant === true ? [i] : [])));
  }
  if (!partie.gagnant) return new Set(); // égalité enregistrée
  return new Set(lignes.flatMap((l, i) => (l.nom === partie.gagnant ? [i] : [])));
}

/** Le nom d'une ligne, suivi de ses membres ou de son rôle s'il y en a. */
function ligneLisible(ligne: JoueurScore): string {
  if (ligne.membres?.length) return `${ligne.nom} (${ligne.membres.join(", ")})`;
  return ligne.role ? `${ligne.nom} — ${ligne.role}` : ligne.nom;
}

/** « 1 joueur », « 4 joueurs ». */
function compteJoueurs(n: number): string {
  return n === 1 ? "1 joueur" : `${n} joueurs`;
}

/** Les extensions jouées, mémorisées avec la partie sous forme de JSON. */
function lireExtensions(brut: string | null): string[] {
  if (!brut) return [];
  try {
    const v: unknown = JSON.parse(brut);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/**
 * Le compte-rendu d'une partie, prêt à être envoyé.
 *
 * Le classement suit celui de l'écran de détail : les vainqueurs d'abord à
 * objectif, l'ordre des points ailleurs, et l'ordre de la table en coopératif
 * où personne ne devance personne. Les scores ne sont montrés que là où l'on
 * en compte.
 */
export function partieVersTexte(
  partie: PartieEnregistree,
  reglages: ReglagesPartage = {},
): string {
  const lignes = lignesDe(partie.details);
  // Une partie coopérative se reconnaît à son issue, même si le jeu a disparu.
  const coop = partie.resultat !== null;
  const objectif = coop || reglages.objectif === true;
  const sens = reglages.sens ?? "max";

  const gagnantes = positionsGagnantes(partie, lignes);
  const egalite = !coop && gagnantes.size === 0;

  // Le nombre de joueurs annoncé est celui des personnes réelles : une équipe
  // en cache plusieurs, et un joueur inscrit dans deux équipes n'en fait qu'un.
  // Repli sur le compte enregistré si `details` est illisible.
  const personnes = new Set<string>();
  for (const l of lignes) for (const p of personnesDe(l)) personnes.add(p);
  const nbJoueurs = personnes.size || partie.nb_joueurs;

  const entete = [`🎲 ${partie.jeu_nom}`];
  const contexte = [dateLisible(partie.date), compteJoueurs(nbJoueurs)];
  if (partie.duree) contexte.push(`⏱ ${formatDuree(partie.duree)}`);
  entete.push(contexte.filter(Boolean).join(" · "));

  const extensions = lireExtensions(partie.extensions);
  if (extensions.length) entete.push(`Extensions : ${extensions.join(", ")}`);

  // L'issue, annoncée avant le détail : c'est elle qu'on lit en premier.
  const issue = coop
    ? partie.resultat === "victoire"
      ? "🏆 Victoire de toute la table"
      : "😵 Le jeu l'a emporté"
    : egalite
      ? "🤝 Partie terminée sur une égalité"
      : "";

  // Classement, dans l'ordre où l'écran de détail le présente.
  const classees = lignes.map((ligne, i) => ({ ligne, i }));
  if (coop) {
    // Ordre de la table : personne ne devance personne.
  } else if (objectif) {
    classees.sort((a, b) => Number(gagnantes.has(b.i)) - Number(gagnantes.has(a.i)));
  } else {
    classees.sort((a, b) =>
      sens === "min" ? a.ligne.score - b.ligne.score : b.ligne.score - a.ligne.score,
    );
  }

  const corps = classees.map(({ ligne, i }, rang) => {
    const gagne = coop ? partie.resultat === "victoire" : gagnantes.has(i);
    const puce = gagne ? "🏆" : coop || objectif ? "·" : `${rang + 1}.`;
    const nom = ligneLisible(ligne);
    return objectif ? `${puce} ${nom}` : `${puce} ${nom} — ${ligne.score}`;
  });

  const bilan: string[] = [];
  if (partie.evaluation) {
    const n = Math.max(0, Math.min(5, partie.evaluation));
    bilan.push("★".repeat(n) + "☆".repeat(5 - n));
  }
  if (partie.note) bilan.push(`« ${partie.note} »`);

  // Les blocs vides disparaissent, sans laisser de ligne blanche en trop.
  return [entete.join("\n"), issue, corps.join("\n"), bilan.join("\n"), "— Meep Meep"]
    .filter((bloc) => bloc.length > 0)
    .join("\n\n");
}
