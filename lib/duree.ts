// lib/duree.ts — mise en forme des durées

/** Affichage vivant du chronomètre : 12:05 ou 1:04:32 */
export function formatChrono(secondes: number): string {
  const s = Math.max(0, Math.floor(secondes));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const deux = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${deux(m)}:${deux(sec)}` : `${m}:${deux(sec)}`;
}

/** Affichage compact dans l'historique et les statistiques : 45 min ou 1 h 12 */
export function formatDuree(secondes: number | null | undefined): string {
  if (!secondes || secondes <= 0) return "—";
  const minutes = Math.round(secondes / 60);
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")}`;
}
