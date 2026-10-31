import type { Difficulty } from "../types";
import type { QuienSoyAnswer, QuienSoyPayload, QuienSoySolution } from "./schema";

export const QUIEN_SOY_LEVELS: Record<Difficulty, { mode: "options" | "text"; secondsPerClue: number }> = {
  1: { mode: "options", secondsPerClue: 8 },
  2: { mode: "options", secondsPerClue: 6 },
  3: { mode: "text", secondsPerClue: 6 },
};

/** Pistas visibles en la ronda actual (al menos una). */
export function visibleClues(payload: QuienSoyPayload, round: number): string[] {
  return payload.clues.slice(0, Math.min(round + 1, payload.clues.length));
}

/** Minúsculas, sin tildes ni espacios extra: "  Crossing-Over " → "crossing-over". */
export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function isTextMatch(text: string | null, expected: string): boolean {
  return text !== null && normalize(text) !== "" && normalize(text) === normalize(expected);
}

export function hasAnswer(answer: QuienSoyAnswer): boolean {
  return answer.optionId !== null || (answer.text !== null && answer.text.trim() !== "");
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
  const optionText = payload.options.find((option) => option.id === answer?.optionId)?.text ?? null;
  const given = payload.mode === "options" ? optionText : answer?.text?.trim() || null;
  const isCorrect =
    payload.mode === "options"
      ? answer?.optionId != null && answer.optionId === solution.optionId
      : isTextMatch(answer?.text ?? null, solution.answer);
  return { answerText: solution.answer, given, isCorrect, cluesSeen: answer?.cluesSeen ?? 0 };
}
