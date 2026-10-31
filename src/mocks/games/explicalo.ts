import { EXPLICALO_LEVELS } from "@/games/explicalo/logic";
import {
  explicaloAnswerSchema,
  type ExplicaloPayload,
  type ExplicaloSolution,
} from "@/games/explicalo/schema";
import type { Atom, Difficulty } from "@/games/types";
import { shuffle } from "../random";
import { keywordsOf, mentions, normalize, type Idea } from "../text";
import type { MockChallenge } from "../types";

const MIN_RATIO = 0.5;

/** Ideas clave = palabras con contenido de la definición (sin el propio concepto). */
function keywords(atom: Atom): Idea[] {
  return keywordsOf(atom.definicion, atom.concepto);
}

/**
 * Sustituto del LLM del backend: compara la explicación con la `definicion` por ideas clave.
 * Solo para la demo sin backend; el contrato (solution + explanation) es el mismo.
 */
export function createExplicaloChallenge(atoms: Atom[], difficulty: Difficulty): MockChallenge {
  const { seconds, maxChars } = EXPLICALO_LEVELS[difficulty];
  const atom = shuffle(atoms)[0]!;
  const ideas = keywords(atom);

  const payload: ExplicaloPayload = { concept: atom.concepto, maxChars };

  const labels = (list: Idea[]) => list.map((idea) => idea.label);
  let lastSolution: ExplicaloSolution = { reference: atom.definicion, matched: [], missing: labels(ideas) };

  return {
    payload,
    get solution() {
      return lastSolution;
    },
    durationMs: seconds * 1000,
    gradingDelayMs: 1500,
    source: { documento: atom.fuente.documento, pagina: atom.fuente.pagina },
    hint: () => ({ text: `Usa ideas como «${labels(ideas.slice(0, 2)).join("» o «")}».` }),
    grade: (answer) => {
      const parsed = explicaloAnswerSchema.safeParse(answer);
      const text = normalize(parsed.success ? parsed.data.text : "");
      const matched = ideas.filter((idea) => mentions(text, idea.key));
      const missing = ideas.filter((idea) => !matched.includes(idea));
      lastSolution = { reference: atom.definicion, matched: labels(matched), missing: labels(missing) };
      const correct =
        text.trim() !== "" && matched.length >= Math.max(2, Math.ceil(ideas.length * MIN_RATIO));
      return {
        correct,
        timedOut: text.trim() === "",
        explanation: correct
          ? `Tu explicación recoge las ideas clave de ${atom.concepto}.`
          : `Te faltaron ideas clave. Compárala con lo que dice el material.`,
      };
    },
  };
}
