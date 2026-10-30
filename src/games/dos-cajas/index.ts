import { Columns2 } from "lucide-react";
import dynamic from "next/dynamic";
import { copy } from "@/content/copy";
import type { GameDefinition, GameProps, ResultDetailProps } from "../types";
import {
  dosCajasAnswerSchema,
  dosCajasPayloadSchema,
  dosCajasSolutionSchema,
  type DosCajasAnswer,
  type DosCajasPayload,
  type DosCajasSolution,
} from "./schema";

const t = copy.games.dosCajas;

export const dosCajas: GameDefinition<DosCajasPayload, DosCajasAnswer, DosCajasSolution> = {
  slug: "dos-cajas",
  name: t.name,
  instruction: t.instruction,
  description: t.description,
  icon: Columns2,
  accent: "cat-4",
  payloadSchema: dosCajasPayloadSchema,
  answerSchema: dosCajasAnswerSchema,
  solutionSchema: dosCajasSolutionSchema,
  submitMode: "auto",
  getRounds: (payload) => ({ rounds: payload.cards.length, secondsPerRound: payload.secondsPerCard }),
  shortcuts: () => [
    { keys: "←", label: t.shortcutA },
    { keys: "→", label: t.shortcutB },
  ],
  Component: dynamic<GameProps<DosCajasPayload, DosCajasAnswer>>(() =>
    import("./DosCajas").then((module) => module.DosCajas),
  ),
  ResultDetail: dynamic<ResultDetailProps<DosCajasPayload, DosCajasAnswer, DosCajasSolution>>(() =>
    import("./DosCajasReview").then((module) => module.DosCajasReview),
  ),
};
