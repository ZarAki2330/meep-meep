import { type JoueurScore, type PartieEnregistree } from "@/db/parties";
import { partieVersTexte } from "@/lib/partie-partage";

const J = (nom: string, score = 0, extra: Partial<JoueurScore> = {}): JoueurScore => ({
  nom,
  score,
  ...extra,
});

/** Une partie enregistrée type, dont chaque test ne change que ce qui l'intéresse. */
function partie(over: Partial<PartieEnregistree> = {}): PartieEnregistree {
  return {
    id: 1,
    jeu_id: "catan",
    jeu_nom: "Catan",
    // Un mardi, pour vérifier le jour de la semaine.
    date: "2026-03-10T20:30:00.000Z",
    nb_joueurs: 2,
    gagnant: "",
    score_gagnant: null,
    details: JSON.stringify([J("Alice", 10), J("Bob", 8)]),
    duree: null,
    note: null,
    evaluation: null,
    resultat: null,
    extensions: null,
    ...over,
  } as PartieEnregistree;
}

describe("partieVersTexte — en-tête", () => {
  it("annonce le jeu, la date en toutes lettres et le nombre de joueurs", () => {
    const t = partieVersTexte(partie());
    expect(t).toContain("🎲 Catan");
    expect(t).toContain("mardi 10 mars 2026");
    expect(t).toContain("2 joueurs");
  });

  it("accorde le singulier à un joueur seul", () => {
    const t = partieVersTexte(
      partie({ nb_joueurs: 1, details: JSON.stringify([J("Alice", 10)]) }),
    );
    expect(t).toContain("1 joueur");
    expect(t).not.toContain("1 joueurs");
  });

  it("compte les personnes réelles derrière les équipes, pas les lignes", () => {
    const t = partieVersTexte(
      partie({
        nb_joueurs: 2,
        details: JSON.stringify([
          J("Les Rouges", 10, { membres: ["Alice", "Bob"] }),
          J("Les Bleus", 8, { membres: ["Chloé", "David"] }),
        ]),
      }),
    );
    expect(t).toContain("4 joueurs");
  });

  it("se rabat sur le nombre enregistré quand le détail est illisible", () => {
    expect(partieVersTexte(partie({ details: "{{{", nb_joueurs: 5 }))).toContain("5 joueurs");
  });

  it("n'annonce la durée que s'il y en a une", () => {
    expect(partieVersTexte(partie({ duree: 2700 }))).toContain("⏱ 45 min");
    expect(partieVersTexte(partie())).not.toContain("⏱");
  });

  it("tait une date illisible sans laisser de séparateur orphelin", () => {
    const t = partieVersTexte(partie({ date: "pas une date" }));
    expect(t).toContain("🎲 Catan\n2 joueurs");
  });

  it("liste les extensions jouées", () => {
    const t = partieVersTexte(partie({ extensions: JSON.stringify(["Marins", "Villes"]) }));
    expect(t).toContain("Extensions : Marins, Villes");
  });

  it("ignore des extensions illisibles", () => {
    expect(partieVersTexte(partie({ extensions: "{{{" }))).not.toContain("Extensions");
    expect(partieVersTexte(partie({ extensions: "[]" }))).not.toContain("Extensions");
  });
});

describe("partieVersTexte — parties aux points", () => {
  it("classe du plus grand score au plus petit et marque le vainqueur", () => {
    const t = partieVersTexte(
      partie({
        gagnant: "Alice",
        details: JSON.stringify([J("Bob", 8), J("Alice", 10), J("Chloé", 9)]),
      }),
    );
    expect(t).toContain("🏆 Alice — 10");
    expect(t).toContain("2. Chloé — 9");
    expect(t).toContain("3. Bob — 8");
    expect(t.indexOf("Alice")).toBeLessThan(t.indexOf("Chloé"));
    expect(t.indexOf("Chloé")).toBeLessThan(t.indexOf("Bob"));
  });

  it("classe à l'envers quand le moins de points gagne", () => {
    const t = partieVersTexte(
      partie({
        gagnant: "Bob",
        details: JSON.stringify([J("Alice", 10), J("Bob", 8)]),
      }),
      { sens: "min" },
    );
    expect(t).toContain("🏆 Bob — 8");
    expect(t).toContain("2. Alice — 10");
    expect(t.indexOf("Bob")).toBeLessThan(t.indexOf("Alice"));
  });

  it("annonce une égalité quand aucun vainqueur n'a été retenu", () => {
    const t = partieVersTexte(partie({ gagnant: "", details: JSON.stringify([J("Alice", 9), J("Bob", 9)]) }));
    expect(t).toContain("🤝 Partie terminée sur une égalité");
    expect(t).not.toContain("🏆");
  });
});

describe("partieVersTexte — vainqueurs marqués sur la ligne", () => {
  it("marque tous les vainqueurs d'une partie à objectif, sans afficher de score", () => {
    const t = partieVersTexte(
      partie({
        gagnant: "Alice",
        details: JSON.stringify([
          J("Alice", 0, { gagnant: true }),
          J("Bob", 0),
          J("Chloé", 0, { gagnant: true }),
        ]),
      }),
      { objectif: true },
    );
    expect(t).toContain("🏆 Alice");
    expect(t).toContain("🏆 Chloé");
    expect(t).toContain("· Bob");
    expect(t).not.toContain("— 0");
  });

  it("place les vainqueurs en tête à objectif, sans les numéroter", () => {
    const t = partieVersTexte(
      partie({
        gagnant: "Chloé",
        details: JSON.stringify([J("Alice", 0), J("Chloé", 0, { gagnant: true })]),
      }),
      { objectif: true },
    );
    expect(t.indexOf("Chloé")).toBeLessThan(t.indexOf("Alice"));
    expect(t).not.toContain("1.");
  });

  // Parties enregistrées avant que la ligne porte la marque de victoire :
  // seul le nom de la colonne « gagnant » permet encore de la retrouver.
  it("se rabat sur le nom enregistré quand aucune ligne n'est marquée", () => {
    const t = partieVersTexte(
      partie({ gagnant: "Bob", details: JSON.stringify([J("Alice", 4), J("Bob", 12)]) }),
    );
    expect(t).toContain("🏆 Bob — 12");
    expect(t).toContain("2. Alice — 4");
  });

  it("ne marque personne quand le nom enregistré ne correspond à aucune ligne", () => {
    const t = partieVersTexte(
      partie({ gagnant: "Zoé", details: JSON.stringify([J("Alice", 4), J("Bob", 12)]) }),
    );
    expect(t).not.toContain("🏆");
    expect(t).toContain("🤝 Partie terminée sur une égalité");
  });
});

describe("partieVersTexte — parties coopératives", () => {
  it("annonce une victoire commune et garde l'ordre de la table", () => {
    const t = partieVersTexte(
      partie({
        resultat: "victoire",
        details: JSON.stringify([J("Alice", 0), J("Bob", 0)]),
      }),
    );
    expect(t).toContain("🏆 Victoire de toute la table");
    expect(t).toContain("🏆 Alice");
    expect(t).toContain("🏆 Bob");
    expect(t.indexOf("Alice")).toBeLessThan(t.indexOf("Bob"));
    expect(t).not.toContain("🤝");
  });

  it("annonce une défaite sans désigner de vainqueur", () => {
    const t = partieVersTexte(partie({ resultat: "defaite" }));
    expect(t).toContain("😵 Le jeu l'a emporté");
    expect(t).toContain("· Alice");
    expect(t).not.toContain("🏆");
  });
});

describe("partieVersTexte — noms des lignes", () => {
  it("donne les membres d'une équipe entre parenthèses", () => {
    const t = partieVersTexte(
      partie({
        gagnant: "Les Rouges",
        details: JSON.stringify([
          J("Les Rouges", 10, { membres: ["Alice", "Bob"] }),
          J("Les Bleus", 8, { membres: ["Chloé"] }),
        ]),
      }),
    );
    expect(t).toContain("🏆 Les Rouges (Alice, Bob) — 10");
    expect(t).toContain("2. Les Bleus (Chloé) — 8");
  });

  it("donne le rôle tenu, quand il y en a un", () => {
    const t = partieVersTexte(
      partie({
        resultat: "defaite",
        details: JSON.stringify([J("Alice", 0, { role: "Shérif" }), J("Bob", 0)]),
      }),
    );
    expect(t).toContain("· Alice — Shérif");
    expect(t).toContain("· Bob");
  });
});

describe("partieVersTexte — bilan et signature", () => {
  it("dessine l'évaluation en étoiles pleines et vides", () => {
    expect(partieVersTexte(partie({ evaluation: 4 }))).toContain("★★★★☆");
  });

  it("borne une évaluation aberrante à cinq étoiles", () => {
    expect(partieVersTexte(partie({ evaluation: 9 }))).toContain("★★★★★");
  });

  it("reprend la note entre guillemets", () => {
    expect(partieVersTexte(partie({ note: "Fin serrée" }))).toContain("« Fin serrée »");
  });

  it("n'écrit rien quand il n'y a ni note ni évaluation", () => {
    const t = partieVersTexte(partie());
    expect(t).not.toContain("★");
    expect(t).not.toContain("«");
  });

  it("signe toujours, et ne laisse jamais de ligne blanche double", () => {
    const t = partieVersTexte(partie());
    expect(t.endsWith("— Meep Meep")).toBe(true);
    expect(t).not.toContain("\n\n\n");
  });
});

describe("partieVersTexte — robustesse", () => {
  it("produit tout de même un compte-rendu sans aucune ligne lisible", () => {
    const t = partieVersTexte(partie({ details: "{{{", nb_joueurs: 3 }));
    expect(t).toContain("🎲 Catan");
    expect(t).toContain("3 joueurs");
    expect(t.endsWith("— Meep Meep")).toBe(true);
  });

  it("ne renvoie jamais rien d'autre qu'un texte non vide", () => {
    expect(partieVersTexte(partie({ details: "null", date: "" })).length).toBeGreaterThan(0);
  });
});
