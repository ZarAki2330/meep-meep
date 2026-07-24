import { enfantsDe, estJeuDeBase } from "@/lib/regroupement";
import { type Jeu } from "@/data/jeux";

function jeu(p: Partial<Jeu>): Jeu {
  return {
    id: p.id ?? "x",
    nom: p.nom ?? "Jeu",
    categorie: "Cartes",
    joueursMin: 2,
    joueursMax: 4,
    dureeMin: 30,
    description: "",
    regles: [],
    ...p,
  } as Jeu;
}

describe("estJeuDeBase", () => {
  it("considère un jeu sans champ type comme un jeu de base", () => {
    expect(estJeuDeBase(jeu({ id: "a" }))).toBe(true);
  });

  it('considère le type "jeu" comme un jeu de base', () => {
    expect(estJeuDeBase(jeu({ id: "a", type: "jeu" }))).toBe(true);
  });

  it("ne considère ni une extension ni une édition comme un jeu de base", () => {
    expect(estJeuDeBase(jeu({ id: "e", type: "extension" }))).toBe(false);
    expect(estJeuDeBase(jeu({ id: "d", type: "edition" }))).toBe(false);
  });
});

describe("enfantsDe", () => {
  const liste = [
    jeu({ id: "base" }),
    jeu({ id: "ext1", type: "extension", jeuParent: "base" }),
    jeu({ id: "ed1", type: "edition", jeuParent: "base" }),
    jeu({ id: "autre" }),
    jeu({ id: "ext2", type: "extension", jeuParent: "autre" }),
  ];

  it("renvoie les extensions et éditions rattachées à un jeu, dans l'ordre de la liste", () => {
    expect(enfantsDe("base", liste).map((j) => j.id)).toEqual(["ext1", "ed1"]);
  });

  it("ne renvoie rien pour un jeu sans déclinaison", () => {
    expect(enfantsDe("autre-inconnu", liste)).toEqual([]);
  });

  it("ne mélange pas les déclinaisons de deux jeux de base différents", () => {
    expect(enfantsDe("autre", liste).map((j) => j.id)).toEqual(["ext2"]);
  });

  it("ne renvoie pas le jeu de base lui-même", () => {
    expect(enfantsDe("base", liste).some((j) => j.id === "base")).toBe(false);
  });
});
