import { ArrowLeftRight } from "lucide-react";
import dynamic from "next/dynamic";
import { copy } from "@/content/copy";
import type { GameDefinition, GameProps, ResultDetailProps } from "../types";
import {
  deslizaAnswerSchema,
  deslizaPayloadSchema,
  deslizaSolutionSchema,
  type DeslizaAnswer,
  type DeslizaPayload,
  type DeslizaSolution,
} from "./schema";

const t = copy.games.desliza;

export const desliza: GameDefinition<DeslizaPayload, DeslizaAnswer, DeslizaSolution> = {
  slug: "desliza",
  name: t.name,
  instruction: t.instruction,
  description: t.description,
  icon: ArrowLeftRight,
  accent: "cat-1",
  payloadSchema: deslizaPayloadSchema,
  answerSchema: deslizaAnswerSchema,
  solutionSchema: deslizaSolutionSchema,
  submitMode: "auto",
  getRounds: (payload) => ({ rounds: payload.statements.length, secondsPerRound: payload.secondsPerCard }),
  shortcuts: () => [
    { keys: "←", label: t.shortcutFalse },
    { keys: "→", label: t.shortcutTrue },
  ],
  // Carga diferida (§16.4): la ruta del reto solo descarga el juego que toca.
  Component: dynamic<GameProps<DeslizaPayload, DeslizaAnswer>>(() =>
    import("./Desliza").then((module) => module.Desliza),
  ),
  ResultDetail: dynamic<ResultDetailProps<DeslizaPayload, DeslizaAnswer, DeslizaSolution>>(() =>
    import("./DeslizaReview").then((module) => module.DeslizaReview),
  ),
};
