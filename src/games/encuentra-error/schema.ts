import { z } from "zod";

export const encuentraErrorPayloadSchema = z.object({
  lines: z
    .array(z.object({ id: z.string(), text: z.string().min(1).max(200) }))
    .min(2)
    .max(8),
  /** Cursos de programación: líneas en fuente mono (§12, notas). */
  monospace: z.boolean(),
});

export const encuentraErrorAnswerSchema = z.object({ lineId: z.string().nullable() });

export const encuentraErrorSolutionSchema = z.object({
  lineId: z.string(),
  correctText: z.string(),
  explanation: z.string(),
});

export type EncuentraErrorPayload = z.infer<typeof encuentraErrorPayloadSchema>;
export type EncuentraErrorAnswer = z.infer<typeof encuentraErrorAnswerSchema>;
export type EncuentraErrorSolution = z.infer<typeof encuentraErrorSolutionSchema>;
