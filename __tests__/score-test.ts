import { jeuBibliotheque } from "@/data/bibliotheque";
import {
  bonusGagne,
  classer,
  incrementer,
  lireCase,
  nettoyerEntier,
  nettoyerEntierSigne,
  oublierJoueur,
  purgerCases,
  seuilAtteint,
  sommeCles,
  totalGrille,
  totalManches,
} from "@/lib/score";

describe("nettoyerEntier", () => {
  it("ne garde que les chiffres", () => {
    expect(nettoyerEntier("12a3")).toBe("123");
    expect(nettoyerEntier("")).toBe("");
  });

  it("jette le signe moins : le compteur ne descend pas sous zéro", () => {
    expect(nettoyerEntier("-5")).toBe("5");
  });
});

describe("nettoyerEntierSigne", () => {
  it("garde un signe moins en tête", () => {
    expect(nettoyerEntierSigne("-20")).toBe("-20");
    expect(nettoyerEntierSigne("  -20")).toBe("-20");
  });

  it("ne garde pas un moins au milieu", () => {
    expect(nettoyerEntierSigne("2-0")).toBe("20");
  });

  it("laisse un moins seul, le temps de la frappe", () => {
    expect(nettoyerEntierSigne("-")).toBe("-");
  });
});

describe("lireCase", () => {
  it("lit un nombre", () => {
    expect(lireCase("42")).toBe(42);
    expect(lireCase("-20")).toBe(-20);
  });

  it("rend zéro pour une case vide, absente, ou réduite à un signe", () => {
    expect(lireCase("")).toBe(0);
    expect(lireCase(undefined)).toBe(0);
    expect(lireCase("-")).toBe(0); // « - » en cours de frappe : jamais NaN
  });
});

describe("sommeCles", () => {
  it("additionne les cases demandées, et ignore les autres", () => {
    expect(sommeCles({ a: "1", b: "2", c: "100" }, ["a", "b"])).toBe(3);
  });

  it("compte zéro pour les cases absentes", () => {
    expect(sommeCles({ a: "1" }, ["a", "b"])).toBe(1);
    expect(sommeCles(undefined, ["a"])).toBe(0);
  });

  it("accepte les scores négatifs", () => {
    expect(sommeCles({ a: "10", b: "-4" }, ["a", "b"])).toBe(6);
  });
});

describe("bonusGagne", () => {
  const bonus = { label: "Bonus", surCles: ["d1", "d2"], seuil: 10, points: 35 };

  it("tombe à partir du seuil, jamais avant", () => {
    expect(bonusGagne({ d1: "5", d2: "4" }, bonus)).toBe(0);
    expect(bonusGagne({ d1: "5", d2: "5" }, bonus)).toBe(35); // le seuil compte
    expect(bonusGagne({ d1: "9", d2: "9" }, bonus)).toBe(35);
  });

  it("ne regarde que les cases visées", () => {
    expect(bonusGagne({ d1: "5", d2: "0", autre: "100" }, bonus)).toBe(0);
  });

  it("vaut zéro quand le jeu n'a pas de bonus", () => {
    expect(bonusGagne({ d1: "99" }, undefined)).toBe(0);
  });
});

describe("totalGrille", () => {
  const cats = [{ cle: "a", label: "A" }, { cle: "b", label: "B" }];

  it("additionne les cases", () => {
    expect(totalGrille({ a: "3", b: "4" }, cats)).toBe(7);
  });

  it("ajoute le bonus quand il est gagné", () => {
    const bonus = { label: "B", surCles: ["a"], seuil: 3, points: 10 };
    expect(totalGrille({ a: "3", b: "4" }, cats, bonus)).toBe(17);
    expect(totalGrille({ a: "2", b: "4" }, cats, bonus)).toBe(6);
  });

  it("vaut zéro sur une feuille vierge", () => {
    expect(totalGrille(undefined, cats)).toBe(0);
  });

  // Le vrai Yams : partie haute à 63 déclenche 35 points.
  it("calcule une feuille de Yams complète", () => {
    const yams = jeuBibliotheque("yams")!;
    const parfaite: Record<string, string> = {
      d1: "5", d2: "10", d3: "15", d4: "20", d5: "25", d6: "30", // 105, bonus acquis
      brelan: "20", carre: "25", full: "25", petiteSuite: "30", grandeSuite: "40",
      yams: "50", chance: "25",
    };
    const hautes = 105;
    const basses = 20 + 25 + 25 + 30 + 40 + 50 + 25;
    expect(totalGrille(parfaite, yams.categories!, yams.bonus)).toBe(hautes + basses + 35);

    // Un point de moins en partie haute, et le bonus s'envole.
    const juste = { ...parfaite, d1: "0", d2: "0", d3: "0", d4: "0", d5: "0", d6: "62" };
    expect(totalGrille(juste, yams.categories!, yams.bonus)).toBe(62 + basses);
    const pile = { ...juste, d6: "63" };
    expect(totalGrille(pile, yams.categories!, yams.bonus)).toBe(63 + basses + 35);
  });
});

describe("totalManches", () => {
  it("additionne les manches, de 1 à n", () => {
    expect(totalManches({ "1": "10", "2": "20" }, 2)).toBe(30);
  });

  it("ignore les manches au-delà du compte", () => {
    expect(totalManches({ "1": "10", "2": "20", "3": "999" }, 2)).toBe(30);
  });

  it("compte zéro pour une manche non saisie", () => {
    expect(totalManches({ "2": "20" }, 3)).toBe(20);
    expect(totalManches(undefined, 10)).toBe(0);
  });

  // Skull King : un contrat manqué coûte des points.
  it("accepte un total négatif", () => {
    expect(totalManches({ "1": "20", "2": "-30" }, 2)).toBe(-10);
  });
});

describe("incrementer", () => {
  it("monte et descend", () => {
    expect(incrementer(5, 1)).toBe(6);
    expect(incrementer(5, -1)).toBe(4);
    expect(incrementer(0, 5)).toBe(5);
  });

  it("ne descend jamais sous zéro", () => {
    expect(incrementer(0, -1)).toBe(0);
    expect(incrementer(3, -10)).toBe(0);
  });
});

describe("classer", () => {
  const j = (nom: string, score: number) => ({ nom, score });
  const score = (x: { score: number }) => x.score;

  it("désigne le plus grand score quand le plus de points gagne", () => {
    const c = classer([j("A", 10), j("B", 30), j("C", 20)], score, "max");
    expect(c.meilleur).toBe(30);
    expect(c.gagnants.map((g) => g.nom)).toEqual(["B"]);
    expect(c.egalite).toBe(false);
  });

  it("désigne le plus petit score quand le moins de points gagne", () => {
    const c = classer([j("A", 10), j("B", 30)], score, "min");
    expect(c.meilleur).toBe(10);
    expect(c.gagnants.map((g) => g.nom)).toEqual(["A"]);
  });

  // Au 6 qui prend, le seuil regarde le plus mauvais joueur.
  it("rend toujours le score le plus haut comme « pire »", () => {
    expect(classer([j("A", 10), j("B", 30)], score, "min").pire).toBe(30);
    expect(classer([j("A", 10), j("B", 30)], score, "max").pire).toBe(30);
  });

  it("signale une égalité en tête", () => {
    const c = classer([j("A", 30), j("B", 30), j("C", 10)], score, "max");
    expect(c.egalite).toBe(true);
    expect(c.gagnants.map((g) => g.nom)).toEqual(["A", "B"]);
    expect(c.tousEgaux).toBe(false);
  });

  it("distingue « tous égaux » d'une égalité en tête", () => {
    const c = classer([j("A", 5), j("B", 5)], score, "max");
    expect(c.tousEgaux).toBe(true);
    expect(c.egalite).toBe(true);
  });

  it("ne voit pas d'égalité chez un joueur seul", () => {
    const c = classer([j("A", 5)], score, "max");
    expect(c.egalite).toBe(false);
    expect(c.tousEgaux).toBe(true);
  });

  // Math.min() d'un tableau vide vaut Infinity : le garde-fou est nécessaire.
  it("survit à une table vide", () => {
    const c = classer([], score, "max");
    expect(c).toEqual({ meilleur: 0, pire: 0, gagnants: [], tousEgaux: true, egalite: false });
  });

  it("gère les scores négatifs", () => {
    const c = classer([j("A", -30), j("B", 20)], score, "max");
    expect(c.gagnants.map((g) => g.nom)).toEqual(["B"]);
    expect(classer([j("A", -30), j("B", 20)], score, "min").meilleur).toBe(-30);
  });
});

describe("seuilAtteint", () => {
  it("s'arrête au seuil, pas avant", () => {
    expect(seuilAtteint(65, 66)).toBe(false);
    expect(seuilAtteint(66, 66)).toBe(true);
    expect(seuilAtteint(70, 66)).toBe(true);
  });

  it("ne s'arrête jamais quand le jeu n'a pas de seuil", () => {
    expect(seuilAtteint(9999, undefined)).toBe(false);
  });

  it("accepte un seuil de zéro", () => {
    expect(seuilAtteint(0, 0)).toBe(true);
  });
});

describe("purgerCases", () => {
  it("ne garde que les cases connues du jeu", () => {
    const scores = { j1: { a: "1", disparue: "50" }, j2: { a: "2" } };
    expect(purgerCases(scores, ["a"])).toEqual({ j1: { a: "1" }, j2: { a: "2" } });
  });

  it("vide les cases quand le jeu n'en a plus aucune", () => {
    expect(purgerCases({ j1: { a: "1" } }, [])).toEqual({ j1: {} });
  });

  it("ne modifie pas l'objet reçu", () => {
    const scores = { j1: { a: "1", b: "2" } };
    purgerCases(scores, ["a"]);
    expect(scores.j1.b).toBe("2");
  });

  it("conserve les joueurs sans aucune case", () => {
    expect(purgerCases({ j1: {} }, ["a"])).toEqual({ j1: {} });
  });
});

describe("oublierJoueur", () => {
  it("retire les cases d'un joueur", () => {
    expect(oublierJoueur({ a: 1, b: 2 }, "a")).toEqual({ b: 2 });
  });

  it("ne modifie pas l'objet reçu", () => {
    const avant = { a: 1 };
    oublierJoueur(avant, "a");
    expect(avant).toEqual({ a: 1 });
  });

  it("ne bronche pas sur un joueur absent", () => {
    expect(oublierJoueur({ a: 1 }, "z")).toEqual({ a: 1 });
  });
});
