import { CUAL_MAYOR_LEVELS, buildReview, countCorrect } from "@/games/cual-mayor/logic";
import {
  cualMayorAnswerSchema,
  type CualMayorPayload,
  type CualMayorSolution,
} from "@/games/cual-mayor/schema";
import type { Atom, Difficulty } from "@/games/types";
import { shuffle } from "../random";
import type { MockChallenge } from "../types";

const PASSING_RATIO = 0.75;

/** Pares de átomos con `valor` de la misma `etiqueta` y cantidades distintas. */
export function createCualMayorChallenge(
  atoms: Atom[],
  questions: Record<string, string>,
  difficulty: Difficulty,
): MockChallenge {
  const { rounds: count, secondsPerRound } = CUAL_MAYOR_LEVELS[difficulty];
  const valued = atoms.filter((atom) => atom.valor);
  const pairs = valued.flatMap((a, i) =>
    valued
      .slice(i + 1)
      .filter((b) => b.valor!.etiqueta === a.valor!.etiqueta && b.valor!.cantidad !== a.valor!.cantidad)
      .map((b): [Atom, Atom] => (Math.random() < 0.5 ? [a, b] : [b, a])),
  );
  const picked = shuffle(pairs).slice(0, count);
  const format = (atom: Atom) => `${atom.valor!.cantidad} ${atom.valor!.unidad}`;

  const rounds = picked.map(([left, right]) => ({
    round: {
      id: crypto.randomUUID(),
      question: questions[left.valor!.etiqueta] ?? "¿Cuál es mayor?",
      left: { label: left.concepto },
      right: { label: right.concepto },
    },
    left,
    right,
  }));

  const payload: CualMayorPayload = { secondsPerRound, rounds: rounds.map((item) => item.round) };
  const solution: CualMayorSolution = rounds.map(({ round, left, right }) => ({
    roundId: round.id,
    choice: left.valor!.cantidad > right.valor!.cantidad ? "left" : "right",
    leftValue: format(left),
    rightValue: format(right),
  }));

  return {
    payload,
    solution,
    durationMs: rounds.length * (secondsPerRound * 1000 + 300),
    source: { documento: valued[0]!.fuente.documento, pagina: valued[0]!.fuente.pagina },
    hint: () => ({
      text: "La interfase ocupa casi todo el ciclo celular; un gameto tiene la mitad de cromosomas.",
    }),
    grade: (answer) => {
      const parsed = cualMayorAnswerSchema.safeParse(answer);
      const review = buildReview(payload, parsed.success ? parsed.data : null, solution);
      const correctCount = countCorrect(review);
      const needed = Math.ceil(review.length * PASSING_RATIO);
      return {
        correct: correctCount >= needed,
        timedOut: review.some((item) => item.chosen === null),
        explanation: `Acertaste ${correctCount} de ${review.length}. Necesitas ${needed} para sumar puntos.`,
      };
    },
  };
}
