import { describe, expect, it } from "vitest";
import { buildReview, lineNumber } from "./logic";
import type { EncuentraErrorPayload, EncuentraErrorSolution } from "./schema";

const payload: EncuentraErrorPayload = {
  monospace: false,
  lines: [
    { id: "l-1", text: "Profase: la cromatina se condensa." },
    { id: "l-2", text: "Metafase: las cromátidas se separan hacia los polos." },
    { id: "l-3", text: "Anafase: las cromátidas se separan hacia los polos." },
  ],
};
const solution: EncuentraErrorSolution = {
  lineId: "l-2",
  correctText: "Metafase: los cromosomas se alinean en el plano ecuatorial.",
  explanation: "En la metafase se alinean; se separan en la anafase.",
};

describe("encuentra el error", () => {
  it("lineNumber cuenta desde 1 y devuelve null si no existe", () => {
    expect(lineNumber(payload, "l-3")).toBe(3);
    expect(lineNumber(payload, null)).toBeNull();
  });

  it("revisión con acierto", () => {
    expect(buildReview(payload, { lineId: "l-2" }, solution)).toMatchObject({
      isCorrect: true,
      wrongLine: 2,
    });
  });

  it("revisión con error y sin respuesta", () => {
    expect(buildReview(payload, { lineId: "l-3" }, solution)).toMatchObject({
      isCorrect: false,
      chosenLine: 3,
    });
    expect(buildReview(payload, null, solution)).toMatchObject({ isCorrect: false, chosenLine: null });
  });
});
