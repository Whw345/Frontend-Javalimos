import { describe, expect, it } from "vitest";
import { buildReview, hasAnswer, visibleClues } from "./logic";
import type { QuienSoyPayload, QuienSoySolution } from "./schema";

const payload: QuienSoyPayload = {
  clues: ["Pista vaga", "Pista media", "Pista clara"],
  secondsPerClue: 6,
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

  it("hasAnswer exige una opción", () => {
    expect(hasAnswer({ optionId: null, cluesSeen: 1 })).toBe(false);
    expect(hasAnswer({ optionId: "o-1", cluesSeen: 1 })).toBe(true);
  });

  it("revisión de la opción elegida", () => {
    expect(buildReview(payload, { optionId: "o-2", cluesSeen: 2 }, solution)).toMatchObject({
      isCorrect: true,
      given: "Meiosis",
      cluesSeen: 2,
    });
    expect(buildReview(payload, { optionId: "o-1", cluesSeen: 3 }, solution)).toMatchObject({
      isCorrect: false,
      given: "Mitosis",
    });
    expect(buildReview(payload, null, solution)).toMatchObject({ isCorrect: false, given: null });
  });
});
