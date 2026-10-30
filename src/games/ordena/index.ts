import { ListOrdered } from "lucide-react";
import dynamic from "next/dynamic";
import { copy } from "@/content/copy";
import type { GameDefinition, GameProps, ResultDetailProps } from "../types";
import {
  ordenaAnswerSchema,
  ordenaPayloadSchema,
  ordenaSolutionSchema,
  type OrdenaAnswer,
  type OrdenaPayload,
  type OrdenaSolution,
} from "./schema";

const t = copy.games.ordena;

export const ordena: GameDefinition<OrdenaPayload, OrdenaAnswer, OrdenaSolution> = {
  slug: "ordena",
  name: t.name,
  instruction: t.instruction,
  description: t.description,
  icon: ListOrdered,
  accent: "cat-3",
  payloadSchema: ordenaPayloadSchema,
  answerSchema: ordenaAnswerSchema,
  solutionSchema: ordenaSolutionSchema,
  submitMode: "button",
  shortcuts: () => [{ keys: "Espacio ↑ ↓", label: t.shortcut }],
  Component: dynamic<GameProps<OrdenaPayload, OrdenaAnswer>>(() =>
    import("./Ordena").then((module) => module.Ordena),
  ),
  ResultDetail: dynamic<ResultDetailProps<OrdenaPayload, OrdenaAnswer, OrdenaSolution>>(() =>
    import("./OrdenaReview").then((module) => module.OrdenaReview),
  ),
};
