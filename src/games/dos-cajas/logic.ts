import type { Difficulty } from "../types";
import type { Box, DosCajasAnswer, DosCajasCard, DosCajasPayload, DosCajasSolution } from "./schema";

export const DOS_CAJAS_LEVELS: Record<Difficulty, { cards: number; secondsPerCard: number }> = {
  1: { cards: 6, secondsPerCard: 6 },
  2: { cards: 8, secondsPerCard: 5 },
  3: { cards: 10, secondsPerCard: 4 },
};

export const BOXES: readonly Box[] = ["a", "b"];

export function createAnswer(payload: DosCajasPayload): DosCajasAnswer {
  return { responses: payload.cards.map((card) => ({ cardId: card.id, box: null })) };
}

/** Registra la caja elegida. Inmutable; ignora tarjetas ya clasificadas o desconocidas. */
export function recordBox(answer: DosCajasAnswer, cardId: string, box: Box): DosCajasAnswer {
  const target = answer.responses.find((response) => response.cardId === cardId);
  if (!target || target.box !== null) return answer;
  return {
    responses: answer.responses.map((response) =>
      response.cardId === cardId ? { ...response, box } : response,
    ),
  };
}

export function isAnswerComplete(answer: DosCajasAnswer): boolean {
  return answer.responses.every((response) => response.box !== null);
}

export interface DosCajasReviewItem {
  card: DosCajasCard;
  chosen: Box | null;
  expected: Box;
  explanation: string;
  isCorrect: boolean;
}

export function buildReview(
  payload: DosCajasPayload,
  answer: DosCajasAnswer | null,
  solution: DosCajasSolution,
): DosCajasReviewItem[] {
  return payload.cards.flatMap((card) => {
    const expected = solution.find((item) => item.cardId === card.id);
    if (!expected) return [];
    const chosen = answer?.responses.find((response) => response.cardId === card.id)?.box ?? null;
    return [
      {
        card,
        chosen,
        expected: expected.box,
        explanation: expected.explanation,
        isCorrect: chosen === expected.box,
      },
    ];
  });
}

export function countCorrect(items: DosCajasReviewItem[]): number {
  return items.filter((item) => item.isCorrect).length;
}
