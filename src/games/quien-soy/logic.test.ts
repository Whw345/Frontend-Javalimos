import { describe, expect, it } from "vitest";
import { buildReview, hasAnswer, isTextMatch, normalize, visibleClues } from "./logic";
import type { QuienSoyPayload, QuienSoySolution } from "./schema";

const payload: QuienSoyPayload = {
  clues: ["Pista vaga", "Pista media", "Pista clara"],
  secondsPerClue: 6,
  mode: "options",
  options: [
    { id: "o-1", text: "Mitosis" },
    { id: "o-2", text: "Meiosis" },
  ],
};
const solution: QuienSoySolution = { answer: "Meiosis", optionId: "o-2", explanation: "Forma gametos." };

describe("¿Quién soy?", () => {
  it("revela una pista más por ronda, sin pasarse del total", () => {
    expect(visibleClues(payload, 0)).toEqual(["Pista vaga"]);
    expect(visibleClues(payload, 1)).toHaveLength(2);
    expect(visibleClues(payload, 9)).toHaveLength(3);
  });

  it("normaliza tildes, mayúsculas y espacios", () => {
    expect(normalize("  Citocinésis   celular ")).toBe("citocinesis celular");
    expect(isTextMatch("MEIÓSIS", "Meiosis")).toBe(true);
    expect(isTextMatch("   ", "Meiosis")).toBe(false);
    expect(isTextMatch(null, "Meiosis")).toBe(false);
  });

  it("hasAnswer acepta opción o texto no vacío", () => {
    expect(hasAnswer({ optionId: null, text: " ", cluesSeen: 1 })).toBe(false);
    expect(hasAnswer({ optionId: "o-1", text: null, cluesSeen: 1 })).toBe(true);
    expect(hasAnswer({ optionId: null, text: "meiosis", cluesSeen: 1 })).toBe(true);
  });

  it("revisión con opciones y con texto libre", () => {
    expect(buildReview(payload, { optionId: "o-2", text: null, cluesSeen: 2 }, solution)).toMatchObject({
      isCorrect: true,
      cluesSeen: 2,
    });
    const textPayload = { ...payload, mode: "text" as const, options: [] };
    expect(
      buildReview(
        textPayload,
        { optionId: null, text: "meiosis ", cluesSeen: 3 },
        { ...solution, optionId: null },
      ),
    ).toMatchObject({ isCorrect: true, given: "meiosis" });
  });
});
