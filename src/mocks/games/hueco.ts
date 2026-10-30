import { HUECO_LEVELS, buildReview } from "@/games/hueco/logic";
import { huecoAnswerSchema, type HuecoPayload, type HuecoSolution } from "@/games/hueco/schema";
import type { Atom, Difficulty } from "@/games/types";
import { shuffle } from "../random";
import type { MockChallenge } from "../types";

/**
 * `definicion` sin el término clave; las otras opciones salen de `relacionados`
 * (y, si faltan, de conceptos de otros átomos de la semana).
 */
export function createHuecoChallenge(atoms: Atom[], difficulty: Difficulty): MockChallenge {
  const { options: count, seconds } = HUECO_LEVELS[difficulty];
  const candidates = atoms.filter((atom) =>
    atom.definicion.toLowerCase().includes(atom.concepto.toLowerCase()),
  );
  const atom = shuffle(candidates)[0]!;

  const start = atom.definicion.toLowerCase().indexOf(atom.concepto.toLowerCase());
  const term = atom.definicion.slice(start, start + atom.concepto.length);
  const pool = [...atom.relacionados, ...atoms.map((other) => other.concepto)].filter(
    (text, index, all) => text.toLowerCase() !== term.toLowerCase() && all.indexOf(text) === index,
  );
  const distractors = shuffle(pool)
    .slice(0, count - 1)
    .map((text) => text.toLowerCase());

  const correct = { id: crypto.randomUUID(), text: term };
  const payload: HuecoPayload = {
    before: atom.definicion.slice(0, start),
    after: atom.definicion.slice(start + term.length),
    options: shuffle([correct, ...distractors.map((text) => ({ id: crypto.randomUUID(), text }))]),
  };
  const solution: HuecoSolution = { optionId: correct.id, explanation: atom.fuente.fragmento };

  return {
    payload,
    solution,
    durationMs: seconds * 1000,
    source: { documento: atom.fuente.documento, pagina: atom.fuente.pagina },
    hint: () => ({ text: `Empieza con «${term.charAt(0).toUpperCase()}».` }),
    grade: (answer) => {
      const parsed = huecoAnswerSchema.safeParse(answer);
      const review = buildReview(payload, parsed.success ? parsed.data : null, solution);
      return {
        correct: review.isCorrect,
        timedOut: !review.chosenText,
        explanation: review.isCorrect
          ? `Exacto: ${review.fullSentence}`
          : `La palabra era «${review.correctText}»: ${review.fullSentence}`,
      };
    },
  };
}
