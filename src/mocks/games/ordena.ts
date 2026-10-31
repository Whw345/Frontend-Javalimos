import { ORDENA_LEVELS, buildReview, countCorrect } from "@/games/ordena/logic";
import { ordenaAnswerSchema, type OrdenaPayload, type OrdenaSolution } from "@/games/ordena/schema";
import type { Atom, Difficulty } from "@/games/types";
import { shuffle } from "../random";
import type { MockChallenge } from "../types";

/** Tramo continuo de `pasos` del átomo, barajado (nunca en el orden correcto). */
export function createOrdenaChallenge(atom: Atom, difficulty: Difficulty): MockChallenge {
  const { steps: count, seconds } = ORDENA_LEVELS[difficulty];
  const pasos = atom.pasos ?? [];
  const start = Math.floor(Math.random() * (pasos.length - count + 1));
  const steps = pasos.slice(start, start + count).map((text) => ({ id: crypto.randomUUID(), text }));

  let shuffled = shuffle(steps);
  while (shuffled.every((step, index) => step.id === steps[index]!.id)) shuffled = shuffle(steps);

  const payload: OrdenaPayload = { steps: shuffled };
  const solution: OrdenaSolution = { order: steps.map((step) => step.id), explanation: atom.definicion };

  return {
    payload,
    solution,
    durationMs: seconds * 1000,
    source: { documento: atom.fuente.documento, pagina: atom.fuente.pagina },
    hint: () => ({ stepId: steps[0]!.id, position: 1 }),
    grade: (answer) => {
      const parsed = ordenaAnswerSchema.safeParse(answer);
      const review = buildReview(payload, parsed.success ? parsed.data : null, solution);
      const correctCount = countCorrect(review);
      return {
        correct: correctCount === review.length,
        timedOut: !parsed.success,
        explanation: `${correctCount} de ${review.length} pasos en su lugar. ${atom.definicion}`,
      };
    },
  };
}
