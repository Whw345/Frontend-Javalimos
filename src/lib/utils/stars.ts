/** Fracción del tiempo total por debajo de la cual un acierto cuenta como "rápido". */
export const FAST_ANSWER_RATIO = 0.5;

interface StarInput {
  correct: boolean;
  points: number;
  hintUsed: boolean;
  elapsedMs: number;
  totalMs: number;
}

/**
 * §13 (ajustable): 3 = correcto rápido · 2 = correcto · 1 = correcto con pista o puntaje parcial
 * · 0 = sin puntos.
 */
export function computeStars({ correct, points, hintUsed, elapsedMs, totalMs }: StarInput): 0 | 1 | 2 | 3 {
  if (!correct) return points > 0 ? 1 : 0;
  if (hintUsed) return 1;
  return totalMs > 0 && elapsedMs <= totalMs * FAST_ANSWER_RATIO ? 3 : 2;
}
