import { describe, expect, it } from "vitest";
import { buildReview } from "./logic";
import type { IntrusoPayload, IntrusoSolution } from "./schema";

const payload: IntrusoPayload = {
  items: [
    { id: "i-1", text: "Mitosis" },
    { id: "i-2", text: "Crossing-over" },
    { id: "i-3", text: "Fotosíntesis" },
    { id: "i-4", text: "Gameto" },
  ],
};
const solution: IntrusoSolution = { itemId: "i-3", explanation: "Es de la semana 3." };

describe("El intruso", () => {
  it("acierto", () => {
    expect(buildReview(payload, { itemId: "i-3" }, solution)).toEqual({
      intruderText: "Fotosíntesis",
      chosenText: "Fotosíntesis",
      isCorrect: true,
    });
  });

  it("error y sin respuesta", () => {
    expect(buildReview(payload, { itemId: "i-1" }, solution)).toMatchObject({
      isCorrect: false,
      chosenText: "Mitosis",
    });
    expect(buildReview(payload, null, solution)).toMatchObject({ isCorrect: false, chosenText: null });
  });
});
