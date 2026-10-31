import { z } from "zod";

export const quienSoyPayloadSchema = z.object({
  /** De la más vaga a la más clara. El shell revela una por ronda. */
  clues: z.array(z.string().min(1).max(200)).min(2).max(6),
  secondsPerClue: z.number().positive(),
  options: z
    .array(z.object({ id: z.string(), text: z.string().min(1).max(80) }))
    .min(2)
    .max(4),
});

export const quienSoyAnswerSchema = z.object({
  optionId: z.string().nullable(),
  cluesSeen: z.number().int().nonnegative(),
});

export const quienSoySolutionSchema = z.object({
  answer: z.string(),
  optionId: z.string(),
  explanation: z.string(),
});

export type QuienSoyPayload = z.infer<typeof quienSoyPayloadSchema>;
export type QuienSoyAnswer = z.infer<typeof quienSoyAnswerSchema>;
export type QuienSoySolution = z.infer<typeof quienSoySolutionSchema>;
