import type { Difficulty } from "../types";
import type { OrdenaAnswer, OrdenaPayload, OrdenaSolution, OrdenaStep } from "./schema";

export const ORDENA_LEVELS: Record<Difficulty, { steps: number; seconds: number }> = {
  1: { steps: 4, seconds: 45 },
  2: { steps: 5, seconds: 50 },
  3: { steps: 6, seconds: 55 },
};

export function initialOrder(payload: OrdenaPayload): string[] {
  return payload.steps.map((step) => step.id);
}

/** Mueve el elemento de `from` a `to`. Inmutable; ignora índices fuera de rango. */
export function moveStep(order: string[], from: number, to: number): string[] {
  if (from === to || from < 0 || to < 0 || from >= order.length || to >= order.length) return order;
  const next = [...order];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved!);
  return next;
}

export interface OrdenaReviewItem {
  step: OrdenaStep;
  /** Posición correcta (1…n). */
  position: number;
  /** Posición donde la dejó el estudiante (1…n), o null si no estaba. */
  chosenPosition: number | null;
  isCorrect: boolean;
}

/** Revisión en el orden correcto, indicando dónde quedó cada paso. */
export function buildReview(
  payload: OrdenaPayload,
  answer: OrdenaAnswer | null,
  solution: OrdenaSolution,
): OrdenaReviewItem[] {
  return solution.order.flatMap((stepId, index) => {
    const step = payload.steps.find((candidate) => candidate.id === stepId);
    if (!step) return [];
    const chosenIndex = answer?.order.indexOf(stepId) ?? -1;
    return [
      {
        step,
        position: index + 1,
        chosenPosition: chosenIndex === -1 ? null : chosenIndex + 1,
        isCorrect: chosenIndex === index,
      },
    ];
  });
}

export function countCorrect(items: OrdenaReviewItem[]): number {
  return items.filter((item) => item.isCorrect).length;
}
