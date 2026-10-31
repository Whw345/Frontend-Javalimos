import { describe, expect, it, vi } from "vitest";
import { catalogGames } from "@/lib/games/catalog";
import { decisionAnswers } from "@/test/decisions";
import { decideGames } from "./gameDecision";

const input = { topicName: "Fotosíntesis", markdown: "La fase luminosa produce ATP y NADPH." };

describe("decideGames", () => {
  it("asks every game in one call, with the material in the system prompt", async () => {
    const ask = vi.fn(async () => decisionAnswers("parejas", "hueco"));
    const decisions = await decideGames(input, { ask });
    expect(ask).toHaveBeenCalledOnce();
    const [system, question] = ask.mock.calls[0] as unknown as [string, string];
    expect(system).toContain(input.markdown);
    const { questions } = JSON.parse(question);
    expect(Object.keys(questions)).toEqual(catalogGames.map(({ id }) => id));
    expect(questions.hueco).toMatchObject({
      type: "boolean",
      instructions: "¿Es este juego bueno para evaluar este tema?",
      description: catalogGames.find(({ id }) => id === "hueco")!.description,
    });
    expect(decisions).toHaveLength(catalogGames.length);
    expect(decisions.filter((decision) => decision.suitable).map(({ id }) => id)).toEqual([
      "parejas",
      "hueco",
    ]);
  });

  it("rejects a missing game or a decision that is not a boolean", async () => {
    const { answers } = decisionAnswers();
    const incomplete = Object.fromEntries(Object.entries(answers).filter(([id]) => id !== "hueco"));
    await expect(decideGames(input, { ask: async () => ({ answers: incomplete }) })).rejects.toThrow();
    await expect(
      decideGames(input, {
        ask: async () => ({ answers: { ...answers, hueco: { suitable: "si", reason: "x" } } }),
      }),
    ).rejects.toThrow();
  });
});
