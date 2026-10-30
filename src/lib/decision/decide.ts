import {
  decisionInputSchema,
  decisionPayloadSchema,
  decisionResultSchema,
  type DecisionResultOutput,
} from "./schema";
import { buildDecisionPrompt } from "./prompt";

export type DecisionModel = {
  complete: (prompt: string) => Promise<unknown>;
};

export async function decideTemplate(
  input: unknown,
  model: DecisionModel,
): Promise<DecisionResultOutput> {
  const parsedInput = decisionInputSchema.parse(input);
  const rawDecision = await model.complete(buildDecisionPrompt(parsedInput.markdown));
  const decision = decisionPayloadSchema.parse(rawDecision);

  return decisionResultSchema.parse({
    schemaVersion: "1.0",
    source: parsedInput.source,
    decision,
  });
}
