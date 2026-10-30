import { describe, expect, it } from "vitest";
import { buildReview, countCorrect, createAnswer, isAnswerComplete, recordChoice } from "./logic";
import type { CualMayorPayload, CualMayorSolution } from "./schema";

const payload: CualMayorPayload = {
  secondsPerRound: 8,
  rounds: [
    { id: "r-1", question: "¿Cuál dura más?", left: { label: "Fase S" }, right: { label: "Fase G2" } },
    {
      id: "r-2",
      question: "¿Cuál tiene más cromosomas?",
      left: { label: "Gameto" },
      right: { label: "Somática" },
    },
  ],
};
const solution: CualMayorSolution = [
  { roundId: "r-1", choice: "left", leftValue: "8 h", rightValue: "4 h" },
  { roundId: "r-2", choice: "right", leftValue: "23", rightValue: "46" },
];

describe("¿Cuál es mayor?", () => {
  it("registra una elección por ronda, sin cambiarla", () => {
    const once = recordChoice(createAnswer(payload), "r-1", "left");
    expect(once.responses[0]?.choice).toBe("left");
    expect(recordChoice(once, "r-1", "right")).toBe(once);
    expect(isAnswerComplete(once)).toBe(false);
    expect(isAnswerComplete(recordChoice(once, "r-2", "left"))).toBe(true);
  });

  it("revisión con acierto y ronda sin respuesta", () => {
    const answer = recordChoice(createAnswer(payload), "r-1", "left");
    const review = buildReview(payload, answer, solution);
    expect(review.map((item) => item.isCorrect)).toEqual([true, false]);
    expect(review[1]?.chosen).toBeNull();
    expect(countCorrect(review)).toBe(1);
  });
});
