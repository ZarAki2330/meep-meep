import { enumererNoms, plageJoueurs, texteJoueurs, uniteJoueurs } from "@/lib/joueurs";

describe("plageJoueurs", () => {
  it("n'affiche qu'un seul chiffre quand le min et le max sont égaux", () => {
    expect(plageJoueurs({ joueursMin: 2, joueursMax: 2 })).toBe("2");
  });

  it("affiche la fourchette quand le min est inférieur au max", () => {
    expect(plageJoueurs({ joueursMin: 2, joueursMax: 4 })).toBe("2–4");
  });
});

describe("texteJoueurs", () => {
  it("ajoute l'unité « joueurs »", () => {
    expect(texteJoueurs({ joueursMin: 2, joueursMax: 4 })).toBe("2–4 joueurs");
  });

  it("dit « équipes » pour un jeu en équipes, et ne montre qu'un chiffre si min = max", () => {
    expect(texteJoueurs({ joueursMin: 3, joueursMax: 3, equipes: true })).toBe("3 équipes");
  });
});

describe("uniteJoueurs", () => {
  it("distingue joueurs et équipes", () => {
    expect(uniteJoueurs({})).toBe("joueurs");
    expect(uniteJoueurs({ equipes: true })).toBe("équipes");
  });
});

describe("enumererNoms", () => {
  it("annonce un vainqueur seul", () => {
    expect(enumererNoms(["Alice"])).toBe("Alice");
  });

  it("relie deux vainqueurs par « et »", () => {
    expect(enumererNoms(["Alice", "Bob"])).toBe("Alice et Bob");
  });

  it("sépare par des virgules jusqu'au dernier", () => {
    expect(enumererNoms(["Alice", "Bob", "Chloé"])).toBe("Alice, Bob et Chloé");
  });

  it("ne dit rien d'une liste vide", () => {
    expect(enumererNoms([])).toBe("");
  });
});
