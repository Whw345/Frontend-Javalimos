import { z } from "zod";

export const templateSchema = z.enum([
  "multiple_choice",
  "matching",
  "ordering",
  "fill_blank",
]);

export const confidenceLevelSchema = z.enum(["low", "medium", "high"]);

export const difficultySchema = z.number().int().min(1).max(3);

export const decisionInputSchema = z.object({
  topicId: z.string().trim().min(1).max(120),
  topicName: z.string().trim().min(1).max(160),
  markdown: z.string().trim().min(1).max(120_000),
});

export const gameRecommendationSchema = z.object({
  rank: z.number().int().min(1).max(3),
  template: templateSchema,
  difficulty: difficultySchema,
  score: z.number().min(0).max(1),
  confidenceLevel: confidenceLevelSchema,
  reason: z.string().trim().min(1).max(500),
});

export const recommendationsSchema = z
  .array(gameRecommendationSchema)
  .length(3)
  .superRefine((recommendations, context) => {
    const templates = new Set(recommendations.map((recommendation) => recommendation.template));
    const ranks = new Set(recommendations.map((recommendation) => recommendation.rank));

    if (templates.size !== 3) {
      context.addIssue({ code: "custom", message: "Las recomendaciones no deben repetir plantilla." });
    }

    if (ranks.size !== 3 || ![1, 2, 3].every((rank) => ranks.has(rank))) {
      context.addIssue({ code: "custom", message: "Las recomendaciones deben tener los rangos 1, 2 y 3." });
    }
  });

export const decisionOutputSchema = z.object({
  recommendations: recommendationsSchema,
});

export const decisionResultSchema = z.object({
  schemaVersion: z.literal("1.0"),
  topicId: z.string().trim().min(1).max(120),
  recommendations: recommendationsSchema,
});

export type DecisionResultInput = z.input<typeof decisionResultSchema>;
export type DecisionResultOutput = z.output<typeof decisionResultSchema>;
