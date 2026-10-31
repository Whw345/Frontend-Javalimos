import { z } from "zod";

/**
 * Contrato con el backend (§17). Mientras no exista el OpenAPI de Spring, estos
 * esquemas son la referencia; cuando exista, se reemplazan por los tipos generados
 * con openapi-typescript y se mantienen solo como validación en tiempo de ejecución.
 */

export const gameSlugSchema = z.enum([
  "desliza",
  "parejas",
  "ordena",
  "dos-cajas",
  "hueco",
  "encuentra-error",
  "quien-soy",
  "intruso",
  "cual-mayor",
]);

export const difficultySchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);

export const challengeSessionSchema = z.object({
  sessionId: z.string(),
  /** Propuesto al backend: necesario para volver al curso y leer el progreso. */
  courseId: z.string(),
  game: gameSlugSchema,
  difficulty: difficultySchema,
  week: z.number().int(),
  /** Se valida después con el payloadSchema del juego. Nunca trae la respuesta correcta. */
  payload: z.unknown(),
  hintAvailable: z.boolean(),
  startedAt: z.iso.datetime(),
  deadline: z.iso.datetime(),
  /** Hora del servidor al responder; sirve para medir el desfase de reloj. */
  serverTime: z.iso.datetime(),
});
export type ChallengeSession = z.infer<typeof challengeSessionSchema>;

export const progressTotalsSchema = z.object({
  points: z.number().int(),
  streakDays: z.number().int(),
  weeklyPlayed: z.number().int(),
  weeklyLimit: z.number().int(),
});
export type ProgressTotals = z.infer<typeof progressTotalsSchema>;

export const challengeResultSchema = z.object({
  correct: z.boolean(),
  pointsAwarded: z.number().int().min(0).max(10),
  timedOut: z.boolean(),
  /** Se valida después con el solutionSchema del juego. */
  correctAnswer: z.unknown(),
  explanation: z.string(),
  source: z.object({ documento: z.string(), pagina: z.number().int().optional() }),
  totals: progressTotalsSchema,
});
export type ChallengeResult = z.infer<typeof challengeResultSchema>;

export const hintResponseSchema = z.object({
  hintRevealed: z.literal(true),
  /** Propuesto al backend: dato de la pista cuando el juego lo necesita (p. ej. un par en Parejas). */
  hint: z.unknown().optional(),
});
export type HintResponse = z.infer<typeof hintResponseSchema>;

/** Una casilla del camino. Las de semanas futuras no llegan: solo se cuentan. */
export const pathGameSchema = z.object({
  id: z.string(),
  game: gameSlugSchema,
  difficulty: difficultySchema,
  status: z.enum(["available", "played", "missed"]),
  points: z.number().int().nullable(),
});
export type PathGame = z.infer<typeof pathGameSchema>;

export const studentWeekSchema = z.object({
  weekNumber: z.number().int(),
  state: z.enum(["past", "current", "unlocked", "future"]),
  topic: z.string().nullable(),
  opensAt: z.iso.datetime().nullable(),
  deadline: z.iso.datetime().nullable(),
  hiddenGames: z.number().int(),
  games: z.array(pathGameSchema),
});
export type StudentWeek = z.infer<typeof studentWeekSchema>;

export const studentPathSchema = z.object({
  course: z.object({ name: z.string(), current_week: z.number().int() }),
  weeks: z.array(studentWeekSchema),
});

export const apiErrorSchema = z.object({ code: z.string(), message: z.string() });
export type ApiErrorBody = z.infer<typeof apiErrorSchema>;

export interface CreateChallengeBody {
  challengeId?: string;
  game: z.infer<typeof gameSlugSchema>;
  difficulty: z.infer<typeof difficultySchema>;
}

export interface SubmitAnswerBody {
  answer: unknown;
}
