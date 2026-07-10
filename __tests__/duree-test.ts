import { formatChrono, formatDuree } from "@/lib/duree";

describe("formatChrono", () => {
  it("écrit les minutes et les secondes", () => {
    expect(formatChrono(0)).toBe("0:00");
    expect(formatChrono(5)).toBe("0:05");
    expect(formatChrono(65)).toBe("1:05");
    expect(formatChrono(725)).toBe("12:05");
  });

  it("ajoute les heures au-delà de soixante minutes", () => {
    expect(formatChrono(3600)).toBe("1:00:00");
    expect(formatChrono(3872)).toBe("1:04:32");
  });

  it("tronque les fractions de seconde", () => {
    expect(formatChrono(59.9)).toBe("0:59");
  });

  it("ramène un temps négatif à zéro", () => {
    expect(formatChrono(-10)).toBe("0:00");
  });
});

describe("formatDuree", () => {
  it("écrit les minutes", () => {
    expect(formatDuree(2700)).toBe("45 min");
  });

  it("arrondit à la minute la plus proche", () => {
    expect(formatDuree(89)).toBe("1 min");
    expect(formatDuree(91)).toBe("2 min");
  });

  it("écrit les heures", () => {
    expect(formatDuree(3600)).toBe("1 h");
    expect(formatDuree(4320)).toBe("1 h 12");
  });

  it("garde deux chiffres aux minutes d'une heure pleine", () => {
    expect(formatDuree(3900)).toBe("1 h 05");
  });

  it("rend un tiret quand il n'y a rien à dire", () => {
    expect(formatDuree(0)).toBe("—");
    expect(formatDuree(null)).toBe("—");
    expect(formatDuree(undefined)).toBe("—");
    expect(formatDuree(-5)).toBe("—");
  });
});
