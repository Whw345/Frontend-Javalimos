import { z } from "zod";

const itemSchema = z.object({ id: z.string(), text: z.string().min(1).max(240) });

/** Conceptos y definiciones llegan barajados por separado: el orden no revela los pares. */
export const parejasPayloadSchema = z.object({
  concepts: z.array(itemSchema).min(2).max(5),
  definitions: z.array(itemSchema).min(2).max(5),
});

export const pairSchema = z.object({ conceptId: z.string(), definitionId: z.string() });

export const parejasAnswerSchema = z.object({ pairs: z.array(pairSchema) });

/** Llega en `ChallengeResult.correctAnswer`, solo después de responder. */
export const parejasSolutionSchema = z.array(pairSchema.extend({ explanation: z.string() }));

/** Pista que envía el servidor: un par correcto que queda fijo en el tablero. */
export const parejasHintSchema = pairSchema;

export type ParejasItem = z.infer<typeof itemSchema>;
export type ParejasPayload = z.infer<typeof parejasPayloadSchema>;
export type Pair = z.infer<typeof pairSchema>;
export type ParejasAnswer = z.infer<typeof parejasAnswerSchema>;
export type ParejasSolution = z.infer<typeof parejasSolutionSchema>;
