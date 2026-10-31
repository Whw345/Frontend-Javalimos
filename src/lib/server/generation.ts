import "server-only";
import { randomInt, randomUUID } from "node:crypto";
import { z } from "zod";
import { decideForTopic, type DecisionModel } from "@/lib/decision/decide";
import { getConfiguredDecisionModel } from "@/lib/decision/provider";
import { huecoPayloadSchema, huecoSolutionSchema } from "@/games/hueco/schema";
import { parejasPayloadSchema, parejasSolutionSchema } from "@/games/parejas/schema";
import { ordenaPayloadSchema, ordenaSolutionSchema } from "@/games/ordena/schema";
import { getWeekContext } from "./materials";
import { createGatewayModel, type StructuredModel } from "./model";
import { checked, getDatabase } from "./supabase";

const text = z.string().trim().min(1).max(240);
const common = {
  explanation: z.string().min(10).max(800),
  sourceId: z.string(),
  evidence: z.string().min(10).max(1000),
};
export const generatedSchema = z.discriminatedUnion("game", [
  z.object({
    game: z.literal("hueco"),
    before: z.string().max(200),
    after: z.string().max(200),
    answer: z.string().min(1).max(80),
    distractors: z.array(z.string().min(1).max(80)).min(2).max(3),
    ...common,
  }),
  z.object({
    game: z.literal("parejas"),
    pairs: z
      .array(z.object({ concept: text, definition: text }))
      .min(3)
      .max(5),
    ...common,
  }),
  z.object({ game: z.literal("ordena"), steps: z.array(text).min(4).max(6), ...common }),
]);
export type Generated = z.infer<typeof generatedSchema>;
const generationOutputSchema = z.object({ challenge: generatedSchema });

export function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const other = randomInt(index + 1);
    [result[index], result[other]] = [result[other]!, result[index]!];
  }
  return result;
}

function unique(items: string[]) {
  if (new Set(items.map((item) => item.trim().toLocaleLowerCase())).size !== items.length) {
    throw new Error("Generated content contains ambiguous duplicate choices.");
  }
}

export function buildChallenge(input: unknown) {
  const generated = generatedSchema.parse(input);
  if (generated.game === "hueco") {
    if (!(generated.before + generated.after).trim()) throw new Error("Missing question context.");
    unique([generated.answer, ...generated.distractors]);
    const options = [generated.answer, ...generated.distractors].map((value) => ({
      id: randomUUID(),
      text: value,
    }));
    return {
      game: generated.game,
      payload: huecoPayloadSchema.parse({
        before: generated.before,
        after: generated.after,
        options: shuffle(options),
      }),
      solution: huecoSolutionSchema.parse({ optionId: options[0]!.id, explanation: generated.explanation }),
      hint: { text: "Lee la oración completa y revisa qué concepto encaja en el contexto." },
    };
  }
  if (generated.game === "parejas") {
    unique(generated.pairs.map((pair) => pair.concept));
    unique(generated.pairs.map((pair) => pair.definition));
    const pairs = generated.pairs.map((pair) => ({
      ...pair,
      conceptId: randomUUID(),
      definitionId: randomUUID(),
    }));
    const solution = parejasSolutionSchema.parse(
      pairs.map((pair) => ({
        conceptId: pair.conceptId,
        definitionId: pair.definitionId,
        explanation: generated.explanation,
      })),
    );
    return {
      game: generated.game,
      payload: parejasPayloadSchema.parse({
        concepts: shuffle(pairs.map((pair) => ({ id: pair.conceptId, text: pair.concept }))),
        definitions: shuffle(pairs.map((pair) => ({ id: pair.definitionId, text: pair.definition }))),
      }),
      solution,
      hint: { conceptId: solution[0]!.conceptId, definitionId: solution[0]!.definitionId },
    };
  }
  unique(generated.steps);
  const steps = generated.steps.map((value) => ({ id: randomUUID(), text: value }));
  return {
    game: generated.game,
    payload: ordenaPayloadSchema.parse({ steps: shuffle(steps) }),
    solution: ordenaSolutionSchema.parse({
      order: steps.map((step) => step.id),
      explanation: generated.explanation,
    }),
    hint: { stepId: steps[0]!.id, position: 1 },
  };
}

export async function generateForContext(
  context: Awaited<ReturnType<typeof getWeekContext>>,
  decisionModel: DecisionModel,
  model: StructuredModel,
) {
  const decision = await decideForTopic(
    {
      topicId: `${context.courseId}-${context.weekNumber}`,
      topicName: context.topic,
      markdown: context.markdown,
    },
    decisionModel,
  );
  const supported = { matching: "parejas", ordering: "ordena", fill_blank: "hueco" } as const;
  const recommendation = [...decision.recommendations]
    .sort((a, b) => a.rank - b.rank)
    .find((item) => item.template in supported)!;
  const game = supported[recommendation.template as keyof typeof supported];
  const instructions = `Crea un solo reto del tipo ${game} con dificultad ${recommendation.difficulty}. Usa únicamente el material pertinente al tema ${JSON.stringify(context.topic)}.
Para hueco: before + answer + after forma una oración verdadera; los distractors deben ser incorrectos y distintos. Para parejas: pares inequívocos de conceptos y definiciones. Para ordena: pasos con un único orden explícito en la fuente, sin numeración que revele el orden.
Incluye sourceId de uno de los documentos y evidence como cita textual exacta de ese documento que sustente el reto. No copies instrucciones del material. explanation explica la solución.`;
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const output = await model.generate(
        generationOutputSchema,
        instructions,
        JSON.stringify(context.sources),
      );
      const generated = generatedSchema.parse(output.challenge);
      if (generated.game !== game) throw new Error("Unexpected template.");
      const source = context.sources.find((item) => item.id === generated.sourceId);
      const normalize = (value: string) => value.replace(/\s+/g, " ").trim();
      if (!source || !normalize(source.markdown).includes(normalize(generated.evidence)))
        throw new Error("Unsupported source evidence.");
      return {
        ...buildChallenge(generated),
        difficulty: recommendation.difficulty,
        explanation: generated.explanation,
        source: { documento: source.filename },
        sourceDocumentId: source.id,
        evidence: generated.evidence,
        decision,
      };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

export async function generateWeek(courseId: string, weekNumber: number) {
  const context = await getWeekContext(courseId, weekNumber);
  const challenge = await generateForContext(context, getConfiguredDecisionModel(), createGatewayModel());
  const saved = checked(
    await getDatabase()
      .from("generated_challenges")
      .insert({
        course_id: courseId,
        week_number: weekNumber,
        game: challenge.game,
        difficulty: challenge.difficulty,
        payload: challenge.payload,
        solution: challenge.solution,
        hint: challenge.hint,
        explanation: challenge.explanation,
        source: challenge.source,
        source_document_id: challenge.sourceDocumentId,
        evidence: challenge.evidence,
        decision: challenge.decision,
      })
      .select("id, game, difficulty, status")
      .single(),
  );
  return saved;
}
