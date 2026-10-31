import { ENCUENTRA_ERROR_LEVELS, buildReview } from "@/games/encuentra-error/logic";
import {
  encuentraErrorAnswerSchema,
  type EncuentraErrorPayload,
  type EncuentraErrorSolution,
} from "@/games/encuentra-error/schema";
import type { Atom, Difficulty } from "@/games/types";
import type { MockChallenge } from "../types";

/** `pasos` con una de las `confusiones` metida (convención: `confusiones[i]` es la versión mala de `pasos[i]`). */
export function createEncuentraErrorChallenge(atom: Atom, difficulty: Difficulty): MockChallenge {
  const { lines: count, seconds } = ENCUENTRA_ERROR_LEVELS[difficulty];
  const pasos = atom.pasos ?? [];
  const start = Math.floor(Math.random() * (pasos.length - count + 1));
  const wrongIndex = start + Math.floor(Math.random() * count);

  const lines = pasos.slice(start, start + count).map((text, offset) => ({
    id: crypto.randomUUID(),
    text: start + offset === wrongIndex ? (atom.confusiones[wrongIndex] ?? text) : text,
  }));
  const wrong = lines[wrongIndex - start]!;
  const correctText = pasos[wrongIndex]!;

  const payload: EncuentraErrorPayload = { lines, monospace: false };
  const solution: EncuentraErrorSolution = {
    lineId: wrong.id,
    correctText,
    explanation: `Lo correcto es «${correctText}»`,
  };

  return {
    payload,
    solution,
    durationMs: seconds * 1000,
    source: { documento: atom.fuente.documento, pagina: atom.fuente.pagina },
    hint: () => ({
      text:
        wrongIndex - start < count / 2
          ? "El error está en la primera mitad."
          : "El error está en la segunda mitad.",
    }),
    grade: (answer) => {
      const parsed = encuentraErrorAnswerSchema.safeParse(answer);
      const review = buildReview(payload, parsed.success ? parsed.data : null, solution);
      return {
        correct: review.isCorrect,
        timedOut: review.chosenLine === null,
        explanation: `El error estaba en la línea ${review.wrongLine}. Lo correcto: ${correctText}`,
      };
    },
  };
}
