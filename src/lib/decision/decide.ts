import {
  decisionInputSchema,
  decisionOutputSchema,
  decisionResultSchema,
  type DecisionResultOutput,
} from "./schema";
import { buildDecisionPrompt } from "./prompt";

export type DecisionModel = {
  complete: (prompt: string) => Promise<unknown>;
};

export async function decideForTopic(
  input: unknown,
  model: DecisionModel,
): Promise<DecisionResultOutput> {
  const parsedInput = decisionInputSchema.parse(input);
  const rawOutput = await model.complete(
    buildDecisionPrompt(parsedInput.topicName, parsedInput.markdown),
  );
  const output = decisionOutputSchema.parse(rawOutput);

  return decisionResultSchema.parse({
    schemaVersion: "1.0",
    topicId: parsedInput.topicId,
    recommendations: output.recommendations,
  });
}
