// context/jeux.tsx
// Source unique des jeux : catalogue intégré + jeux ajoutés (base locale) + favoris.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { JEUX, type Jeu } from "@/data/jeux";
import { definirFavori, listerFavoris } from "@/db/favoris";
import { listerJeux, supprimerJeu as dbSupprimerJeu } from "@/db/jeux";

type JeuxContexte = {
  jeux: Jeu[]; // ajoutés + intégrés
  importes: Jeu[];
  estImporte: (id: string) => boolean;
  estFavori: (id: string) => boolean;
  basculerFavori: (id: string) => void;
  rafraichir: () => void;
  supprimerJeu: (id: string) => Promise<void>;
};

const Contexte = createContext<JeuxContexte | null>(null);

export function JeuxProvider({ children }: { children: ReactNode }) {
  const [importes, setImportes] = useState<Jeu[]>([]);
  const [favoris, setFavoris] = useState<string[]>([]);

  const rafraichir = useCallback(() => {
    listerJeux()
      .then(setImportes)
      .catch(() => setImportes([]));
    listerFavoris()
      .then(setFavoris)
      .catch(() => setFavoris([]));
  }, []);

  useEffect(() => {
    rafraichir();
  }, [rafraichir]);

  const basculerFavori = useCallback((id: string) => {
    setFavoris((prev) => {
      const actif = !prev.includes(id);
      definirFavori(id, actif).catch(() => {});
      return actif ? [...prev, id] : prev.filter((f) => f !== id);
    });
  }, []);

  const supprimerJeu = useCallback(
    async (id: string) => {
      await dbSupprimerJeu(id).catch(() => {});
      await definirFavori(id, false).catch(() => {});
      rafraichir();
    },
    [rafraichir],
  );

  const valeur = useMemo<JeuxContexte>(() => {
    const idsImportes = new Set(importes.map((j) => j.id));
    const idsFavoris = new Set(favoris);
    return {
      jeux: [...importes, ...JEUX],
      importes,
      estImporte: (id: string) => idsImportes.has(id),
      estFavori: (id: string) => idsFavoris.has(id),
      basculerFavori,
      rafraichir,
      supprimerJeu,
    };
  }, [importes, favoris, basculerFavori, rafraichir, supprimerJeu]);

  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
}

export function useJeux() {
  const v = useContext(Contexte);
  if (!v) throw new Error("useJeux doit être utilisé à l'intérieur de JeuxProvider");
  return v;
}
