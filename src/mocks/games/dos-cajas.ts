import { DOS_CAJAS_LEVELS, buildReview, countCorrect } from "@/games/dos-cajas/logic";
import { dosCajasAnswerSchema, type DosCajasPayload, type DosCajasSolution } from "@/games/dos-cajas/schema";
import type { Atom, Difficulty } from "@/games/types";
import { shuffle } from "../random";
import type { MockChallenge } from "../types";

const PASSING_RATIO = 0.75;

/** Átomos con la misma propiedad (`categoria`) repartidos en dos cajas. */
export function createDosCajasChallenge(
  atoms: Atom[],
  boxes: { a: string; b: string },
  difficulty: Difficulty,
): MockChallenge {
  const { cards: count, secondsPerCard } = DOS_CAJAS_LEVELS[difficulty];
  const picked = shuffle(atoms.filter((atom) => atom.categoria)).slice(0, count);
  const items = picked.map((atom) => ({ atom, card: { id: crypto.randomUUID(), text: atom.concepto } }));

  const payload: DosCajasPayload = { boxes, secondsPerCard, cards: items.map((item) => item.card) };
  const solution: DosCajasSolution = items.map(({ atom, card }) => {
    const box = atom.categoria === boxes.a ? "a" : "b";
    return { cardId: card.id, box, explanation: `Es propio de la ${boxes[box].toLowerCase()}.` };
  });

  return {
    payload,
    solution,
    durationMs: count * (secondsPerCard * 1000 + 300),
    source: { documento: picked[0]!.fuente.documento, pagina: picked[0]!.fuente.pagina },
    hint: () => ({ text: "La mitosis copia la célula; la meiosis forma gametos con dos divisiones." }),
    grade: (answer) => {
      const parsed = dosCajasAnswerSchema.safeParse(answer);
      const review = buildReview(payload, parsed.success ? parsed.data : null, solution);
      const correctCount = countCorrect(review);
      const needed = Math.ceil(review.length * PASSING_RATIO);
      return {
        correct: correctCount >= needed,
        timedOut: review.some((item) => item.chosen === null),
        explanation: `Clasificaste bien ${correctCount} de ${review.length}. Necesitas ${needed} para sumar puntos.`,
      };
    },
  };
}
