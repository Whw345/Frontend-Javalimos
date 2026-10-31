import type { Difficulty } from "../types";
import type { QuienSoyAnswer, QuienSoyPayload, QuienSoySolution } from "./schema";

export const QUIEN_SOY_LEVELS: Record<Difficulty, { secondsPerClue: number }> = {
  1: { secondsPerClue: 8 },
  2: { secondsPerClue: 6 },
  3: { secondsPerClue: 5 },
};

/** Pistas visibles en la ronda actual (al menos una). */
export function visibleClues(payload: QuienSoyPayload, round: number): string[] {
  return payload.clues.slice(0, Math.min(round + 1, payload.clues.length));
}

export function hasAnswer(answer: QuienSoyAnswer): boolean {
  return answer.optionId !== null;
}

export interface QuienSoyReview {
  answerText: string;
  given: string | null;
  isCorrect: boolean;
  cluesSeen: number;
}

export function buildReview(
  payload: QuienSoyPayload,
  answer: QuienSoyAnswer | null,
  solution: QuienSoySolution,
): QuienSoyReview {
  const given = payload.options.find((option) => option.id === answer?.optionId)?.text ?? null;
  return {
    answerText: solution.answer,
    given,
    isCorrect: answer?.optionId === solution.optionId,
    cluesSeen: answer?.cluesSeen ?? 0,
  };
}
