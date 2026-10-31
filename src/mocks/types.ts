/** Reto armado por el "backend" simulado. La solución nunca sale del mock hasta responder. */
export interface MockChallenge {
  payload: unknown;
  solution: unknown;
  durationMs: number;
  /** Latencia extra al calificar (p. ej. la evaluación con LLM de Explícalo). */
  gradingDelayMs?: number;
  source: { documento: string; pagina?: number };
  grade: (answer: unknown) => { correct: boolean; timedOut: boolean; explanation: string };
  /** Dato de la pista, si el juego revela algo concreto (p. ej. un par correcto). */
  hint?: () => unknown;
}
