import { Bug } from "lucide-react";
import dynamic from "next/dynamic";
import { copy } from "@/content/copy";
import type { GameDefinition, GameProps, ResultDetailProps } from "../types";
import {
  encuentraErrorAnswerSchema,
  encuentraErrorPayloadSchema,
  encuentraErrorSolutionSchema,
  type EncuentraErrorAnswer,
  type EncuentraErrorPayload,
  type EncuentraErrorSolution,
} from "./schema";

const t = copy.games.encuentraError;

export const encuentraError: GameDefinition<
  EncuentraErrorPayload,
  EncuentraErrorAnswer,
  EncuentraErrorSolution
> = {
  slug: "encuentra-error",
  name: t.name,
  instruction: t.instruction,
  description: t.description,
  icon: Bug,
  accent: "cat-1",
  payloadSchema: encuentraErrorPayloadSchema,
  answerSchema: encuentraErrorAnswerSchema,
  solutionSchema: encuentraErrorSolutionSchema,
  submitMode: "auto",
  shortcuts: (payload) => [{ keys: `1–${payload.lines.length}`, label: t.shortcut(payload.lines.length) }],
  Component: dynamic<GameProps<EncuentraErrorPayload, EncuentraErrorAnswer>>(() =>
    import("./EncuentraError").then((module) => module.EncuentraError),
  ),
  ResultDetail: dynamic<
    ResultDetailProps<EncuentraErrorPayload, EncuentraErrorAnswer, EncuentraErrorSolution>
  >(() => import("./EncuentraErrorReview").then((module) => module.EncuentraErrorReview)),
};
