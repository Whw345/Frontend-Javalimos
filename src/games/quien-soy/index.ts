import { UserRoundSearch } from "lucide-react";
import dynamic from "next/dynamic";
import { copy } from "@/content/copy";
import type { GameDefinition, GameProps, ResultDetailProps } from "../types";
import {
  quienSoyAnswerSchema,
  quienSoyPayloadSchema,
  quienSoySolutionSchema,
  type QuienSoyAnswer,
  type QuienSoyPayload,
  type QuienSoySolution,
} from "./schema";

const t = copy.games.quienSoy;

export const quienSoy: GameDefinition<QuienSoyPayload, QuienSoyAnswer, QuienSoySolution> = {
  slug: "quien-soy",
  name: t.name,
  instruction: t.instruction,
  description: t.description,
  icon: UserRoundSearch,
  accent: "cat-2",
  payloadSchema: quienSoyPayloadSchema,
  answerSchema: quienSoyAnswerSchema,
  solutionSchema: quienSoySolutionSchema,
  submitMode: "button",
  // Cada ronda revela una pista; el shell muestra el tiempo hasta la siguiente.
  getRounds: (payload) => ({ rounds: payload.clues.length, secondsPerRound: payload.secondsPerClue }),
  shortcuts: (payload) => [
    payload.mode === "options"
      ? { keys: "1–4", label: t.shortcutOptions(payload.options.length) }
      : { keys: "Enter", label: t.shortcutText },
  ],
  Component: dynamic<GameProps<QuienSoyPayload, QuienSoyAnswer>>(() =>
    import("./QuienSoy").then((module) => module.QuienSoy),
  ),
  ResultDetail: dynamic<ResultDetailProps<QuienSoyPayload, QuienSoyAnswer, QuienSoySolution>>(() =>
    import("./QuienSoyReview").then((module) => module.QuienSoyReview),
  ),
};
