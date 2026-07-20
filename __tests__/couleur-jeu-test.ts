import { couleurJeu } from "@/lib/couleur-jeu";
import { type Jeu } from "@/data/jeux";

function jeu(partiel: Partial<Jeu>): Jeu {
  return {
    id: "x",
    nom: "Jeu",
    categorie: "Cartes",
    joueursMin: 2,
    joueursMax: 4,
    dureeMin: 30,
    description: "",
    regles: [],
    ...partiel,
  } as Jeu;
}

describe("couleurJeu", () => {
  it("donne la teinte dédiée d'une catégorie connue", () => {
    expect(couleurJeu(jeu({ categorie: "Cartes" }))).toBe("#1D8F6B");
    expect(couleurJeu(jeu({ categorie: "Ambiance" }))).toBe("#C24E77");
  });

  it("attribue la même couleur à deux jeux de la même catégorie", () => {
    const a = couleurJeu(jeu({ id: "a", categorie: "Réflexion" }));
    const b = couleurJeu(jeu({ id: "b", categorie: "Réflexion" }));
    expect(a).toBe(b);
  });

  it("rend toujours une couleur hexadécimale, même pour une catégorie inconnue", () => {
    const c = couleurJeu(jeu({ categorie: "Catégorie improbable" }));
    expect(c).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it("reste stable pour une catégorie inconnue donnée", () => {
    const c1 = couleurJeu(jeu({ id: "a", categorie: "Zzz" }));
    const c2 = couleurJeu(jeu({ id: "b", categorie: "Zzz" }));
    expect(c1).toBe(c2);
  });

  it("se rabat sur l'identifiant quand la catégorie est vide", () => {
    const c = couleurJeu(jeu({ categorie: "" }));
    expect(c).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });
});
