// hooks/use-chrono.ts
// Chronomètre basé sur l'horloge réelle : la durée d'une partie est le temps
// écoulé entre son début et sa fin. On mémorise l'instant de départ (ms) plutôt
// qu'un compteur accumulé en mémoire, ce qui rend la durée exacte même si l'app
// est fermée et la partie reprise plus tard.

import { useCallback, useEffect, useRef, useState } from "react";

export function useChrono() {
  const debut = useRef<number | null>(null); // instant de départ (ms), null si non démarré ou figé
  const fige = useRef<number | null>(null); // total figé (s) une fois la partie arrêtée
  const [, rafraichir] = useState(0);

  // Rafraîchit l'affichage chaque seconde tant que le chrono tourne.
  useEffect(() => {
    const id = setInterval(() => {
      if (debut.current !== null) rafraichir((n) => n + 1);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  /** Démarre le décompte s'il ne l'est pas déjà (idempotent). */
  const demarrer = useCallback((debutMsArg?: number) => {
    if (debut.current === null && fige.current === null) {
      debut.current = debutMsArg ?? Date.now();
      rafraichir((n) => n + 1);
    }
  }, []);

  /** Reprend une partie : fixe l'instant de départ persistant. */
  const initialiser = useCallback((debutMsArg: number) => {
    fige.current = null;
    debut.current = debutMsArg;
    rafraichir((n) => n + 1);
  }, []);

  /** Fige le chrono et renvoie le total exact de secondes écoulées. */
  const arreter = useCallback(() => {
    const total =
      debut.current !== null
        ? Math.max(0, Math.floor((Date.now() - debut.current) / 1000))
        : (fige.current ?? 0);
    fige.current = total;
    debut.current = null;
    return total;
  }, []);

  /** Instant de départ (ms) à persister pour la reprise, ou null si arrêté. */
  const debutMs = useCallback(() => debut.current, []);

  const secondes =
    debut.current !== null
      ? Math.max(0, Math.floor((Date.now() - debut.current) / 1000))
      : (fige.current ?? 0);

  return { secondes, demarrer, initialiser, arreter, debutMs };
}
