import { z } from "zod";

export const templateSchema = z.enum([
  "multiple_choice",
  "matching",
  "ordering",
  "fill_blank",
]);

export const cognitiveSkillSchema = z.enum([
  "recordar",
  "comprender",
  "aplicar",
  "analizar",
]);

export const difficultySchema = z.number().int().min(1).max(5);

export const decisionResultSchema = z.object({
  schemaVersion: z.literal("1.0"),
  source: z.object({
    documentId: z.string().trim().min(1).max(120).optional(),
    topic: z.string().trim().min(1).max(160),
    section: z.string().trim().min(1).max(160).optional(),
  }),
  decision: z.object({
    template: templateSchema,
    difficulty: difficultySchema,
    cognitiveSkill: cognitiveSkillSchema,
    confidence: z.number().min(0).max(1),
    reason: z.string().trim().min(1).max(500),
  }),
});

export type DecisionResultInput = z.input<typeof decisionResultSchema>;
export type DecisionResultOutput = z.output<typeof decisionResultSchema>;
