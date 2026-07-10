import { type Jeu } from "@/data/jeux";
import { jeuVersTexte, texteVersJeu } from "@/lib/jeu-partage";

const yams: Jeu = {
  id: "yams",
  nom: "Yams",
  description: "Cinq dés.",
  joueursMin: 1,
  joueursMax: 8,
  dureeMin: 30,
  ageMin: 8,
  categorie: "Dés",
  scoreVictoire: "max",
  scoreMode: "grille",
  regles: ["Lance les dés."],
  categories: [{ cle: "d1", label: "Total des 1", section: "Partie haute" }],
  bonus: { label: "Bonus", surCles: ["d1"], seuil: 63, points: 35 },
};

describe("jeuVersTexte", () => {
  it("enveloppe le jeu et retire son identifiant", () => {
    const brut = JSON.parse(jeuVersTexte(yams));
    expect(brut.meepMeepJeu).toBe(1);
    expect(brut.jeu.id).toBeUndefined();
    expect(brut.jeu.nom).toBe("Yams");
  });

  it("conserve les cases et le bonus", () => {
    const brut = JSON.parse(jeuVersTexte(yams));
    expect(brut.jeu.categories).toHaveLength(1);
    expect(brut.jeu.bonus.seuil).toBe(63);
  });
});

describe("texteVersJeu", () => {
  it("fait l'aller-retour", () => {
    const relu = texteVersJeu(jeuVersTexte(yams));
    const { id: _id, ...sansId } = yams;
    expect(relu).toEqual(sansId);
  });

  it("tolère l'objet nu, sans enveloppe", () => {
    expect(texteVersJeu('{"nom":"Belote"}').nom).toBe("Belote");
  });

  it("tolère les espaces autour", () => {
    expect(texteVersJeu('  \n {"nom":"Belote"} \n ').nom).toBe("Belote");
  });

  it("refuse un texte qui n'est pas du JSON", () => {
    expect(() => texteVersJeu("bonjour")).toThrow(/JSON/);
  });

  it("refuse un JSON qui ne décrit pas un jeu", () => {
    expect(() => texteVersJeu('{"autre":1}')).toThrow(/Meep Meep/);
    expect(() => texteVersJeu('{"nom":"   "}')).toThrow(/Meep Meep/);
    expect(() => texteVersJeu("null")).toThrow(/Meep Meep/);
  });

  // Une enveloppe d'une version future ne doit pas être lue comme un jeu nu.
  it("ignore l'enveloppe quand la version est inconnue", () => {
    expect(() => texteVersJeu('{"meepMeepJeu":2,"jeu":{"nom":"Belote"}}')).toThrow(/Meep Meep/);
  });
});
