import { arbitrerPhotos, renommerDansPartie, type LigneJoueur } from "@/lib/renommage";

const details = (lignes: LigneJoueur[]) => JSON.stringify(lignes);
const j = (nom: string, membres?: string[]): LigneJoueur => ({
  nom,
  score: 0,
  ...(membres ? { membres } : {}),
});

describe("renommerDansPartie", () => {
  it("renomme un joueur qui joue seul", () => {
    const r = renommerDansPartie(
      { details: details([j("Alex"), j("Bob")]), gagnant: "Bob" },
      "Alex",
      "Alexandre",
    );
    expect(r.touchee).toBe(true);
    expect(JSON.parse(r.details)).toEqual([
      { nom: "Alexandre", score: 0 },
      { nom: "Bob", score: 0 },
    ]);
    expect(r.gagnant).toBe("Bob");
  });

  it("renomme le vainqueur", () => {
    const r = renommerDansPartie(
      { details: details([j("Alex"), j("Bob")]), gagnant: "Alex" },
      "Alex",
      "Alexandre",
    );
    expect(r.gagnant).toBe("Alexandre");
  });

  // Le bug trouvé en relisant : un joueur peut n'exister que dans les membres.
  it("renomme un joueur à l'intérieur d'une équipe", () => {
    const r = renommerDansPartie(
      { details: details([j("Rouge", ["Alex", "Chloé"]), j("Bleu", ["Bob"])]), gagnant: "Rouge" },
      "Alex",
      "Alexandre",
    );
    expect(r.touchee).toBe(true);
    const lignes = JSON.parse(r.details) as LigneJoueur[];
    expect(lignes[0].membres).toEqual(["Alexandre", "Chloé"]);
    // Le nom de l'équipe ne bouge pas, et reste le vainqueur.
    expect(lignes[0].nom).toBe("Rouge");
    expect(r.gagnant).toBe("Rouge");
  });

  it("ne touche pas une partie où le joueur n'apparaît pas", () => {
    const avant = { details: details([j("Bob")]), gagnant: "Bob" };
    const r = renommerDansPartie(avant, "Alex", "Alexandre");
    expect(r.touchee).toBe(false);
    expect(r.details).toBe(avant.details);
  });

  it("laisse intacte une partie au JSON abîmé", () => {
    const r = renommerDansPartie({ details: "{pas du json", gagnant: "Alex" }, "Alex", "Alexandre");
    expect(r.touchee).toBe(false);
    expect(r.details).toBe("{pas du json");
  });

  it("refuse un renommage vide ou identique", () => {
    const avant = { details: details([j("Alex")]), gagnant: "Alex" };
    expect(renommerDansPartie(avant, "Alex", "Alex").touchee).toBe(false);
    expect(renommerDansPartie(avant, "Alex", "").touchee).toBe(false);
    expect(renommerDansPartie(avant, "", "Alexandre").touchee).toBe(false);
  });

  it("conserve les champs annexes d'une ligne", () => {
    const r = renommerDansPartie(
      { details: JSON.stringify([{ nom: "Alex", score: 42, role: "Maléfique" }]), gagnant: "" },
      "Alex",
      "Alexandre",
    );
    expect(JSON.parse(r.details)[0]).toEqual({ nom: "Alexandre", score: 42, role: "Maléfique" });
  });

  it("renomme un joueur présent deux fois (équipe et vainqueur)", () => {
    const r = renommerDansPartie(
      { details: details([j("Alex")]), gagnant: "Alex" },
      "Alex",
      "Alexandre",
    );
    expect(JSON.parse(r.details)[0].nom).toBe("Alexandre");
    expect(r.gagnant).toBe("Alexandre");
  });
});

describe("arbitrerPhotos", () => {
  it("sans fusion, la photo suit le nom", () => {
    expect(arbitrerPhotos(false, "a.jpg", null)).toEqual({ retenue: "a.jpg", orpheline: null });
  });

  it("en fusion, le joueur d'arrivée garde la sienne et l'autre devient orpheline", () => {
    expect(arbitrerPhotos(true, "a.jpg", "b.jpg")).toEqual({
      retenue: "b.jpg",
      orpheline: "a.jpg",
    });
  });

  it("en fusion, un joueur d'arrivée sans photo hérite de celle de l'absorbé", () => {
    expect(arbitrerPhotos(true, "a.jpg", null)).toEqual({ retenue: "a.jpg", orpheline: null });
  });

  it("n'orpheline jamais une photo encore utilisée", () => {
    expect(arbitrerPhotos(true, "a.jpg", "a.jpg")).toEqual({ retenue: "a.jpg", orpheline: null });
  });

  it("ne rend rien à effacer quand personne n'avait de photo", () => {
    expect(arbitrerPhotos(true, null, null)).toEqual({ retenue: null, orpheline: null });
  });
});
