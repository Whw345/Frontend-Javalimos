import type { Difficulty } from "../types";
import type { HuecoAnswer, HuecoPayload, HuecoSolution } from "./schema";

export const HUECO_LEVELS: Record<Difficulty, { options: number; seconds: number }> = {
  1: { options: 3, seconds: 20 },
  2: { options: 3, seconds: 15 },
  3: { options: 4, seconds: 12 },
};

export function optionText(payload: HuecoPayload, optionId: string | null | undefined): string | null {
  return payload.options.find((option) => option.id === optionId)?.text ?? null;
}

/** Oración completa con la opción indicada en el hueco. */
export function fillSentence(payload: HuecoPayload, optionId: string | null): string {
  return `${payload.before}${optionText(payload, optionId) ?? "____"}${payload.after}`;
}

export interface HuecoReview {
  correctText: string;
  chosenText: string | null;
  fullSentence: string;
  isCorrect: boolean;
}

export function buildReview(
  payload: HuecoPayload,
  answer: HuecoAnswer | null,
  solution: HuecoSolution,
): HuecoReview {
  const chosenId = answer?.optionId ?? null;
  return {
    correctText: optionText(payload, solution.optionId) ?? "",
    chosenText: optionText(payload, chosenId),
    fullSentence: fillSentence(payload, solution.optionId),
    isCorrect: chosenId === solution.optionId,
  };
}
