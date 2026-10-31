import { DESLIZA_LEVELS, buildReview, countCorrect } from "@/games/desliza/logic";
import { deslizaAnswerSchema, type DeslizaPayload, type DeslizaSolution } from "@/games/desliza/schema";
import type { Atom, Difficulty } from "@/games/types";
import { shuffle } from "../random";
import type { MockChallenge } from "../types";

/** Regla del mock (a definir con backend): el reto cuenta como correcto con ≥ 75 % de aciertos. */
const PASSING_RATIO = 0.75;

/**
 * Simula lo que haría el backend: toma átomos de la semana y arma afirmaciones
 * verdaderas (`definicion`) y falsas (`confusiones`), mitad y mitad.
 */
export function createDeslizaChallenge(atoms: Atom[], difficulty: Difficulty): MockChallenge {
  const { cards, secondsPerCard } = DESLIZA_LEVELS[difficulty];
  const picked = shuffle(atoms).slice(0, cards);
  const trueCount = Math.ceil(cards / 2);

  const items = picked.map((atom, index) => {
    const isTrue = index < trueCount;
    const text = isTrue ? atom.definicion : shuffle(atom.confusiones)[0]!;
    return {
      statement: { id: crypto.randomUUID(), text, concepto: atom.concepto },
      solution: {
        isTrue,
        explanation: isTrue
          ? `Verdadera: así lo dice el material, p. ${atom.fuente.pagina}.`
          : `Falsa: ${atom.definicion}`,
      },
      atom,
    };
  });
  const ordered = shuffle(items);

  const payload: DeslizaPayload = {
    secondsPerCard,
    statements: ordered.map((item) => item.statement),
  };
  const solution: DeslizaSolution = ordered.map((item) => ({
    statementId: item.statement.id,
    ...item.solution,
  }));

  return {
    payload,
    solution,
    // Holgura de 300 ms por carta para las animaciones entre una y otra.
    durationMs: cards * (secondsPerCard * 1000 + 300),
    source: { documento: picked[0]!.fuente.documento, pagina: picked[0]!.fuente.pagina },
    grade: (answer) => {
      const parsed = deslizaAnswerSchema.safeParse(answer);
      const review = buildReview(payload, parsed.success ? parsed.data : null, solution);
      const correctCount = countCorrect(review);
      const unanswered = review.filter((item) => item.verdict === null).length;
      return {
        correct: correctCount >= Math.ceil(review.length * PASSING_RATIO),
        timedOut: unanswered > 0,
        explanation: `Acertaste ${correctCount} de ${review.length} afirmaciones. Necesitas ${Math.ceil(
          review.length * PASSING_RATIO,
        )} para sumar puntos.`,
      };
    },
  };
}
