import { type JoueurScore, type PartieEnregistree, type Resultat } from "@/db/parties";
import { partiesDe, statsJoueur } from "@/lib/stats-joueur";

const J = (nom: string, membres?: string[]): JoueurScore => ({
  nom,
  score: 0,
  ...(membres ? { membres } : {}),
});

function p(
  id: number,
  jeu: string,
  date: string,
  gagnant: string,
  lignes: JoueurScore[],
  resultat: Resultat | null = null,
): PartieEnregistree {
  return {
    id,
    jeu_id: jeu,
    jeu_nom: jeu,
    date,
    nb_joueurs: lignes.length,
    gagnant,
    score_gagnant: 0,
    details: JSON.stringify(lignes),
    duree: null,
    note: null,
    evaluation: null,
    resultat,
  };
}

// Sept parties, choisies pour piéger : équipe, coopératif gagné, coopératif
// perdu, et une égalité.
const parties = [
  p(1, "Catan", "2026-01-01", "Alice", [J("Alice"), J("Bob"), J("Chloé")]),
  p(2, "Catan", "2026-01-02", "Alice", [J("Alice"), J("Bob")]),
  p(3, "Yams", "2026-01-03", "", [J("Alice"), J("Bob")]), // égalité
  p(4, "Belote", "2026-01-04", "Rouge", [J("Rouge", ["Alice", "Chloé"]), J("Bleu", ["Bob"])]),
  p(5, "Pandémie", "2026-01-05", "", [J("Alice"), J("Bob")], "victoire"),
  p(6, "Pandémie", "2026-01-06", "", [J("Alice"), J("Bob")], "defaite"),
  p(7, "Catan", "2026-01-07", "Alice", [J("Alice"), J("Bob")]),
];

describe("partiesDe", () => {
  it("retient les parties où le joueur figure, la plus récente en tête", () => {
    const siennes = partiesDe(parties, "Alice");
    expect(siennes).toHaveLength(7);
    expect(siennes[0].id).toBe(7);
  });

  it("trouve un joueur caché dans les membres d'une équipe", () => {
    expect(partiesDe(parties, "Chloé").map((x) => x.id)).toEqual([4, 1]);
  });

  it("ne rend rien pour un inconnu", () => {
    expect(partiesDe(parties, "Zoé")).toEqual([]);
  });
});

describe("statsJoueur", () => {
  const s = statsJoueur(parties, "Alice");

  it("compte les parties et les victoires", () => {
    expect(s.parties).toBe(7);
    expect(s.victoires).toBe(5); // 1, 2, 4 (équipe), 5 (coop), 7
    expect(s.taux).toBe(71);
  });

  it("crédite la victoire d'une équipe à ses membres", () => {
    expect(statsJoueur(parties, "Chloé").victoires).toBe(1);
  });

  it("crédite un coopératif gagné à toute la table", () => {
    expect(statsJoueur(parties, "Bob").victoires).toBe(1);
  });

  it("ne compte pas une égalité comme une victoire", () => {
    const seule = [p(1, "Yams", "2026-01-01", "", [J("Alice"), J("Bob")])];
    expect(statsJoueur(seule, "Alice").victoires).toBe(0);
  });

  it("classe les jeux du plus joué au moins joué", () => {
    expect(s.parJeu.map((x) => x.jeu)).toEqual(["Catan", "Pandémie", "Belote", "Yams"]);
    expect(s.parJeu[0]).toMatchObject({ parties: 3, victoires: 3, taux: 100 });
  });

  describe("séries", () => {
    it("compte la plus longue suite de victoires", () => {
      // 1, 2 gagnées ; 3 égalité ; 4, 5 gagnées ; 6 coop perdu ; 7 gagnée.
      expect(s.meilleureSerie).toBe(2);
      expect(s.serieEnCours).toBe(1);
    });

    it("une défaite coopérative brise la série", () => {
      const suite = [
        p(1, "Pandémie", "2026-01-01", "", [J("Alice")], "victoire"),
        p(2, "Pandémie", "2026-01-02", "", [J("Alice")], "defaite"),
        p(3, "Pandémie", "2026-01-03", "", [J("Alice")], "victoire"),
      ];
      expect(statsJoueur(suite, "Alice").meilleureSerie).toBe(1);
    });

    it("une égalité brise la série", () => {
      const suite = [
        p(1, "Catan", "2026-01-01", "Alice", [J("Alice"), J("Bob")]),
        p(2, "Catan", "2026-01-02", "", [J("Alice"), J("Bob")]),
        p(3, "Catan", "2026-01-03", "Alice", [J("Alice"), J("Bob")]),
      ];
      expect(statsJoueur(suite, "Alice").meilleureSerie).toBe(1);
    });
  });

  describe("adversaires et compagnons", () => {
    it("compte tous ceux qu'on croise comme compagnons", () => {
      expect(s.compagnons.find((c) => c.nom === "Chloé")?.parties).toBe(2); // parties 1 et 4
    });

    // Chloé est coéquipière d'Alice à la belote : on ne gagne pas contre elle.
    it("n'affronte pas ses coéquipiers", () => {
      expect(s.adversaires.find((a) => a.nom === "Chloé")?.duels).toBe(1); // la partie 1 seulement
    });

    it("n'affronte personne en coopératif", () => {
      // Bob partage 7 parties, mais seules 5 sont compétitives (1, 2, 3, 4, 7).
      expect(s.compagnons.find((c) => c.nom === "Bob")?.parties).toBe(7);
      expect(s.adversaires.find((a) => a.nom === "Bob")?.duels).toBe(5);
    });

    it("compte une égalité comme un affrontement, sans victoire", () => {
      const bob = s.adversaires.find((a) => a.nom === "Bob");
      expect(bob?.victoiresContre).toBe(4); // parties 1, 2, 4, 7 — pas la 3
    });

    it("classe l'adversaire le plus affronté en tête", () => {
      expect(s.adversaires[0].nom).toBe("Bob");
    });
  });

  it("rend des statistiques vides pour un inconnu", () => {
    const z = statsJoueur(parties, "Zoé");
    expect(z).toMatchObject({ parties: 0, victoires: 0, taux: 0, meilleureSerie: 0 });
    expect(z.parJeu).toEqual([]);
  });

  it("survit à une partie au JSON abîmé", () => {
    const cassee = { ...p(1, "Catan", "2026-01-01", "Alice", []), details: "{{{" };
    expect(() => statsJoueur([cassee], "Alice")).not.toThrow();
    expect(statsJoueur([cassee], "Alice").parties).toBe(0);
  });
});
