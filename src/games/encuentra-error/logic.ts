import type { Difficulty } from "../types";
import type { EncuentraErrorAnswer, EncuentraErrorPayload, EncuentraErrorSolution } from "./schema";

export const ENCUENTRA_ERROR_LEVELS: Record<Difficulty, { lines: number; seconds: number }> = {
  1: { lines: 4, seconds: 40 },
  2: { lines: 5, seconds: 35 },
  3: { lines: 6, seconds: 30 },
};

/** Número de línea (1…n) de un id, o null si no existe. */
export function lineNumber(payload: EncuentraErrorPayload, lineId: string | null | undefined): number | null {
  const index = payload.lines.findIndex((line) => line.id === lineId);
  return index === -1 ? null : index + 1;
}

export interface EncuentraErrorReview {
  wrongLine: number;
  wrongText: string;
  correctText: string;
  chosenLine: number | null;
  isCorrect: boolean;
}

export function buildReview(
  payload: EncuentraErrorPayload,
  answer: EncuentraErrorAnswer | null,
  solution: EncuentraErrorSolution,
): EncuentraErrorReview {
  const wrongLine = lineNumber(payload, solution.lineId) ?? 0;
  return {
    wrongLine,
    wrongText: payload.lines[wrongLine - 1]?.text ?? "",
    correctText: solution.correctText,
    chosenLine: lineNumber(payload, answer?.lineId),
    isCorrect: answer?.lineId === solution.lineId,
  };
}
