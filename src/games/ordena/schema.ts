import { z } from "zod";

const stepSchema = z.object({ id: z.string(), text: z.string().min(1).max(240) });

/** Los pasos llegan desordenados: el orden del payload no revela la solución. */
export const ordenaPayloadSchema = z.object({ steps: z.array(stepSchema).min(2).max(8) });

export const ordenaAnswerSchema = z.object({ order: z.array(z.string()) });

export const ordenaSolutionSchema = z.object({ order: z.array(z.string()), explanation: z.string() });

/** Pista que envía el servidor: dónde va uno de los pasos. */
export const ordenaHintSchema = z.object({ stepId: z.string(), position: z.number().int().positive() });

export type OrdenaStep = z.infer<typeof stepSchema>;
export type OrdenaPayload = z.infer<typeof ordenaPayloadSchema>;
export type OrdenaAnswer = z.infer<typeof ordenaAnswerSchema>;
export type OrdenaSolution = z.infer<typeof ordenaSolutionSchema>;
