// hooks/use-partie.ts
// Le tronc commun des écrans de score : les joueurs, le chronomètre, la reprise
// d'une partie interrompue, et l'enregistrement final.
//
// Ce qui change d'un mode à l'autre — la façon de compter les points — reste
// dans l'écran. Ce qui ne change pas vit ici, une seule fois.

import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { type Jeu } from "@/data/jeux";
import { listerJoueurs, type JoueurEnregistre } from "@/db/joueurs";
import { chargerEtat, effacerEtat, sauvegarderEtat } from "@/db/partie-en-cours";
import {
  enregistrerPartie,
  modifierPartie,
  noterPartie,
  type JoueurScore,
  type Resultat,
} from "@/db/parties";

import { nomPropre } from "@/lib/lignes-partie";

import { useChrono } from "./use-chrono";

/**
 * Une ligne de la table : un joueur, ou une équipe.
 * « score » ne sert qu'au mode compteur ; les autres modes calculent leur total
 * à partir de leur propre grille.
 */
export type JoueurPartie = {
  id: string;
  nom: string;
  score: number;
  membres?: string[];
  role?: string;
};

/** « Équipe 1 » plutôt que « Joueur 1 » quand le jeu se joue en équipes. */
export function prefixeJoueur(jeu?: Jeu): string {
  return jeu?.equipes ? "Équipe" : "Joueur";
}

function joueursParDefaut(prefixe: string): JoueurPartie[] {
  return [
    { id: "j1", nom: `${prefixe} 1`, score: 0 },
    { id: "j2", nom: `${prefixe} 2`, score: 0 },
  ];
}

type Options<E extends object> = {
  jeuId: string;
  jeu?: Jeu;
  /** L'état propre au mode : grille de scores, nombre de manches, vainqueur désigné… */
  extraInitial: E;
  /** Vrai quand rien n'a été saisi : inutile de retenir une partie à reprendre. */
  vierge: (joueurs: JoueurPartie[], extra: E) => boolean;
  /**
   * Dernière chance de corriger l'état repris avant de l'afficher.
   * La feuille de score y jette les cases que le jeu ne connaît plus.
   */
  nettoyer?: (extra: E) => E;
};

export function usePartie<E extends object>({
  jeuId,
  jeu,
  extraInitial,
  vierge,
  nettoyer,
}: Options<E>) {
  const modeEquipes = jeu?.equipes === true;
  const prefixe = prefixeJoueur(jeu);
  // Le mode qui a produit l'état sauvegardé. Le changer rend cet état illisible.
  const mode = jeu?.scoreMode ?? "compteur";

  const [joueurs, setJoueurs] = useState<JoueurPartie[]>(() => joueursParDefaut(prefixe));
  const [extra, setExtra] = useState<E>(extraInitial);

  const [joueursConnus, setJoueursConnus] = useState<JoueurEnregistre[]>([]);
  const [charge, setCharge] = useState(false);
  const [reprise, setReprise] = useState(false);
  const [termine, setTermine] = useState(false);
  const [partieId, setPartieId] = useState<number | null>(null);
  const [bilanOuvert, setBilanOuvert] = useState(false);
  const [tirageOuvert, setTirageOuvert] = useState(false);
  const [egaliteOuverte, setEgaliteOuverte] = useState(false);
  const [membresPour, setMembresPour] = useState<string | null>(null);

  // Ces valeurs sont lues dans des effets sans y figurer comme dépendances :
  // un objet recréé à chaque rendu y relancerait l'effet en boucle.
  const clesExtra = useRef(Object.keys(extraInitial));
  const viergeRef = useRef(vierge);
  viergeRef.current = vierge;
  const nettoyerRef = useRef(nettoyer);
  nettoyerRef.current = nettoyer;
  const partieIdRef = useRef<number | null>(null);

  const { secondes, demarrer, pause, initialiser } = useChrono();
  const secondesRef = useRef(0);
  secondesRef.current = secondes;
  const termineRef = useRef(false);
  termineRef.current = termine;

  useEffect(() => {
    listerJoueurs()
      .then(setJoueursConnus)
      .catch(() => {});
  }, []);

  // Reprise d'une partie laissée en plan.
  useEffect(() => {
    chargerEtat<Record<string, unknown>>(jeuId)
      .then((etat) => {
        const sauves = etat?.joueurs as JoueurPartie[] | undefined;
        if (!sauves?.length) return;

        // Le mode de score du jeu a changé depuis : la grille, les manches ou le
        // vainqueur désigné n'ont plus de sens. Mieux vaut repartir de zéro que
        // de rouvrir une partie amputée en la disant « reprise ».
        const modeSauve = etat?.mode;
        if (typeof modeSauve === "string" && modeSauve !== mode) {
          effacerEtat(jeuId).catch(() => {});
          return;
        }

        setJoueurs(sauves.map((j) => ({ ...j, score: j.score ?? 0 })));

        const repris: Record<string, unknown> = {};
        for (const cle of clesExtra.current) {
          if (etat && cle in etat) repris[cle] = etat[cle];
        }
        if (Object.keys(repris).length) {
          setExtra((prev) => {
            const fusion = { ...prev, ...repris } as E;
            return nettoyerRef.current ? nettoyerRef.current(fusion) : fusion;
          });
        }

        const duree = etat?.duree;
        if (typeof duree === "number" && duree > 0) initialiser(duree);

        // Une partie déjà enregistrée, rouverte par « continuer à modifier »,
        // puis quittée : sans cet identifiant, la reprise en créerait une seconde.
        const idEnregistre = etat?.partieId;
        if (typeof idEnregistre === "number") {
          partieIdRef.current = idEnregistre;
          setPartieId(idEnregistre);
        }

        setReprise(true);
      })
      .catch(() => {})
      .finally(() => setCharge(true));
  }, [jeuId, initialiser, mode]);

  // Le chrono tourne quand l'écran est affiché, se met en pause sinon.
  useFocusEffect(
    useCallback(() => {
      if (!termineRef.current) demarrer();
      return () => {
        pause();
      };
    }, [demarrer, pause]),
  );

  useEffect(() => {
    if (termine) pause();
  }, [termine, pause]);

  // Sauvegarde automatique tant que la partie n'est pas terminée. La durée est
  // lue par référence : on l'enregistre à chaque saisie, pas à chaque seconde.
  useEffect(() => {
    if (!charge || termine) return;
    if (viergeRef.current(joueurs, extra)) {
      effacerEtat(jeuId).catch(() => {});
    } else {
      sauvegarderEtat(jeuId, {
        joueurs,
        ...extra,
        duree: secondesRef.current,
        partieId: partieIdRef.current,
        mode,
      }).catch(() => {});
    }
  }, [charge, termine, joueurs, extra, jeuId, mode]);

  function renommer(id: string, nom: string) {
    setJoueurs((prev) => prev.map((j) => (j.id === id ? { ...j, nom } : j)));
  }

  function ajouterJoueur() {
    setJoueurs((prev) => [
      ...prev,
      { id: `j${Date.now()}`, nom: `${prefixe} ${prev.length + 1}`, score: 0 },
    ]);
  }

  function ajouterJoueurNomme(nom: string) {
    setJoueurs((prev) => {
      // Deux lignes du même nom rendraient les statistiques ambiguës :
      // une seule partie jouée, mais deux scores, et un vainqueur indécidable.
      if (prev.some((j) => j.nom === nom)) return prev;
      return [...prev, { id: `j${Date.now()}`, nom, score: 0 }];
    });
  }

  function supprimerJoueur(id: string) {
    setJoueurs((prev) => prev.filter((j) => j.id !== id));
  }

  function definirMembres(id: string, membres: string[]) {
    setJoueurs((prev) => prev.map((j) => (j.id === id ? { ...j, membres } : j)));
    setMembresPour(null);
  }

  function definirRole(id: string, role?: string) {
    setJoueurs((prev) => prev.map((j) => (j.id === id ? { ...j, role } : j)));
  }

  /**
   * Clôt la partie et l'enregistre.
   *
   * Rappelée après un « continuer à modifier », elle CORRIGE la ligne déjà
   * écrite au lieu d'en créer une seconde. Elle l'ignorait auparavant : les
   * scores corrigés n'atteignaient jamais l'historique.
   */
  async function terminerPartie(p: {
    joueurs: JoueurScore[];
    gagnant: string;
    scoreGagnant: number;
    resultat?: Resultat;
  }) {
    const duree = pause();
    setEgaliteOuverte(false);
    setTermine(true);
    setReprise(false);
    effacerEtat(jeuId).catch(() => {});

    try {
      if (partieIdRef.current !== null) {
        await modifierPartie(
          partieIdRef.current,
          p.joueurs,
          p.gagnant,
          p.scoreGagnant,
          p.resultat ?? null,
          duree,
          modeEquipes,
        );
      } else {
        const id = await enregistrerPartie({
          jeuId,
          jeuNom: jeu ? jeu.nom : "Partie",
          joueurs: p.joueurs,
          gagnant: p.gagnant,
          scoreGagnant: p.scoreGagnant,
          resultat: p.resultat,
          duree,
          equipes: modeEquipes,
        });
        partieIdRef.current = id;
        setPartieId(id);
      }
      setBilanOuvert(true);
    } catch {
      // La partie n'a pas pu être écrite, mais l'écran reste utilisable.
    }
  }

  /** Rouvre la saisie sans repartir de zéro : la partie enregistrée reste la même. */
  function continuerEdition() {
    setTermine(false);
    demarrer();
  }

  /** Repart sur une partie neuve : nouveau chrono, nouvelle ligne d'historique. */
  function reinitialiser() {
    partieIdRef.current = null;
    setPartieId(null);
    setTermine(false);
    setReprise(false);
    initialiser(0);
    demarrer();
  }

  function noter(evaluation: number | null, note: string) {
    if (partieId) noterPartie(partieId, evaluation, note).catch(() => {});
    setBilanOuvert(false);
  }

  const joueursSauvegardes = joueursConnus.map((j) => j.nom);

  /**
   * Le nom d'une ligne, tel qu'il doit être enregistré.
   *
   * Le champ du nom se vide librement pendant la saisie. Un vainqueur au nom
   * vide serait écrit comme une égalité — c'est ce que signifie un `gagnant`
   * vide partout ailleurs. On lui rend donc son nom par défaut.
   */
  const nomDe = useCallback(
    (j: JoueurPartie) => nomPropre(j.nom, `${prefixe} ${joueurs.indexOf(j) + 1}`),
    [joueurs, prefixe],
  );

  /**
   * Parmi qui tire-t-on le premier joueur ?
   * En équipes, ce sont les membres qui jouent — « Équipe 1 » ne pose pas de carte.
   * Une équipe sans membre revient à son nom, faute de mieux.
   */
  const nomsPourTirage = useMemo(
    () =>
      Array.from(
        new Set(joueurs.flatMap((j) => (j.membres?.length ? j.membres : [nomDe(j)]))),
      ),
    [joueurs, nomDe],
  );

  // En équipes, les joueurs connus se choisissent comme membres, pas comme équipes.
  const joueursDispo = modeEquipes
    ? []
    : joueursSauvegardes.filter((n) => !joueurs.some((j) => j.nom === n));

  /**
   * Le portrait d'un joueur, s'il en a un.
   * En équipes, la ligne porte le nom de l'équipe : aucune photo ne lui répond,
   * et l'initiale colorée reprend sa place. C'est le comportement voulu.
   */
  const photoDe = (nom: string) => joueursConnus.find((j) => j.nom === nom)?.photo ?? null;

  return {
    // état
    joueurs,
    setJoueurs,
    extra,
    setExtra,
    joueursSauvegardes,
    joueursDispo,
    photoDe,
    nomDe,
    nomsPourTirage,
    modeEquipes,
    prefixe,
    charge,
    reprise,
    termine,
    secondes,

    // dialogues
    membresPour,
    setMembresPour,
    tirageOuvert,
    setTirageOuvert,
    egaliteOuverte,
    setEgaliteOuverte,
    bilanOuvert,
    fermerBilan: () => setBilanOuvert(false),
    noter,

    // actions
    renommer,
    ajouterJoueur,
    ajouterJoueurNomme,
    supprimerJoueur,
    definirMembres,
    definirRole,
    terminerPartie,
    continuerEdition,
    reinitialiser,
  };
}
