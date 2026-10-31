import { Scale } from "lucide-react";
import dynamic from "next/dynamic";
import { copy } from "@/content/copy";
import type { GameDefinition, GameProps, ResultDetailProps } from "../types";
import {
  cualMayorAnswerSchema,
  cualMayorPayloadSchema,
  cualMayorSolutionSchema,
  type CualMayorAnswer,
  type CualMayorPayload,
  type CualMayorSolution,
} from "./schema";

const t = copy.games.cualMayor;

export const cualMayor: GameDefinition<CualMayorPayload, CualMayorAnswer, CualMayorSolution> = {
  slug: "cual-mayor",
  name: t.name,
  instruction: t.instruction,
  description: t.description,
  icon: Scale,
  accent: "cat-4",
  payloadSchema: cualMayorPayloadSchema,
  answerSchema: cualMayorAnswerSchema,
  solutionSchema: cualMayorSolutionSchema,
  submitMode: "auto",
  getRounds: (payload) => ({ rounds: payload.rounds.length, secondsPerRound: payload.secondsPerRound }),
  shortcuts: () => [
    { keys: "←", label: t.shortcutLeft },
    { keys: "→", label: t.shortcutRight },
  ],
  Component: dynamic<GameProps<CualMayorPayload, CualMayorAnswer>>(() =>
    import("./CualMayor").then((module) => module.CualMayor),
  ),
  ResultDetail: dynamic<ResultDetailProps<CualMayorPayload, CualMayorAnswer, CualMayorSolution>>(() =>
    import("./CualMayorReview").then((module) => module.CualMayorReview),
  ),
};
