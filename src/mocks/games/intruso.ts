import { INTRUSO_LEVELS, buildReview } from "@/games/intruso/logic";
import { intrusoAnswerSchema, type IntrusoPayload, type IntrusoSolution } from "@/games/intruso/schema";
import type { Atom, Difficulty } from "@/games/types";
import { shuffle } from "../random";
import type { MockChallenge } from "../types";

/** 3 `relacionados` de un átomo + 1 intruso: de otra unidad (niveles 1–2) o cercano (nivel 3). */
export function createIntrusoChallenge(
  atoms: Atom[],
  otherUnit: string[],
  difficulty: Difficulty,
): MockChallenge {
  const { seconds, closeIntruder } = INTRUSO_LEVELS[difficulty];
  const atom = shuffle(atoms.filter((candidate) => candidate.relacionados.length >= 3))[0]!;
  const group = atom.relacionados.slice(0, 3);
  const excluded = new Set([atom.concepto, ...atom.relacionados].map((text) => text.toLowerCase()));
  const close = atoms.map((other) => other.concepto).filter((text) => !excluded.has(text.toLowerCase()));
  const intruderText = shuffle(closeIntruder && close.length > 0 ? close : otherUnit)[0]!;

  const intruder = { id: crypto.randomUUID(), text: intruderText };
  const payload: IntrusoPayload = {
    items: shuffle([intruder, ...group.map((text) => ({ id: crypto.randomUUID(), text }))]),
  };
  const explanation = closeIntruder
    ? `${group.join(", ")} se relacionan con ${atom.concepto}; ${intruderText} no.`
    : `${intruderText} es de otra unidad. ${group.join(", ")} se relacionan con ${atom.concepto}.`;
  const solution: IntrusoSolution = { itemId: intruder.id, explanation };

  return {
    payload,
    solution,
    durationMs: seconds * 1000,
    source: { documento: atom.fuente.documento, pagina: atom.fuente.pagina },
    hint: () => ({ text: `Tres de ellas tienen que ver con ${atom.concepto.toLowerCase()}.` }),
    grade: (answer) => {
      const parsed = intrusoAnswerSchema.safeParse(answer);
      const review = buildReview(payload, parsed.success ? parsed.data : null, solution);
      return {
        correct: review.isCorrect,
        timedOut: review.chosenText === null,
        explanation: review.isCorrect ? "Lo tienes: era el intruso." : `El intruso era ${intruderText}.`,
      };
    },
  };
}
