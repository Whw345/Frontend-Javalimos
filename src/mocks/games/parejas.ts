import { PAREJAS_LEVELS, buildReview, countCorrect } from "@/games/parejas/logic";
import { parejasAnswerSchema, type ParejasPayload, type ParejasSolution } from "@/games/parejas/schema";
import type { Atom, Difficulty } from "@/games/types";
import { shuffle } from "../random";
import type { MockChallenge } from "../types";

/** Quita el término de su propia definición para no regalar la respuesta. */
function maskConcept(definicion: string, concepto: string): string {
  const escaped = concepto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return definicion.replace(new RegExp(escaped, "gi"), "____");
}

/** Simula al backend: N átomos → conceptos y definiciones barajados por separado. */
export function createParejasChallenge(atoms: Atom[], difficulty: Difficulty): MockChallenge {
  const { pairs, seconds } = PAREJAS_LEVELS[difficulty];
  const picked = shuffle(atoms).slice(0, pairs);

  const items = picked.map((atom) => ({
    atom,
    concept: { id: crypto.randomUUID(), text: atom.concepto },
    definition: { id: crypto.randomUUID(), text: maskConcept(atom.definicion, atom.concepto) },
  }));

  const payload: ParejasPayload = {
    concepts: shuffle(items).map((item) => item.concept),
    definitions: shuffle(items).map((item) => item.definition),
  };
  const solution: ParejasSolution = items.map((item) => ({
    conceptId: item.concept.id,
    definitionId: item.definition.id,
    explanation: item.atom.definicion,
  }));

  return {
    payload,
    solution,
    durationMs: seconds * 1000,
    source: { documento: picked[0]!.fuente.documento, pagina: picked[0]!.fuente.pagina },
    // La pista revela un par correcto, que el tablero deja fijo.
    hint: () => {
      const pair = shuffle(solution)[0]!;
      return { conceptId: pair.conceptId, definitionId: pair.definitionId };
    },
    grade: (answer) => {
      const parsed = parejasAnswerSchema.safeParse(answer);
      const review = buildReview(payload, parsed.success ? parsed.data : null, solution);
      const correctCount = countCorrect(review);
      const paired = parsed.success ? parsed.data.pairs.length : 0;
      return {
        correct: correctCount === review.length,
        timedOut: paired < review.length,
        explanation: `Uniste bien ${correctCount} de ${review.length} parejas.`,
      };
    },
  };
}
