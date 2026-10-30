import { describe, expect, it } from "vitest";
import { decisionResultSchema } from "./schema";

const validDecision = {
  schemaVersion: "1.0",
  topicId: "bioquimica-semana-03",
  recommendations: [
    { rank: 1, template: "multiple_choice", difficulty: 2, score: 0.91, confidenceLevel: "high", reason: "Evalúa relaciones." },
    { rank: 2, template: "matching", difficulty: 1, score: 0.8, confidenceLevel: "medium", reason: "Relaciona conceptos." },
    { rank: 3, template: "fill_blank", difficulty: 1, score: 0.7, confidenceLevel: "medium", reason: "Evalúa términos." },
  ],
};

describe("decisionResultSchema", () => {
  it("accepts three valid recommendations", () => {
    expect(decisionResultSchema.safeParse(validDecision).success).toBe(true);
  });

  it("rejects an ordinal encoding for a template", () => {
    const result = decisionResultSchema.safeParse({
      ...validDecision,
      recommendations: [
        { ...validDecision.recommendations[0], template: 1 },
        ...validDecision.recommendations.slice(1),
      ],
    });

    expect(result.success).toBe(false);
  });

  it("rejects a repeated template", () => {
    const result = decisionResultSchema.safeParse({
      ...validDecision,
      recommendations: validDecision.recommendations.map((recommendation) => ({
        ...recommendation,
        template: "matching",
      })),
    });

    expect(result.success).toBe(false);
  });
});
