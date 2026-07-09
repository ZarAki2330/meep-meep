// constants/theme-colors.ts
// Palette centrale de l'app (mode clair et mode sombre).
// La couleur d'accent est le violet #7a5195.

export type AppColors = {
  accent: string; // aplats : boutons, puces
  onAccent: string; // texte sur l'accent
  accentText: string; // accent lisible sur une surface (chevrons, libellés)
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

export const lightColors: AppColors = {
  accent: "#7a5195",
  onAccent: "#ffffff",
  accentText: "#7a5195",
  accentSoft: "#f0e9f5",
  page: "#faf6ef", // crème
  surface: "#fffdf9", // carte, blanc crème
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

export const darkColors: AppColors = {
  accent: "#9b74b8",
  onAccent: "#ffffff",
  accentText: "#c9aede",
  accentSoft: "#2e2640",
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
