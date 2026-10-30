import type { Difficulty } from "../types";
import type { DeslizaAnswer, DeslizaPayload, DeslizaSolution, DeslizaStatement } from "./schema";

/** §12: dificultad progresiva. El backend arma el reto; el frontend usa lo que llega en el payload. */
export const DESLIZA_LEVELS: Record<Difficulty, { cards: number; secondsPerCard: number }> = {
  1: { cards: 6, secondsPerCard: 8 },
  2: { cards: 8, secondsPerCard: 6 },
  3: { cards: 8, secondsPerCard: 4 },
};

/** Superar el 35 % del ancho de la tarjeta confirma la respuesta (§12, notas). */
export const SWIPE_CONFIRM_RATIO = 0.35;
/** Un gesto rápido (flick) también confirma si ya recorrió una distancia mínima. */
export const SWIPE_FLICK_VELOCITY = 800;
export const SWIPE_FLICK_MIN_RATIO = 0.12;
export const MAX_TILT_DEG = 12;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Traduce el final de un arrastre a una respuesta.
 * @returns true (derecha = verdadero), false (izquierda = falso) o null si vuelve al centro.
 */
export function resolveSwipe(offsetX: number, cardWidth: number, velocityX = 0): boolean | null {
  if (cardWidth <= 0) return null;
  const ratio = offsetX / cardWidth;

  if (Math.abs(ratio) >= SWIPE_CONFIRM_RATIO) return ratio > 0;

  const isFlick =
    Math.abs(velocityX) >= SWIPE_FLICK_VELOCITY &&
    Math.abs(ratio) >= SWIPE_FLICK_MIN_RATIO &&
    Math.sign(velocityX) === Math.sign(ratio);
  return isFlick ? ratio > 0 : null;
}

/** Inclinación de la tarjeta según el arrastre: hasta ±12° al recorrer todo su ancho. */
export function tiltForOffset(offsetX: number, cardWidth: number): number {
  if (cardWidth <= 0) return 0;
  return clamp((offsetX / cardWidth) * MAX_TILT_DEG, -MAX_TILT_DEG, MAX_TILT_DEG);
}

/** Avance hacia la confirmación, de −1 (falso) a 1 (verdadero). Controla las etiquetas. */
export function swipeProgress(offsetX: number, cardWidth: number): number {
  if (cardWidth <= 0) return 0;
  return clamp(offsetX / (cardWidth * SWIPE_CONFIRM_RATIO), -1, 1);
}

export function createAnswer(payload: DeslizaPayload): DeslizaAnswer {
  return {
    responses: payload.statements.map((statement) => ({
      statementId: statement.id,
      verdict: null,
      elapsedMs: null,
    })),
  };
}

/** Registra la respuesta de una carta. Es inmutable e ignora cartas ya respondidas. */
export function recordVerdict(
  answer: DeslizaAnswer,
  statementId: string,
  verdict: boolean,
  elapsedMs: number,
): DeslizaAnswer {
  const target = answer.responses.find((response) => response.statementId === statementId);
  if (!target || target.verdict !== null) return answer;

  return {
    responses: answer.responses.map((response) =>
      response.statementId === statementId
        ? { ...response, verdict, elapsedMs: Math.max(0, Math.round(elapsedMs)) }
        : response,
    ),
  };
}

export function countAnswered(answer: DeslizaAnswer): number {
  return answer.responses.filter((response) => response.verdict !== null).length;
}

export function isAnswerComplete(answer: DeslizaAnswer): boolean {
  return answer.responses.length > 0 && countAnswered(answer) === answer.responses.length;
}

export interface ReviewItem {
  statement: DeslizaStatement;
  verdict: boolean | null;
  isTrue: boolean;
  explanation: string;
  isCorrect: boolean;
}

/** Cruza payload, respuesta y solución para la revisión posterior al reto. */
export function buildReview(
  payload: DeslizaPayload,
  answer: DeslizaAnswer | null,
  solution: DeslizaSolution,
): ReviewItem[] {
  return payload.statements.flatMap((statement) => {
    const expected = solution.find((item) => item.statementId === statement.id);
    if (!expected) return [];
    const verdict = answer?.responses.find((r) => r.statementId === statement.id)?.verdict ?? null;
    return [
      {
        statement,
        verdict,
        isTrue: expected.isTrue,
        explanation: expected.explanation,
        isCorrect: verdict === expected.isTrue,
      },
    ];
  });
}

export function countCorrect(items: ReviewItem[]): number {
  return items.filter((item) => item.isCorrect).length;
}
