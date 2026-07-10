import { BIBLIOTHEQUE, IDS_AMORCAGE, jeuBibliotheque } from "@/data/bibliotheque";
import { type Jeu } from "@/data/jeux";
import { cheminPartie } from "@/lib/route-partie";

const jeu = (scoreMode?: Jeu["scoreMode"]): Jeu => ({
  id: "x",
  nom: "X",
  description: "",
  joueursMin: 2,
  joueursMax: 4,
  dureeMin: 30,
  ageMin: 8,
  categorie: "Divers",
  scoreVictoire: "max",
  regles: [],
  scoreMode,
});

describe("cheminPartie", () => {
  it("mène chaque mode à son écran", () => {
    expect(cheminPartie(jeu("compteur"))).toBe("/partie/[jeuId]");
    expect(cheminPartie(jeu("objectif"))).toBe("/objectif/[jeuId]");
    expect(cheminPartie(jeu("grille"))).toBe("/grille/[jeuId]");
    expect(cheminPartie(jeu("manches"))).toBe("/manches/[jeuId]");
    expect(cheminPartie(jeu("cooperatif"))).toBe("/coop/[jeuId]");
  });

  it("retombe sur le compteur quand le mode manque", () => {
    expect(cheminPartie(jeu(undefined))).toBe("/partie/[jeuId]");
  });

  it("sait router chaque jeu de la bibliothèque", () => {
    for (const j of BIBLIOTHEQUE) {
      expect(cheminPartie(j)).toMatch(/^\/[a-z]+\/\[jeuId\]$/);
    }
  });
});

describe("bibliothèque", () => {
  it("n'a pas deux jeux du même identifiant", () => {
    const ids = BIBLIOTHEQUE.map((j) => j.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("donne des bornes de joueurs cohérentes", () => {
    for (const j of BIBLIOTHEQUE) {
      expect(j.joueursMin).toBeLessThanOrEqual(j.joueursMax);
      expect(j.joueursMin).toBeGreaterThan(0);
    }
  });

  it("donne au moins une règle à chaque jeu", () => {
    for (const j of BIBLIOTHEQUE) expect(j.regles.length).toBeGreaterThan(0);
  });

  it("donne des cases à tout jeu en mode feuille de score", () => {
    for (const j of BIBLIOTHEQUE.filter((x) => x.scoreMode === "grille")) {
      expect(j.categories?.length).toBeGreaterThan(0);
    }
  });

  it("ne fait porter un bonus que sur des cases existantes", () => {
    for (const j of BIBLIOTHEQUE) {
      if (!j.bonus) continue;
      const cles = new Set((j.categories ?? []).map((c) => c.cle));
      for (const cle of j.bonus.surCles) expect(cles.has(cle)).toBe(true);
    }
  });

  // Un personnage rattaché à une extension inconnue ne s'afficherait jamais.
  it("ne rattache un personnage qu'à une extension déclarée", () => {
    for (const j of BIBLIOTHEQUE) {
      const extensions = new Set(j.extensions ?? []);
      for (const r of j.roles ?? []) {
        if (r.extension) expect(extensions.has(r.extension)).toBe(true);
      }
    }
  });

  it("livre au premier lancement des jeux qui existent", () => {
    for (const id of IDS_AMORCAGE) expect(jeuBibliotheque(id)).toBeDefined();
  });

  it("ne trouve rien pour un identifiant inconnu", () => {
    expect(jeuBibliotheque("inexistant")).toBeUndefined();
  });
});
