import { z } from "zod";

export const sideSchema = z.enum(["left", "right"]);

const optionSchema = z.object({ label: z.string().min(1).max(80) });

export const cualMayorPayloadSchema = z.object({
  rounds: z
    .array(z.object({ id: z.string(), question: z.string(), left: optionSchema, right: optionSchema }))
    .min(1),
  secondsPerRound: z.number().positive(),
});

export const cualMayorAnswerSchema = z.object({
  responses: z.array(z.object({ roundId: z.string(), choice: sideSchema.nullable() })),
});

/** Los valores solo llegan después de responder, para mostrarlos en la revisión. */
export const cualMayorSolutionSchema = z.array(
  z.object({ roundId: z.string(), choice: sideSchema, leftValue: z.string(), rightValue: z.string() }),
);

export type Side = z.infer<typeof sideSchema>;
export type CualMayorPayload = z.infer<typeof cualMayorPayloadSchema>;
export type CualMayorRound = CualMayorPayload["rounds"][number];
export type CualMayorAnswer = z.infer<typeof cualMayorAnswerSchema>;
export type CualMayorSolution = z.infer<typeof cualMayorSolutionSchema>;
