import { MessageSquareText } from "lucide-react";
import dynamic from "next/dynamic";
import { copy } from "@/content/copy";
import type { GameDefinition, GameProps, ResultDetailProps } from "../types";
import {
  explicaloAnswerSchema,
  explicaloPayloadSchema,
  explicaloSolutionSchema,
  type ExplicaloAnswer,
  type ExplicaloPayload,
  type ExplicaloSolution,
} from "./schema";

const t = copy.games.explicalo;

export const explicalo: GameDefinition<ExplicaloPayload, ExplicaloAnswer, ExplicaloSolution> = {
  slug: "explicalo",
  name: t.name,
  instruction: t.instruction,
  description: t.description,
  icon: MessageSquareText,
  accent: "cat-5",
  payloadSchema: explicaloPayloadSchema,
  answerSchema: explicaloAnswerSchema,
  solutionSchema: explicaloSolutionSchema,
  submitMode: "button",
  submittingLabel: t.evaluating,
  shortcuts: () => [{ keys: "Ctrl+Enter", label: t.shortcut }],
  Component: dynamic<GameProps<ExplicaloPayload, ExplicaloAnswer>>(() =>
    import("./Explicalo").then((module) => module.Explicalo),
  ),
  ResultDetail: dynamic<ResultDetailProps<ExplicaloPayload, ExplicaloAnswer, ExplicaloSolution>>(() =>
    import("./ExplicaloReview").then((module) => module.ExplicaloReview),
  ),
};
