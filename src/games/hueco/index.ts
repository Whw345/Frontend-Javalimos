import { TextCursorInput } from "lucide-react";
import dynamic from "next/dynamic";
import { copy } from "@/content/copy";
import type { GameDefinition, GameProps, ResultDetailProps } from "../types";
import {
  huecoAnswerSchema,
  huecoPayloadSchema,
  huecoSolutionSchema,
  type HuecoAnswer,
  type HuecoPayload,
  type HuecoSolution,
} from "./schema";

const t = copy.games.hueco;

export const hueco: GameDefinition<HuecoPayload, HuecoAnswer, HuecoSolution> = {
  slug: "hueco",
  name: t.name,
  instruction: t.instruction,
  description: t.description,
  icon: TextCursorInput,
  accent: "cat-5",
  payloadSchema: huecoPayloadSchema,
  answerSchema: huecoAnswerSchema,
  solutionSchema: huecoSolutionSchema,
  submitMode: "auto",
  shortcuts: (payload) => [
    { keys: `1–${payload.options.length}`, label: t.shortcut(payload.options.length) },
  ],
  Component: dynamic<GameProps<HuecoPayload, HuecoAnswer>>(() =>
    import("./Hueco").then((module) => module.Hueco),
  ),
  ResultDetail: dynamic<ResultDetailProps<HuecoPayload, HuecoAnswer, HuecoSolution>>(() =>
    import("./HuecoReview").then((module) => module.HuecoReview),
  ),
};
