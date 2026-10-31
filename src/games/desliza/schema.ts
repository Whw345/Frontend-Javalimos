import { z } from "zod";

export const deslizaStatementSchema = z.object({
  id: z.string(),
  /** Afirmación en una frase (definición verdadera o confusión falsa del átomo). */
  text: z.string().min(1).max(240),
  /** Concepto del átomo; solo se muestra si el estudiante usa la pista. */
  concepto: z.string(),
});

export const deslizaPayloadSchema = z.object({
  statements: z.array(deslizaStatementSchema).min(1),
  secondsPerCard: z.number().positive(),
});

export const deslizaResponseSchema = z.object({
  statementId: z.string(),
  /** true = verdadero, false = falso, null = se acabó el tiempo de la carta. */
  verdict: z.boolean().nullable(),
  elapsedMs: z.number().nonnegative().nullable(),
});

export const deslizaAnswerSchema = z.object({
  responses: z.array(deslizaResponseSchema),
});

/** Llega en `ChallengeResult.correctAnswer`, solo después de responder. */
export const deslizaSolutionSchema = z.array(
  z.object({
    statementId: z.string(),
    isTrue: z.boolean(),
    explanation: z.string(),
  }),
);

export type DeslizaStatement = z.infer<typeof deslizaStatementSchema>;
export type DeslizaPayload = z.infer<typeof deslizaPayloadSchema>;
export type DeslizaResponse = z.infer<typeof deslizaResponseSchema>;
export type DeslizaAnswer = z.infer<typeof deslizaAnswerSchema>;
export type DeslizaSolution = z.infer<typeof deslizaSolutionSchema>;
