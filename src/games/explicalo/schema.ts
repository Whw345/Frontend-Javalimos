import { z } from "zod";

export const explicaloPayloadSchema = z.object({
  concept: z.string().min(1),
  maxChars: z.number().int().positive(),
});

export const explicaloAnswerSchema = z.object({ text: z.string() });

/** Devolución del evaluador (LLM en el backend), que compara con el texto de la fuente. */
export const explicaloSolutionSchema = z.object({
  reference: z.string(),
  matched: z.array(z.string()),
  missing: z.array(z.string()),
});

export type ExplicaloPayload = z.infer<typeof explicaloPayloadSchema>;
export type ExplicaloAnswer = z.infer<typeof explicaloAnswerSchema>;
export type ExplicaloSolution = z.infer<typeof explicaloSolutionSchema>;
