import { z } from "zod";

export const boxSchema = z.enum(["a", "b"]);

export const dosCajasPayloadSchema = z.object({
  boxes: z.object({ a: z.string().min(1), b: z.string().min(1) }),
  cards: z.array(z.object({ id: z.string(), text: z.string().min(1).max(200) })).min(1),
  secondsPerCard: z.number().positive(),
});

export const dosCajasAnswerSchema = z.object({
  responses: z.array(z.object({ cardId: z.string(), box: boxSchema.nullable() })),
});

export const dosCajasSolutionSchema = z.array(
  z.object({ cardId: z.string(), box: boxSchema, explanation: z.string() }),
);

export type Box = z.infer<typeof boxSchema>;
export type DosCajasPayload = z.infer<typeof dosCajasPayloadSchema>;
export type DosCajasCard = DosCajasPayload["cards"][number];
export type DosCajasAnswer = z.infer<typeof dosCajasAnswerSchema>;
export type DosCajasSolution = z.infer<typeof dosCajasSolutionSchema>;
