// lib/jeu-partage.ts
// Sérialise un jeu en texte, pour le partager ou le recréer en un collage.

import { type Jeu } from "@/data/jeux";

export type JeuSansId = Omit<Jeu, "id">;

/** Le jeu au format texte, prêt à être partagé. */
export function jeuVersTexte(jeu: Jeu): string {
  const { id: _id, ...reste } = jeu;
  return JSON.stringify({ meepMeepJeu: 1, jeu: reste }, null, 2);
}

/** Lit un jeu depuis un texte collé. Tolère l'objet nu, sans l'enveloppe. */
export function texteVersJeu(texte: string): JeuSansId {
  let brut: unknown;
  try {
    brut = JSON.parse(texte.trim());
  } catch {
    throw new Error("Ce texte n'est pas du JSON valide.");
  }

  const enveloppe = brut as { meepMeepJeu?: number; jeu?: unknown };
  const candidat = (enveloppe?.meepMeepJeu === 1 ? enveloppe.jeu : brut) as Partial<JeuSansId>;

  if (!candidat || typeof candidat.nom !== "string" || !candidat.nom.trim()) {
    throw new Error("Ce texte ne décrit pas un jeu Meep Meep.");
  }
  return candidat as JeuSansId;
}
