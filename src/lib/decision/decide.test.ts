import { describe, expect, it, vi } from "vitest";
import { decideTemplate } from "./decide";

const input = {
  markdown: "## Fotosíntesis\nLa fase luminosa produce ATP y NADPH.",
  source: {
    documentId: "bio-101-week-03",
    topic: "Fotosíntesis",
    section: "Fase luminosa",
  },
};

describe("decideTemplate", () => {
  it("adds source metadata to a valid model decision", async () => {
    const complete = vi.fn().mockResolvedValue({
      template: "multiple_choice",
      difficulty: 2,
      cognitiveSkill: "comprender",
      confidence: 0.88,
      reason: "El material presenta una relación conceptual directa.",
    });

    const result = await decideTemplate(input, { complete });

    expect(result.source).toEqual(input.source);
    expect(result.decision.template).toBe("multiple_choice");
    expect(complete).toHaveBeenCalledOnce();
  });

  it("rejects an invalid model decision", async () => {
    const complete = vi.fn().mockResolvedValue({
      template: 1,
      difficulty: 2,
      cognitiveSkill: "comprender",
      confidence: 0.88,
      reason: "Decisión inválida.",
    });

    await expect(decideTemplate(input, { complete })).rejects.toThrow();
  });
});
