import { EXPLICALO_LEVELS } from "@/games/explicalo/logic";
import {
  explicaloAnswerSchema,
  type ExplicaloPayload,
  type ExplicaloSolution,
} from "@/games/explicalo/schema";
import type { Atom, Difficulty } from "@/games/types";
import { shuffle } from "../random";
import type { MockChallenge } from "../types";

const STOPWORDS = new Set([
  "para",
  "sobre",
  "entre",
  "desde",
  "hasta",
  "cada",
  "como",
  "durante",
  "final",
  "también",
]);
const MIN_RATIO = 0.5;

// Quita tildes (y la de la ñ): se aplica igual a la respuesta y a la referencia.
const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

interface Idea {
  /** Forma normalizada, para comparar. */
  key: string;
  /** Palabra tal como aparece en el material, para mostrar. */
  label: string;
}

/** Ideas clave = palabras con contenido de la definición (sin el propio concepto). */
function keywords(atom: Atom): Idea[] {
  const concept = new Set(normalize(atom.concepto).split(/\s+/));
  const ideas = new Map<string, Idea>();
  for (const word of atom.definicion.toLowerCase().match(/\p{L}{5,}/gu) ?? []) {
    const key = normalize(word);
    if (!STOPWORDS.has(key) && !concept.has(key) && !ideas.has(key)) ideas.set(key, { key, label: word });
  }
  return [...ideas.values()];
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
      // Raíz de la palabra: acepta plurales y variaciones cortas ("célula" / "células").
      const matched = ideas.filter((idea) =>
        text.includes(idea.key.slice(0, Math.max(5, idea.key.length - 2))),
      );
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
