import { type JoueurScore } from "@/db/parties";
import {
  aGagne,
  lignesDe,
  ligneDe,
  nomPropre,
  participantsDe,
  personnesDe,
  vainqueursDe,
  type PartieLisible,
} from "@/lib/lignes-partie";

const J = (nom: string, membres?: string[]): JoueurScore => ({
  nom,
  score: 0,
  ...(membres ? { membres } : {}),
});

const partie = (lignes: JoueurScore[], gagnant = "", resultat: PartieLisible["resultat"] = null) =>
  ({ details: JSON.stringify(lignes), gagnant, resultat }) satisfies PartieLisible;

describe("lignesDe", () => {
  it("lit un tableau de lignes", () => {
    expect(lignesDe(JSON.stringify([J("Alice")]))).toEqual([{ nom: "Alice", score: 0 }]);
  });

  it("rend une liste vide sur du JSON illisible", () => {
    expect(lignesDe("{{{")).toEqual([]);
  });

  // Un JSON valide n'est pas forcément un tableau : `JSON.parse("null")` réussit.
  it("rend une liste vide sur du JSON valide qui n'est pas un tableau", () => {
    expect(lignesDe("null")).toEqual([]);
    expect(lignesDe("{}")).toEqual([]);
    expect(lignesDe("42")).toEqual([]);
    expect(lignesDe('"Alice"')).toEqual([]);
  });
});

describe("personnesDe", () => {
  it("rend le joueur d'une ligne simple", () => {
    expect(personnesDe(J("Alice"))).toEqual(["Alice"]);
  });

  it("rend les membres d'une équipe, pas l'équipe", () => {
    expect(personnesDe(J("Rouge", ["Alice", "Chloé"]))).toEqual(["Alice", "Chloé"]);
  });

  it("retombe sur le nom quand l'équipe n'a aucun membre", () => {
    expect(personnesDe(J("Rouge", []))).toEqual(["Rouge"]);
  });

  it("ne compte qu'une fois un membre saisi deux fois", () => {
    expect(personnesDe(J("Rouge", ["Alice", "Alice"]))).toEqual(["Alice"]);
  });
});

describe("participantsDe", () => {
  it("réunit les joueurs de toutes les lignes", () => {
    const lignes = [J("Rouge", ["Alice", "Chloé"]), J("Bleu", ["Bob"])];
    expect(participantsDe(lignes)).toEqual(["Alice", "Chloé", "Bob"]);
  });

  // Un joueur inscrit dans deux équipes n'a pas joué deux parties.
  it("dédoublonne un joueur présent dans deux équipes", () => {
    const lignes = [J("Rouge", ["Alice", "Bob"]), J("Bleu", ["Bob"])];
    expect(participantsDe(lignes)).toEqual(["Alice", "Bob"]);
  });

  it("ne rend rien pour une partie sans ligne", () => {
    expect(participantsDe([])).toEqual([]);
  });
});

describe("vainqueursDe", () => {
  it("désigne le gagnant d'une partie compétitive", () => {
    expect(vainqueursDe(partie([J("Alice"), J("Bob")], "Alice"))).toEqual(["Alice"]);
  });

  // Le vainqueur enregistré est le nom de l'ÉQUIPE : ce sont ses membres qui gagnent.
  it("crédite les membres de l'équipe victorieuse, jamais l'équipe", () => {
    const p = partie([J("Rouge", ["Alice", "Chloé"]), J("Bleu", ["Bob"])], "Rouge");
    expect(vainqueursDe(p)).toEqual(["Alice", "Chloé"]);
    expect(vainqueursDe(p)).not.toContain("Rouge");
  });

  it("ne désigne personne sur une égalité", () => {
    expect(vainqueursDe(partie([J("Alice"), J("Bob")], ""))).toEqual([]);
  });

  it("crédite toute la table sur un coopératif gagné", () => {
    const p = partie([J("Alice"), J("Bob")], "", "victoire");
    expect(vainqueursDe(p)).toEqual(["Alice", "Bob"]);
  });

  it("ne désigne personne sur un coopératif perdu", () => {
    expect(vainqueursDe(partie([J("Alice")], "", "defaite"))).toEqual([]);
  });

  it("s'en tient au nom retenu quand la ligne gagnante a disparu", () => {
    expect(vainqueursDe(partie([J("Bob")], "Alice"))).toEqual(["Alice"]);
  });

  // Deux lignes homonymes : une seule victoire, pas deux.
  it("ne crédite qu'une fois un vainqueur inscrit deux fois", () => {
    expect(vainqueursDe(partie([J("Alice"), J("Alice")], "Alice"))).toEqual(["Alice"]);
  });

  it("ne crédite qu'une fois un joueur présent dans deux équipes gagnantes", () => {
    const p = partie([J("Rouge", ["Alice", "Bob"]), J("Rouge", ["Bob"])], "Rouge");
    expect(vainqueursDe(p)).toEqual(["Alice", "Bob"]);
  });

  it("survit à un JSON abîmé", () => {
    expect(vainqueursDe({ details: "{{{", gagnant: "Alice", resultat: null })).toEqual(["Alice"]);
    expect(vainqueursDe({ details: "null", gagnant: "", resultat: "victoire" })).toEqual([]);
  });
});

describe("aGagne", () => {
  it("reconnaît un membre de l'équipe victorieuse", () => {
    const p = partie([J("Rouge", ["Alice"]), J("Bleu", ["Bob"])], "Rouge");
    expect(aGagne(p, "Alice")).toBe(true);
    expect(aGagne(p, "Bob")).toBe(false);
    // L'équipe elle-même n'est pas une personne.
    expect(aGagne(p, "Rouge")).toBe(false);
  });

  it("ne donne la victoire à personne sur une égalité", () => {
    expect(aGagne(partie([J("Alice")], ""), "Alice")).toBe(false);
  });
});

describe("ligneDe", () => {
  it("trouve la ligne d'un joueur seul", () => {
    const lignes = [J("Alice"), J("Bob")];
    expect(ligneDe(lignes, "Bob")?.nom).toBe("Bob");
  });

  it("trouve l'équipe d'un membre", () => {
    const lignes = [J("Rouge", ["Alice"]), J("Bleu", ["Bob"])];
    expect(ligneDe(lignes, "Alice")?.nom).toBe("Rouge");
  });

  it("ne trouve rien pour un absent", () => {
    expect(ligneDe([J("Alice")], "Zoé")).toBeUndefined();
  });
});

describe("nomPropre", () => {
  // Un vainqueur au nom vide serait enregistré comme une égalité.
  it("rend son nom par défaut à un champ vidé", () => {
    expect(nomPropre("", "Joueur 1")).toBe("Joueur 1");
    expect(nomPropre("   ", "Joueur 1")).toBe("Joueur 1");
  });

  it("laisse un vrai nom intact, espaces compris à l'intérieur", () => {
    expect(nomPropre("Jean Pierre", "Joueur 1")).toBe("Jean Pierre");
    expect(nomPropre("  Alice  ", "Joueur 1")).toBe("Alice");
  });
});
