import { QUIEN_SOY_LEVELS, buildReview } from "@/games/quien-soy/logic";
import { quienSoyAnswerSchema, type QuienSoyPayload, type QuienSoySolution } from "@/games/quien-soy/schema";
import type { Atom, Difficulty } from "@/games/types";
import { shuffle } from "../random";
import type { MockChallenge } from "../types";

const OPTIONS = 4;

/** Pistas en este orden (§ plantilla 7): `ejemplos`, `relacionados` y `definicion` sin el término. */
export function createQuienSoyChallenge(
  atoms: Atom[],
  ejemplos: Record<string, string[]>,
  difficulty: Difficulty,
): MockChallenge {
  const { mode, secondsPerClue } = QUIEN_SOY_LEVELS[difficulty];
  const atom = shuffle(atoms.filter((candidate) => ejemplos[candidate.id]))[0]!;
  const masked = atom.definicion.replace(
    new RegExp(atom.concepto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"),
    "____",
  );
  const clues = [
    ...(ejemplos[atom.id] ?? []),
    `Me relaciono con: ${atom.relacionados.slice(0, 3).join(", ")}.`,
    masked,
  ];

  const correct = { id: crypto.randomUUID(), text: atom.concepto };
  const others = shuffle(atoms.filter((other) => other.id !== atom.id))
    .slice(0, OPTIONS - 1)
    .map((other) => ({ id: crypto.randomUUID(), text: other.concepto }));

  const payload: QuienSoyPayload = {
    clues,
    secondsPerClue,
    mode,
    options: mode === "options" ? shuffle([correct, ...others]) : [],
  };
  const solution: QuienSoySolution = {
    answer: atom.concepto,
    optionId: mode === "options" ? correct.id : null,
    explanation: atom.definicion,
  };

  return {
    payload,
    solution,
    durationMs: clues.length * (secondsPerClue * 1000 + 300),
    source: { documento: atom.fuente.documento, pagina: atom.fuente.pagina },
    hint: () => ({
      text: `Tiene ${atom.concepto.length} letras y empieza con «${atom.concepto.charAt(0)}».`,
    }),
    grade: (answer) => {
      const parsed = quienSoyAnswerSchema.safeParse(answer);
      const review = buildReview(payload, parsed.success ? parsed.data : null, solution);
      return {
        correct: review.isCorrect,
        timedOut: review.given === null,
        explanation: `Era ${atom.concepto}. Lo adivinaste con ${review.cluesSeen} de ${clues.length} pistas.`,
      };
    },
  };
}
