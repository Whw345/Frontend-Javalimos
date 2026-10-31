import { z } from "zod";

/** Oración con un espacio en blanco: `before` + ____ + `after`. */
export const huecoPayloadSchema = z.object({
  before: z.string(),
  after: z.string(),
  options: z
    .array(z.object({ id: z.string(), text: z.string().min(1).max(80) }))
    .min(2)
    .max(4),
});

export const huecoAnswerSchema = z.object({ optionId: z.string().nullable() });

export const huecoSolutionSchema = z.object({ optionId: z.string(), explanation: z.string() });

export type HuecoPayload = z.infer<typeof huecoPayloadSchema>;
export type HuecoAnswer = z.infer<typeof huecoAnswerSchema>;
export type HuecoSolution = z.infer<typeof huecoSolutionSchema>;
