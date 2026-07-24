import { lettreInitiale, trierBibliotheque } from "@/lib/tri-bibliotheque";
import { type Jeu } from "@/data/jeux";

function jeu(p: Partial<Jeu>): Jeu {
  return {
    id: p.id ?? "x",
    nom: "Jeu",
    categorie: "Cartes",
    joueursMin: 2,
    joueursMax: 4,
    dureeMin: 30,
    description: "",
    regles: [],
    ...p,
  } as Jeu;
}

const noms = (l: Jeu[]) => l.map((j) => j.nom);

describe("trierBibliotheque", () => {
  it("trie par nom, à la française (accents ignorés)", () => {
    const l = [jeu({ nom: "Escrime" }), jeu({ nom: "Élan" }), jeu({ nom: "Abc" })];
    expect(noms(trierBibliotheque(l, "alpha"))).toEqual(["Abc", "Élan", "Escrime"]);
  });

  it("range les jeux commençant par un chiffre à la fin, entre eux par nom", () => {
    const l = [
      jeu({ nom: "7 Wonders" }),
      jeu({ nom: "Bruges" }),
      jeu({ nom: "6 qui prend" }),
      jeu({ nom: "Azul" }),
    ];
    expect(noms(trierBibliotheque(l, "alpha"))).toEqual([
      "Azul",
      "Bruges",
      "6 qui prend",
      "7 Wonders",
    ]);
  });

  it("trie par catégorie, puis par nom dans chaque catégorie", () => {
    const l = [
      jeu({ nom: "Zonk", categorie: "Ambiance" }),
      jeu({ nom: "Akropolis", categorie: "Stratégie" }),
      jeu({ nom: "Bluff", categorie: "Ambiance" }),
    ];
    expect(noms(trierBibliotheque(l, "categorie"))).toEqual(["Bluff", "Zonk", "Akropolis"]);
  });

  it("trie par durée croissante", () => {
    const l = [
      jeu({ nom: "Long", dureeMin: 90 }),
      jeu({ nom: "Court", dureeMin: 10 }),
      jeu({ nom: "Moyen", dureeMin: 45 }),
    ];
    expect(noms(trierBibliotheque(l, "duree"))).toEqual(["Court", "Moyen", "Long"]);
  });

  it("trie par nombre de joueurs (min puis max)", () => {
    const l = [
      jeu({ nom: "Famille", joueursMin: 2, joueursMax: 6 }),
      jeu({ nom: "Duo", joueursMin: 2, joueursMax: 2 }),
      jeu({ nom: "Groupe", joueursMin: 4, joueursMax: 8 }),
    ];
    expect(noms(trierBibliotheque(l, "joueurs"))).toEqual(["Duo", "Famille", "Groupe"]);
  });

  it("ne modifie pas la liste reçue", () => {
    const l = [jeu({ nom: "B" }), jeu({ nom: "A" })];
    const avant = noms(l);
    trierBibliotheque(l, "alpha");
    expect(noms(l)).toEqual(avant);
  });
});

describe("lettreInitiale", () => {
  it("ramène les accents à la lettre de base", () => {
    expect(lettreInitiale("Élan")).toBe("E");
    expect(lettreInitiale("Îles")).toBe("I");
  });

  it("met la première lettre en majuscule", () => {
    expect(lettreInitiale("azul")).toBe("A");
  });

  it("range chiffres et symboles sous « # »", () => {
    expect(lettreInitiale("6 qui prend")).toBe("#");
    expect(lettreInitiale("7 Wonders")).toBe("#");
  });

  it("ignore les espaces de début", () => {
    expect(lettreInitiale("  Bruges")).toBe("B");
  });
});
