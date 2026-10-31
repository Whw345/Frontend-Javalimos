import type { Difficulty } from "../types";
import type { CualMayorAnswer, CualMayorPayload, CualMayorRound, CualMayorSolution, Side } from "./schema";

export const CUAL_MAYOR_LEVELS: Record<Difficulty, { rounds: number; secondsPerRound: number }> = {
  1: { rounds: 5, secondsPerRound: 8 },
  2: { rounds: 6, secondsPerRound: 6 },
  3: { rounds: 8, secondsPerRound: 5 },
};

export function createAnswer(payload: CualMayorPayload): CualMayorAnswer {
  return { responses: payload.rounds.map((round) => ({ roundId: round.id, choice: null })) };
}

/** Registra la elección de una ronda. Inmutable; ignora rondas ya respondidas o desconocidas. */
export function recordChoice(answer: CualMayorAnswer, roundId: string, choice: Side): CualMayorAnswer {
  const target = answer.responses.find((response) => response.roundId === roundId);
  if (!target || target.choice !== null) return answer;
  return {
    responses: answer.responses.map((response) =>
      response.roundId === roundId ? { ...response, choice } : response,
    ),
  };
}

export function isAnswerComplete(answer: CualMayorAnswer): boolean {
  return answer.responses.every((response) => response.choice !== null);
}

export interface CualMayorReviewItem {
  round: CualMayorRound;
  chosen: Side | null;
  expected: Side;
  leftValue: string;
  rightValue: string;
  isCorrect: boolean;
}

export function buildReview(
  payload: CualMayorPayload,
  answer: CualMayorAnswer | null,
  solution: CualMayorSolution,
): CualMayorReviewItem[] {
  return payload.rounds.flatMap((round) => {
    const expected = solution.find((item) => item.roundId === round.id);
    if (!expected) return [];
    const chosen = answer?.responses.find((response) => response.roundId === round.id)?.choice ?? null;
    return [
      {
        round,
        chosen,
        expected: expected.choice,
        leftValue: expected.leftValue,
        rightValue: expected.rightValue,
        isCorrect: chosen === expected.choice,
      },
    ];
  });
}

export function countCorrect(items: CualMayorReviewItem[]): number {
  return items.filter((item) => item.isCorrect).length;
}
