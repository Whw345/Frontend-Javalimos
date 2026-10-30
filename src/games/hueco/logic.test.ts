import { describe, expect, it } from "vitest";
import { buildReview, fillSentence, optionText } from "./logic";
import type { HuecoPayload, HuecoSolution } from "./schema";

const payload: HuecoPayload = {
  before: "La ",
  after: " produce dos células hijas idénticas.",
  options: [
    { id: "o-1", text: "meiosis" },
    { id: "o-2", text: "mitosis" },
    { id: "o-3", text: "citocinesis" },
  ],
};
const solution: HuecoSolution = { optionId: "o-2", explanation: "Así se reparan los tejidos." };

describe("hueco", () => {
  it("completa la oración con la opción o deja el hueco", () => {
    expect(fillSentence(payload, "o-2")).toBe("La mitosis produce dos células hijas idénticas.");
    expect(fillSentence(payload, null)).toBe("La ____ produce dos células hijas idénticas.");
  });

  it("optionText devuelve null para ids desconocidos", () => {
    expect(optionText(payload, "x")).toBeNull();
  });

  it("revisión con acierto, error y sin respuesta", () => {
    expect(buildReview(payload, { optionId: "o-2" }, solution).isCorrect).toBe(true);
    expect(buildReview(payload, { optionId: "o-1" }, solution)).toMatchObject({
      isCorrect: false,
      chosenText: "meiosis",
      correctText: "mitosis",
    });
    expect(buildReview(payload, null, solution).chosenText).toBeNull();
  });
});
