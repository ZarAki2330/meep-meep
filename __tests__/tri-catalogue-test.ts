import { type Jeu } from "@/data/jeux";
import { trierJeux, type StatsJeu } from "@/lib/tri-catalogue";

const jeu = (id: string, nom: string): Jeu => ({
  id,
  nom,
  description: "",
  joueursMin: 2,
  joueursMax: 4,
  dureeMin: 30,
  ageMin: 8,
  categorie: "Divers",
  scoreVictoire: "max",
  regles: [],
});

const catan = jeu("catan", "Catan");
const azul = jeu("azul", "Azul");
const elan = jeu("elan", "Élan");
const escrime = jeu("escrime", "Escrime");

describe("trierJeux", () => {
  it("laisse l'ordre intact par défaut", () => {
    const liste = [catan, azul];
    expect(trierJeux(liste, "defaut")).toBe(liste);
  });

  it("ne modifie jamais la liste reçue", () => {
    const liste = [catan, azul];
    trierJeux(liste, "alpha");
    expect(liste[0]).toBe(catan);
  });

  it("range alphabétiquement", () => {
    expect(trierJeux([catan, azul], "alpha").map((j) => j.nom)).toEqual(["Azul", "Catan"]);
  });

  // « Élan » avant « Escrime » : l'accent ne doit pas rejeter le mot à la fin.
  it("range les accents comme un francophone", () => {
    expect(trierJeux([escrime, elan], "alpha").map((j) => j.nom)).toEqual(["Élan", "Escrime"]);
  });

  describe("les plus joués", () => {
    const stats: Record<string, StatsJeu> = {
      catan: { parties: 5, derniere: "2026-01-01" },
      azul: { parties: 9, derniere: "2025-01-01" },
    };

    it("classe par nombre de parties", () => {
      expect(trierJeux([catan, azul], "plusJoues", stats).map((j) => j.nom)).toEqual([
        "Azul",
        "Catan",
      ]);
    });

    it("départage à égalité par ordre alphabétique", () => {
      const ex: Record<string, StatsJeu> = {
        catan: { parties: 3, derniere: "" },
        azul: { parties: 3, derniere: "" },
      };
      expect(trierJeux([catan, azul], "plusJoues", ex).map((j) => j.nom)).toEqual(["Azul", "Catan"]);
    });

    it("renvoie les jamais joués à la fin", () => {
      expect(trierJeux([elan, catan], "plusJoues", stats).map((j) => j.nom)).toEqual([
        "Catan",
        "Élan",
      ]);
    });
  });

  describe("joués récemment", () => {
    const stats: Record<string, StatsJeu> = {
      catan: { parties: 1, derniere: "2026-05-01T10:00:00Z" },
      azul: { parties: 1, derniere: "2026-06-01T10:00:00Z" },
    };

    it("classe du plus récent au plus ancien", () => {
      expect(trierJeux([catan, azul], "recents", stats).map((j) => j.nom)).toEqual([
        "Azul",
        "Catan",
      ]);
    });

    it("renvoie les jamais joués à la fin, rangés entre eux", () => {
      expect(trierJeux([escrime, elan, catan], "recents", stats).map((j) => j.nom)).toEqual([
        "Catan",
        "Élan",
        "Escrime",
      ]);
    });

    it("survit à des statistiques absentes", () => {
      expect(trierJeux([catan, azul], "recents").map((j) => j.nom)).toEqual(["Azul", "Catan"]);
    });
  });
});
