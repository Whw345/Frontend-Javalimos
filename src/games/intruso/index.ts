import { ShieldQuestion } from "lucide-react";
import dynamic from "next/dynamic";
import { copy } from "@/content/copy";
import type { GameDefinition, GameProps, ResultDetailProps } from "../types";
import {
  intrusoAnswerSchema,
  intrusoPayloadSchema,
  intrusoSolutionSchema,
  type IntrusoAnswer,
  type IntrusoPayload,
  type IntrusoSolution,
} from "./schema";

const t = copy.games.intruso;

export const intruso: GameDefinition<IntrusoPayload, IntrusoAnswer, IntrusoSolution> = {
  slug: "intruso",
  name: t.name,
  instruction: t.instruction,
  description: t.description,
  icon: ShieldQuestion,
  accent: "cat-3",
  payloadSchema: intrusoPayloadSchema,
  answerSchema: intrusoAnswerSchema,
  solutionSchema: intrusoSolutionSchema,
  submitMode: "auto",
  shortcuts: () => [{ keys: "1–4", label: t.shortcut }],
  Component: dynamic<GameProps<IntrusoPayload, IntrusoAnswer>>(() =>
    import("./Intruso").then((module) => module.Intruso),
  ),
  ResultDetail: dynamic<ResultDetailProps<IntrusoPayload, IntrusoAnswer, IntrusoSolution>>(() =>
    import("./IntrusoReview").then((module) => module.IntrusoReview),
  ),
};
