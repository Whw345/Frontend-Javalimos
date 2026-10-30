import { describe, expect, it, vi } from "vitest";
import { decideForTopic } from "./decide";

const input = {
  topicId: "bio-101-week-03",
  topicName: "Fase luminosa",
  markdown: "## Fotosíntesis\nLa fase luminosa produce ATP y NADPH.",
};

const recommendations = [
  { rank: 1, template: "multiple_choice", difficulty: 2, score: 0.88, confidenceLevel: "high", reason: "Evalúa una relación conceptual." },
  { rank: 2, template: "matching", difficulty: 1, score: 0.8, confidenceLevel: "medium", reason: "Relaciona conceptos." },
  { rank: 3, template: "fill_blank", difficulty: 1, score: 0.7, confidenceLevel: "medium", reason: "Contiene términos explícitos." },
];

describe("decideForTopic", () => {
  it("returns three recommendations for the received topic", async () => {
    const complete = vi.fn().mockResolvedValue({ recommendations });
    const result = await decideForTopic(input, { complete });

    expect(result.topicId).toBe(input.topicId);
    expect(result.recommendations).toHaveLength(3);
    expect(result.recommendations[0]?.template).toBe("multiple_choice");
    expect(complete).toHaveBeenCalledOnce();
  });

  it("rejects an output with fewer than three recommendations", async () => {
    const complete = vi.fn().mockResolvedValue({ recommendations: [recommendations[0]] });

    await expect(decideForTopic(input, { complete })).rejects.toThrow();
  });
});
