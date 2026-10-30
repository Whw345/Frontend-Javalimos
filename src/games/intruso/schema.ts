import { z } from "zod";

export const intrusoPayloadSchema = z.object({
  items: z.array(z.object({ id: z.string(), text: z.string().min(1).max(80) })).length(4),
});

export const intrusoAnswerSchema = z.object({ itemId: z.string().nullable() });

export const intrusoSolutionSchema = z.object({ itemId: z.string(), explanation: z.string() });

export type IntrusoPayload = z.infer<typeof intrusoPayloadSchema>;
export type IntrusoAnswer = z.infer<typeof intrusoAnswerSchema>;
export type IntrusoSolution = z.infer<typeof intrusoSolutionSchema>;
