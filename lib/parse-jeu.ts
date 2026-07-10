// lib/parse-jeu.ts
// Le formulaire d'ajout de jeu saisit ses listes en texte : une entrée par ligne,
// les champs séparés par une barre verticale. Ces fonctions font l'aller-retour
// entre ce texte et les objets du jeu. Elles sont pures : rien ne les empêche
// d'être testées, et le formulaire n'a plus à savoir découper des chaînes.

import { type CategorieScore, type RoleJeu } from "@/data/jeux";

/** Découpe une ligne sur les barres verticales, en nettoyant chaque morceau. */
function champs(ligne: string): string[] {
  return ligne.split("|").map((s) => s.trim());
}

/** Les lignes non vides d'un texte, débarrassées de leurs espaces. */
function lignes(texte: string): string[] {
  return texte
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

/** Une liste vide ne se distingue pas d'une absence : on rend undefined. */
export function listeOuRien<T>(liste: T[]): T[] | undefined {
  return liste.length > 0 ? liste : undefined;
}

// ——— Cases de la feuille de score ———

/** Reconstruit le texte des cases à partir des catégories enregistrées. */
export function categoriesVersTexte(cats: CategorieScore[]): string {
  const sorties: string[] = [];
  let sectionCourante: string | undefined;
  for (const c of cats) {
    if (c.section !== sectionCourante) {
      sectionCourante = c.section;
      if (sectionCourante) sorties.push(`# ${sectionCourante}`);
    }
    sorties.push(c.aide ? `${c.label} | ${c.aide}` : c.label);
  }
  return sorties.join("\n");
}

/** « # Partie haute » ouvre une section ; « Full | 25 » définit une case. */
export function parserCategories(texte: string): CategorieScore[] {
  const cats: CategorieScore[] = [];
  let section: string | undefined;
  let i = 0;
  for (const ligne of lignes(texte)) {
    if (ligne.startsWith("#")) {
      section = ligne.slice(1).trim() || undefined;
      continue;
    }
    const [label, aide] = champs(ligne);
    if (!label) continue;
    cats.push({ cle: `c${i++}`, label, aide: aide || undefined, section });
  }
  return cats;
}

// ——— Extensions ———

export function extensionsVersTexte(extensions: string[]): string {
  return extensions.join("\n");
}

/** Un nom d'extension par ligne. Les doublons sont écartés. */
export function parserExtensions(texte: string): string[] {
  const vues = new Set<string>();
  const sorties: string[] = [];
  for (const nom of lignes(texte)) {
    const cle = nom.toLowerCase();
    if (vues.has(cle)) continue;
    vues.add(cle);
    sorties.push(nom);
  }
  return sorties;
}

// ——— Personnages ———

export function rolesVersTexte(roles: RoleJeu[]): string {
  return roles
    .map((r) => {
      const parts = [r.nom, r.origine ?? "", r.objectif ?? "", r.extension ?? ""];
      // Les champs vides de la fin ne servent à rien : « Médecin | Soigne » suffit.
      while (parts.length > 1 && !parts[parts.length - 1]) parts.pop();
      return parts.join(" | ");
    })
    .join("\n");
}

/** « Nom | origine | objectif | extension ». Tout est facultatif sauf le nom. */
export function parserRoles(texte: string): RoleJeu[] {
  const roles: RoleJeu[] = [];
  for (const ligne of lignes(texte)) {
    const [nom, origine, objectif, extension] = champs(ligne);
    if (!nom) continue;
    roles.push({
      nom,
      origine: origine || undefined,
      objectif: objectif || undefined,
      extension: extension || undefined,
    });
  }
  return roles;
}

/**
 * Les extensions que des personnages réclament sans qu'elles soient déclarées.
 * Un tel personnage ne s'affichera jamais : sa case ne peut pas être cochée.
 */
export function extensionsInconnues(roles: RoleJeu[], extensions: string[]): string[] {
  const connues = new Set(extensions.map((e) => e.toLowerCase()));
  const manquantes = new Set<string>();
  for (const r of roles) {
    if (r.extension && !connues.has(r.extension.toLowerCase())) manquantes.add(r.extension);
  }
  return Array.from(manquantes);
}
