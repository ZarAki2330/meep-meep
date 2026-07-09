// hooks/use-chrono.ts
// Chronomètre avec pause : il tourne quand l'écran est actif, se met en pause sinon.

import { useCallback, useEffect, useRef, useState } from "react";

export function useChrono() {
  const [base, setBase] = useState(0); // secondes déjà accumulées
  const baseRef = useRef(0);
  const depuis = useRef<number | null>(null); // instant du dernier démarrage (ms)
  const [, rafraichir] = useState(0);

  baseRef.current = base;

  // Rafraîchit l'affichage chaque seconde quand le chrono tourne.
  useEffect(() => {
    const id = setInterval(() => {
      if (depuis.current !== null) rafraichir((n) => n + 1);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const demarrer = useCallback(() => {
    if (depuis.current === null) depuis.current = Date.now();
  }, []);

  /** Met en pause et renvoie le total exact de secondes écoulées. */
  const pause = useCallback(() => {
    let total = baseRef.current;
    if (depuis.current !== null) {
      total += Math.floor((Date.now() - depuis.current) / 1000);
      depuis.current = null;
      baseRef.current = total;
      setBase(total);
    }
    return total;
  }, []);

  /** Reprend un chrono déjà commencé (reprise de partie). */
  const initialiser = useCallback((secondes: number) => {
    baseRef.current = secondes;
    setBase(secondes);
  }, []);

  const secondes =
    base + (depuis.current !== null ? Math.floor((Date.now() - depuis.current) / 1000) : 0);

  return { secondes, demarrer, pause, initialiser };
}
