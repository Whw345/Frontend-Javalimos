import { Link2 } from "lucide-react";
import dynamic from "next/dynamic";
import { copy } from "@/content/copy";
import type { GameDefinition, GameProps, ResultDetailProps } from "../types";
import {
  parejasAnswerSchema,
  parejasPayloadSchema,
  parejasSolutionSchema,
  type ParejasAnswer,
  type ParejasPayload,
  type ParejasSolution,
} from "./schema";

const t = copy.games.parejas;

export const parejas: GameDefinition<ParejasPayload, ParejasAnswer, ParejasSolution> = {
  slug: "parejas",
  name: t.name,
  instruction: t.instruction,
  description: t.description,
  icon: Link2,
  accent: "cat-2",
  payloadSchema: parejasPayloadSchema,
  answerSchema: parejasAnswerSchema,
  solutionSchema: parejasSolutionSchema,
  submitMode: "auto",
  shortcuts: (payload) => [
    { keys: "1–5", label: t.shortcutConcepts(payload.concepts.length) },
    { keys: "A–E", label: t.shortcutDefinitions(payload.definitions.length) },
  ],
  Component: dynamic<GameProps<ParejasPayload, ParejasAnswer>>(() =>
    import("./Parejas").then((module) => module.Parejas),
  ),
  ResultDetail: dynamic<ResultDetailProps<ParejasPayload, ParejasAnswer, ParejasSolution>>(() =>
    import("./ParejasReview").then((module) => module.ParejasReview),
  ),
};
