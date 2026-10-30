import type { Difficulty } from "../types";
import type { IntrusoAnswer, IntrusoPayload, IntrusoSolution } from "./schema";

/** Nivel 3 usa un intruso cercano (de la misma semana), no de otra unidad. */
export const INTRUSO_LEVELS: Record<Difficulty, { seconds: number; closeIntruder: boolean }> = {
  1: { seconds: 20, closeIntruder: false },
  2: { seconds: 15, closeIntruder: false },
  3: { seconds: 12, closeIntruder: true },
};

export interface IntrusoReview {
  intruderText: string;
  chosenText: string | null;
  isCorrect: boolean;
}

export function buildReview(
  payload: IntrusoPayload,
  answer: IntrusoAnswer | null,
  solution: IntrusoSolution,
): IntrusoReview {
  const textOf = (id: string | null | undefined) =>
    payload.items.find((item) => item.id === id)?.text ?? null;
  return {
    intruderText: textOf(solution.itemId) ?? "",
    chosenText: textOf(answer?.itemId),
    isCorrect: answer?.itemId === solution.itemId,
  };
}
