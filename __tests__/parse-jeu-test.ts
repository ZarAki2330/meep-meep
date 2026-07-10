import {
  categoriesVersTexte,
  extensionsInconnues,
  extensionsVersTexte,
  listeOuRien,
  parserCategories,
  parserExtensions,
  parserRoles,
  rolesVersTexte,
} from "@/lib/parse-jeu";

describe("parserCategories", () => {
  it("lit une case simple et une case avec aide", () => {
    expect(parserCategories("Chance\nFull | 25")).toEqual([
      { cle: "c0", label: "Chance", aide: undefined, section: undefined },
      { cle: "c1", label: "Full", aide: "25", section: undefined },
    ]);
  });

  it("ouvre une section avec #", () => {
    const cats = parserCategories("# Partie haute\nTotal des 1\n# Partie basse\nYams | 50");
    expect(cats.map((c) => c.section)).toEqual(["Partie haute", "Partie basse"]);
  });

  it("ignore les lignes vides et les espaces", () => {
    expect(parserCategories("\n   Chance   \n\n")).toEqual([
      { cle: "c0", label: "Chance", aide: undefined, section: undefined },
    ]);
  });

  it("donne des clés uniques, même à des cases homonymes", () => {
    const cats = parserCategories("Chance\nChance");
    expect(new Set(cats.map((c) => c.cle)).size).toBe(2);
  });

  it("survit à un texte vide", () => {
    expect(parserCategories("")).toEqual([]);
  });

  it("fait l'aller-retour sans perte", () => {
    const texte = "# Partie haute\nTotal des 1\n# Partie basse\nFull | 25";
    expect(categoriesVersTexte(parserCategories(texte))).toBe(texte);
  });
});

describe("parserExtensions", () => {
  it("lit une extension par ligne", () => {
    expect(parserExtensions("Alpha\nBêta")).toEqual(["Alpha", "Bêta"]);
  });

  it("écarte les doublons sans distinguer la casse, et garde le premier écrit", () => {
    expect(parserExtensions("Alpha\nALPHA\nalpha")).toEqual(["Alpha"]);
  });

  it("nettoie les espaces", () => {
    expect(parserExtensions("  Alpha  \n\n")).toEqual(["Alpha"]);
  });

  it("fait l'aller-retour", () => {
    expect(extensionsVersTexte(parserExtensions("Alpha\nBêta"))).toBe("Alpha\nBêta");
  });
});

describe("parserRoles", () => {
  it("lit les quatre champs", () => {
    expect(parserRoles("Hadès | Hercule | 3 Titans | Mauvais jusqu'à l'os")).toEqual([
      { nom: "Hadès", origine: "Hercule", objectif: "3 Titans", extension: "Mauvais jusqu'à l'os" },
    ]);
  });

  it("n'exige que le nom", () => {
    expect(parserRoles("Sans rien")).toEqual([
      { nom: "Sans rien", origine: undefined, objectif: undefined, extension: undefined },
    ]);
  });

  it("accepte un champ vide au milieu", () => {
    expect(parserRoles("Nom |  | Gagner")).toEqual([
      { nom: "Nom", origine: undefined, objectif: "Gagner", extension: undefined },
    ]);
  });

  it("ignore une ligne sans nom", () => {
    expect(parserRoles(" | Hercule")).toEqual([]);
  });

  it("fait l'aller-retour, en élaguant les champs vides de la fin", () => {
    const roles = parserRoles("Médecin | Soigne");
    expect(rolesVersTexte(roles)).toBe("Médecin | Soigne");
    expect(rolesVersTexte(parserRoles("Nom |  | Gagner"))).toBe("Nom |  | Gagner");
  });
});

describe("extensionsInconnues", () => {
  it("signale une extension qu'aucune ligne ne déclare", () => {
    const roles = parserRoles("Hadès | Hercule | 3 Titans | Fantôme");
    expect(extensionsInconnues(roles, ["Alpha"])).toEqual(["Fantôme"]);
  });

  it("ne distingue pas la casse", () => {
    const roles = parserRoles("Hadès |  |  | ALPHA");
    expect(extensionsInconnues(roles, ["alpha"])).toEqual([]);
  });

  it("ne signale rien pour un personnage sans extension", () => {
    expect(extensionsInconnues(parserRoles("Médecin"), [])).toEqual([]);
  });

  it("ne signale une même extension qu'une fois", () => {
    const roles = parserRoles("A |  |  | Fantôme\nB |  |  | Fantôme");
    expect(extensionsInconnues(roles, [])).toEqual(["Fantôme"]);
  });
});

describe("listeOuRien", () => {
  it("rend undefined pour une liste vide", () => {
    expect(listeOuRien([])).toBeUndefined();
  });

  it("rend la liste telle quelle sinon", () => {
    expect(listeOuRien([1])).toEqual([1]);
  });
});
