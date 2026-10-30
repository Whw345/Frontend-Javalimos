import { describe, expect, it } from "vitest";
import { decisionResultSchema } from "./schema";

const validDecision = {
  schemaVersion: "1.0",
  source: {
    documentId: "bioquimica-semana-03",
    topic: "Fotosíntesis",
    section: "Fase luminosa",
  },
  decision: {
    template: "multiple_choice",
    difficulty: 3,
    cognitiveSkill: "aplicar",
    confidence: 0.91,
    reason: "El contenido permite evaluar relaciones causa-efecto.",
  },
};

describe("decisionResultSchema", () => {
  it("accepts a valid decision", () => {
    expect(decisionResultSchema.safeParse(validDecision).success).toBe(true);
  });

  it("rejects an ordinal encoding for the template", () => {
    const result = decisionResultSchema.safeParse({
      ...validDecision,
      decision: { ...validDecision.decision, template: 1 },
    });

    expect(result.success).toBe(false);
  });

  it("rejects a difficulty outside the 1 to 3 range", () => {
    const result = decisionResultSchema.safeParse({
      ...validDecision,
      decision: { ...validDecision.decision, difficulty: 4 },
    });

    expect(result.success).toBe(false);
  });
});
