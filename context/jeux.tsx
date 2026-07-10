// context/jeux.tsx
// Source unique des jeux : la base locale, et rien d'autre.
// Les jeux tout prêts viennent de data/bibliotheque.ts, mais seulement une fois
// ajoutés au catalogue : ici, tous les jeux se valent.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { type Jeu } from "@/data/jeux";
import { definirFavori, listerFavoris } from "@/db/favoris";
import { amorcerBibliotheque, listerJeux, supprimerJeu as dbSupprimerJeu } from "@/db/jeux";
import { effacerEtat } from "@/db/partie-en-cours";
import { supprimerImage } from "@/lib/images";
import { nettoyerToutesLesImages } from "@/lib/menage-images";

type JeuxContexte = {
  jeux: Jeu[];
  pret: boolean; // les jeux de la base ont été chargés
  estFavori: (id: string) => boolean;
  basculerFavori: (id: string) => void;
  rafraichir: () => void;
  supprimerJeu: (id: string) => Promise<void>;
};

const Contexte = createContext<JeuxContexte | null>(null);

export function JeuxProvider({ children }: { children: ReactNode }) {
  const [jeux, setJeux] = useState<Jeu[]>([]);
  const [favoris, setFavoris] = useState<string[]>([]);
  const [pret, setPret] = useState(false);

  // Le balayage des photos orphelines — jeux et joueurs — n'a lieu qu'une fois,
  // au démarrage. Il relit la base lui-même, sur des listes complètes : un
  // balayage sur une liste partielle effacerait des photos encore utilisées.
  const balayageFait = useRef(false);

  const rafraichir = useCallback(() => {
    listerJeux()
      .then((liste) => {
        setJeux(liste);
        if (!balayageFait.current) {
          balayageFait.current = true;
          nettoyerToutesLesImages().catch(() => {});
        }
      })
      .catch(() => setJeux([]))
      .finally(() => setPret(true));
    listerFavoris()
      .then(setFavoris)
      .catch(() => setFavoris([]));
  }, []);

  // Au premier lancement, la base est vide : on y dépose les jeux d'origine
  // avant de la lire, sinon le catalogue s'ouvrirait sur rien.
  useEffect(() => {
    amorcerBibliotheque()
      .catch(() => {})
      .finally(rafraichir);
  }, [rafraichir]);

  const basculerFavori = useCallback((id: string) => {
    setFavoris((prev) => {
      const actif = !prev.includes(id);
      definirFavori(id, actif).catch(() => {});
      return actif ? [...prev, id] : prev.filter((f) => f !== id);
    });
  }, []);

  // La liste est lue par référence : sinon `supprimerJeu` changerait d'identité
  // à chaque rafraîchissement du catalogue, et referait le contexte avec lui.
  const jeuxRef = useRef(jeux);
  jeuxRef.current = jeux;

  const supprimerJeu = useCallback(
    async (id: string) => {
      // La photo se lit avant la suppression : après, plus personne ne sait où elle est.
      const image = jeuxRef.current.find((j) => j.id === id)?.image;
      await dbSupprimerJeu(id).catch(() => {});
      await definirFavori(id, false).catch(() => {});
      // Sans cela, une partie en cours survit à son jeu. Un jeu réimporté sous
      // le même identifiant se verrait proposer la reprise d'une partie étrangère.
      await effacerEtat(id).catch(() => {});
      await supprimerImage(image);
      rafraichir();
    },
    [rafraichir],
  );

  const valeur = useMemo<JeuxContexte>(() => {
    const idsFavoris = new Set(favoris);
    return {
      jeux,
      pret,
      estFavori: (id: string) => idsFavoris.has(id),
      basculerFavori,
      rafraichir,
      supprimerJeu,
    };
  }, [jeux, favoris, pret, basculerFavori, rafraichir, supprimerJeu]);

  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
}

export function useJeux() {
  const v = useContext(Contexte);
  if (!v) throw new Error("useJeux doit être utilisé à l'intérieur de JeuxProvider");
  return v;
}
