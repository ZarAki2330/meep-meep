// constants/theme-colors.ts
// Palette de l'app : des couleurs neutres (crème / sombre) auxquelles on applique
// une couleur d'accent choisie par l'utilisateur.

export type ModeTheme = "light" | "dark";
export type CleAccent = "violet" | "bleu" | "vert" | "ambre" | "rouge" | "encre";

export type AppColors = {
  accent: string; // aplats : boutons, puces
  onAccent: string; // texte posé sur l'accent
  accentText: string; // accent lisible sur une surface
  accentSoft: string; // fond teinté léger
  page: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  borderStrong: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textFaint: string;
  placeholder: string;
  success: string;
  onSuccess: string;
  successSoft: string;
  warningSoft: string;
  warningText: string;
  danger: string;
  onDanger: string;
  ombre: string;
};

// Couleurs neutres, communes à toutes les palettes.
const baseClair = {
  page: "#faf6ef",
  surface: "#fffdf9",
  surfaceAlt: "#f2ece2",
  border: "#e9e2d7",
  borderStrong: "#d9d1c4",
  textPrimary: "#241f1c",
  textSecondary: "#5a534d",
  textMuted: "#8b837b",
  textFaint: "#bdb5ab",
  placeholder: "#cec7bd",
  success: "#1d9e75",
  onSuccess: "#ffffff",
  successSoft: "#e1f5ee",
  warningSoft: "#faeeda",
  warningText: "#854f0b",
  danger: "#b3261e",
  onDanger: "#ffffff",
  ombre: "rgba(36, 31, 28, 0.45)",
};

const baseSombre = {
  page: "#121016",
  surface: "#1e1b24",
  surfaceAlt: "#272430",
  border: "#332f3b",
  borderStrong: "#403b4a",
  textPrimary: "#f2f0f5",
  textSecondary: "#c3bece",
  textMuted: "#9a94a6",
  textFaint: "#6b6676",
  placeholder: "#565061",
  success: "#25b28a",
  onSuccess: "#ffffff",
  successSoft: "#173a2e",
  warningSoft: "#3a2f17",
  warningText: "#e8c07a",
  danger: "#d9534f",
  onDanger: "#ffffff",
  ombre: "rgba(0, 0, 0, 0.6)",
};

// Chaque accent peut aussi corriger une couleur sémantique qui entrerait en conflit
// avec lui (le vert de victoire, le rouge de danger).
type Teintes = Partial<AppColors> & {
  accent: string;
  onAccent: string;
  accentText: string;
  accentSoft: string;
};

type DefinitionAccent = {
  nom: string;
  apercu: string; // couleur de la pastille dans les réglages
  clair: Teintes;
  sombre: Teintes;
};

export const ACCENTS: Record<CleAccent, DefinitionAccent> = {
  violet: {
    nom: "Violet",
    apercu: "#7a5195",
    clair: { accent: "#7a5195", accentText: "#7a5195", accentSoft: "#f0e9f5", onAccent: "#ffffff" },
    sombre: { accent: "#9b74b8", accentText: "#c9aede", accentSoft: "#2e2640", onAccent: "#ffffff" },
  },
  bleu: {
    nom: "Bleu",
    apercu: "#2b6cb0",
    clair: { accent: "#2b6cb0", accentText: "#2b6cb0", accentSoft: "#e6eef8", onAccent: "#ffffff" },
    sombre: { accent: "#5d9ade", accentText: "#a9cbec", accentSoft: "#1c2a3d", onAccent: "#ffffff" },
  },
  vert: {
    nom: "Vert",
    apercu: "#2f7d51",
    // Le vert de victoire est foncé pour rester distinct de l'accent.
    clair: {
      accent: "#2f7d51",
      accentText: "#2f7d51",
      accentSoft: "#e6f2ea",
      onAccent: "#ffffff",
      success: "#14603f",
      successSoft: "#dcefe4",
    },
    sombre: {
      accent: "#59ab7c",
      accentText: "#a7d6bb",
      accentSoft: "#17301f",
      onAccent: "#ffffff",
      success: "#1f6b4a",
      successSoft: "#12291f",
    },
  },
  ambre: {
    nom: "Ambre",
    apercu: "#c2701c",
    clair: { accent: "#c2701c", accentText: "#a35d14", accentSoft: "#fbeedc", onAccent: "#ffffff" },
    // Aplat clair : le texte posé dessus doit être foncé.
    sombre: { accent: "#e0973f", accentText: "#efc48f", accentSoft: "#3a2a14", onAccent: "#2b2116" },
  },
  rouge: {
    nom: "Rouge",
    apercu: "#b4402f",
    // Le rouge de danger est assombri pour ne pas se confondre avec l'accent.
    clair: {
      accent: "#b4402f",
      accentText: "#9c3526",
      accentSoft: "#f8e8e3",
      onAccent: "#ffffff",
      danger: "#7d1f18",
    },
    sombre: {
      accent: "#d9705c",
      accentText: "#f0b3a4",
      accentSoft: "#3a1f19",
      onAccent: "#2b1712",
      danger: "#8e2b23",
    },
  },
  encre: {
    nom: "Encre",
    apercu: "#2b2622",
    clair: { accent: "#2b2622", accentText: "#2b2622", accentSoft: "#ebe6dd", onAccent: "#ffffff" },
    sombre: { accent: "#f2eee7", accentText: "#f2eee7", accentSoft: "#2b2721", onAccent: "#1a181d" },
  },
};

export const CLES_ACCENT = Object.keys(ACCENTS) as CleAccent[];

export function construireCouleurs(mode: ModeTheme, cle: CleAccent): AppColors {
  const base = mode === "dark" ? baseSombre : baseClair;
  const teintes = mode === "dark" ? ACCENTS[cle].sombre : ACCENTS[cle].clair;
  return { ...base, ...teintes };
}
