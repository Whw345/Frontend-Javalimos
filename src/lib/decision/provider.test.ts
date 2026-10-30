import { describe, expect, it, vi } from "vitest";
import { createGenericHttpDecisionModel } from "./provider";

describe("createGenericHttpDecisionModel", () => {
  it("sends the prompt using the generic JSON protocol", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          recommendations: [
            { rank: 1, template: "matching", difficulty: 2, score: 0.8, confidenceLevel: "high", reason: "Relaciona conceptos." },
            { rank: 2, template: "ordering", difficulty: 1, score: 0.7, confidenceLevel: "medium", reason: "Presenta una secuencia." },
            { rank: 3, template: "fill_blank", difficulty: 1, score: 0.6, confidenceLevel: "medium", reason: "Contiene términos clave." },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const model = createGenericHttpDecisionModel({
      url: "https://llm.example.test/decide",
      apiKey: "secret",
      model: "generic-model",
      fetchImpl,
    });

    const result = await model.complete("Selecciona tres plantillas.");
    const request = fetchImpl.mock.calls[0]?.[1] as RequestInit;

    expect(result).toHaveProperty("recommendations");
    expect((result as { recommendations: Array<{ template: string }> }).recommendations[0]).toMatchObject({
      template: "matching",
    });
    expect(request.method).toBe("POST");
    expect(request.headers).toEqual({
      "Content-Type": "application/json",
      Authorization: "Bearer secret",
    });
    expect(JSON.parse(String(request.body))).toMatchObject({
      model: "generic-model",
      prompt: "Selecciona tres plantillas.",
      responseFormat: "json",
      schemaVersion: "1.0",
    });
  });
});
