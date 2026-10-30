import { describe, expect, it, vi } from "vitest";
import { createGenericHttpDecisionModel } from "./provider";

describe("createGenericHttpDecisionModel", () => {
  it("sends the prompt using the generic JSON protocol", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          decision: {
            template: "matching",
            difficulty: 2,
            cognitiveSkill: "comprender",
            confidence: 0.8,
            reason: "Relaciona conceptos y definiciones.",
          },
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

    const result = await model.complete("Selecciona una plantilla.");
    const request = fetchImpl.mock.calls[0]?.[1] as RequestInit;

    expect(result).toEqual({
      template: "matching",
      difficulty: 2,
      cognitiveSkill: "comprender",
      confidence: 0.8,
      reason: "Relaciona conceptos y definiciones.",
    });
    expect(request.method).toBe("POST");
    expect(request.headers).toEqual({
      "Content-Type": "application/json",
      Authorization: "Bearer secret",
    });
    expect(JSON.parse(String(request.body))).toMatchObject({
      model: "generic-model",
      prompt: "Selecciona una plantilla.",
      responseFormat: "json",
      schemaVersion: "1.0",
    });
  });
});
