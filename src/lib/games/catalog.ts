import { z } from "zod";
import { copy } from "@/content/copy";
import { CUAL_MAYOR_LEVELS } from "@/games/cual-mayor/logic";
import { DESLIZA_LEVELS } from "@/games/desliza/logic";
import { DOS_CAJAS_LEVELS } from "@/games/dos-cajas/logic";
import { ENCUENTRA_ERROR_LEVELS } from "@/games/encuentra-error/logic";
import { HUECO_LEVELS } from "@/games/hueco/logic";
import { ORDENA_LEVELS } from "@/games/ordena/logic";
import { PAREJAS_LEVELS } from "@/games/parejas/logic";
import type { Difficulty, GameSlug } from "@/games/types";

/**
 * Parámetros de cada juego. Una sola definición alimenta al modelo de decisión (id y
 * descripción), al LLM de relleno ({ id, args }) y al formulario de edición del docente.
 */
export type ColumnField =
  | { name: string; label: string; description: string; kind: "text"; max: number }
  | { name: string; label: string; description: string; kind: "boolean" }
  | { name: string; label: string; description: string; kind: "choice"; options: readonly string[] };

export type ArgField =
  | { name: string; label: string; description: string; kind: "text"; max: number; long?: boolean }
  | { name: string; label: string; description: string; kind: "number"; min: number; max: number }
  | { name: string; label: string; description: string; kind: "boolean" }
  | {
      name: string;
      label: string;
      description: string;
      kind: "list";
      min: number;
      max: number;
      itemMax: number;
    }
  | {
      name: string;
      label: string;
      description: string;
      kind: "table";
      min: number;
      max: number;
      columns: ColumnField[];
    };

export interface CatalogGame {
  id: GameSlug;
  name: string;
  description: string;
  /** Cantidad pedida al LLM según el nivel, tomada de la dificultad progresiva (§12). */
  amount: (difficulty: Difficulty) => string;
  args: ArgField[];
  schema: z.ZodObject<z.ZodRawShape>;
}

const text = (max: number) => z.string().trim().min(1).max(max);
const explanationArg: ArgField = {
  name: "explanation",
  label: "Explicación",
  description: "Explicación de la solución, en 2 o 3 oraciones, que el estudiante ve al terminar.",
  kind: "text",
  max: 800,
  long: true,
};
const common = {
  explanation: z.string().trim().min(10).max(800),
  sourceId: z.string(),
  evidence: z.string().trim().min(10).max(1000),
};

function game(
  id: GameSlug,
  name: string,
  description: string,
  amount: CatalogGame["amount"],
  args: ArgField[],
  shape: z.ZodRawShape,
): CatalogGame {
  return {
    id,
    name,
    description,
    amount,
    args: [...args, explanationArg],
    schema: z.object({ ...shape, ...common }),
  };
}

export const gameCatalog: Record<GameSlug, CatalogGame> = {
  desliza: game(
    "desliza",
    copy.games.desliza.name,
    "El estudiante decide si afirmaciones breves son verdaderas o falsas. Sirve para hechos y conceptos que se pueden afirmar o desmentir en una frase.",
    (level) => `${DESLIZA_LEVELS[level].cards} afirmaciones, mezclando verdaderas y falsas`,
    [
      {
        name: "statements",
        label: "Afirmaciones",
        description: "Afirmaciones de una frase, verdaderas o falsas según el material.",
        kind: "table",
        min: 4,
        max: 8,
        columns: [
          { name: "text", label: "Afirmación", description: "La afirmación.", kind: "text", max: 240 },
          { name: "isTrue", label: "Es verdadera", description: "Si es verdadera.", kind: "boolean" },
          {
            name: "concept",
            label: "Tema",
            description: "Concepto de la afirmación.",
            kind: "text",
            max: 80,
          },
          {
            name: "explanation",
            label: "Explicación",
            description: "Por qué es verdadera o falsa.",
            kind: "text",
            max: 240,
          },
        ],
      },
    ],
    {
      statements: z
        .array(z.object({ text: text(240), isTrue: z.boolean(), concept: text(80), explanation: text(240) }))
        .min(4)
        .max(8),
    },
  ),
  parejas: game(
    "parejas",
    copy.games.parejas.name,
    "El estudiante une cada concepto con su definición. Sirve para vocabulario, clasificaciones y relaciones concepto-definición.",
    (level) => `${PAREJAS_LEVELS[level].pairs} pares`,
    [
      {
        name: "pairs",
        label: "Pares",
        description: "Pares inequívocos de concepto y definición.",
        kind: "table",
        min: 3,
        max: 5,
        columns: [
          { name: "concept", label: "Concepto", description: "El concepto.", kind: "text", max: 240 },
          { name: "definition", label: "Definición", description: "Su definición.", kind: "text", max: 240 },
        ],
      },
    ],
    {
      pairs: z
        .array(z.object({ concept: text(240), definition: text(240) }))
        .min(3)
        .max(5),
    },
  ),
  ordena: game(
    "ordena",
    copy.games.ordena.name,
    "El estudiante ordena pasos de un proceso. Solo sirve si el material describe una secuencia con un único orden explícito.",
    (level) => `${ORDENA_LEVELS[level].steps} pasos`,
    [
      {
        name: "steps",
        label: "Pasos en el orden correcto",
        description: "Pasos en su orden correcto, sin numeración que revele el orden.",
        kind: "list",
        min: 4,
        max: 6,
        itemMax: 240,
      },
    ],
    { steps: z.array(text(240)).min(4).max(6) },
  ),
  "dos-cajas": game(
    "dos-cajas",
    copy.games.dosCajas.name,
    "El estudiante clasifica tarjetas en dos categorías. Sirve para comparar dos ideas parecidas que el material distingue con claridad.",
    (level) => `${DOS_CAJAS_LEVELS[level].cards} tarjetas repartidas entre ambas cajas`,
    [
      {
        name: "boxA",
        label: "Caja A",
        description: "Nombre de la primera categoría.",
        kind: "text",
        max: 60,
      },
      {
        name: "boxB",
        label: "Caja B",
        description: "Nombre de la segunda categoría.",
        kind: "text",
        max: 60,
      },
      {
        name: "cards",
        label: "Tarjetas",
        description: "Tarjetas a clasificar.",
        kind: "table",
        min: 4,
        max: 10,
        columns: [
          { name: "text", label: "Tarjeta", description: "Texto de la tarjeta.", kind: "text", max: 200 },
          {
            name: "box",
            label: "Caja",
            description: "Caja correcta: a o b.",
            kind: "choice",
            options: ["a", "b"],
          },
          {
            name: "explanation",
            label: "Explicación",
            description: "Por qué va en esa caja.",
            kind: "text",
            max: 240,
          },
        ],
      },
    ],
    {
      boxA: text(60),
      boxB: text(60),
      cards: z
        .array(z.object({ text: text(200), box: z.enum(["a", "b"]), explanation: text(240) }))
        .min(4)
        .max(10),
    },
  ),
  hueco: game(
    "hueco",
    copy.games.hueco.name,
    "El estudiante completa una oración eligiendo el término que falta. Sirve para definiciones, fórmulas y terminología.",
    (level) => `${HUECO_LEVELS[level].options - 1} distractores`,
    [
      {
        name: "before",
        label: "Texto antes del hueco",
        description: "before + answer + after forma una oración verdadera.",
        kind: "text",
        max: 200,
      },
      {
        name: "answer",
        label: "Respuesta correcta",
        description: "Término que falta.",
        kind: "text",
        max: 80,
      },
      {
        name: "after",
        label: "Texto después del hueco",
        description: "Resto de la oración.",
        kind: "text",
        max: 200,
      },
      {
        name: "distractors",
        label: "Distractores",
        description: "Opciones incorrectas y distintas entre sí.",
        kind: "list",
        min: 2,
        max: 3,
        itemMax: 80,
      },
    ],
    {
      before: z.string().max(200),
      answer: text(80),
      after: z.string().max(200),
      distractors: z.array(text(80)).min(2).max(3),
    },
  ),
  "encuentra-error": game(
    "encuentra-error",
    copy.games.encuentraError.name,
    "El estudiante detecta la línea equivocada de una solución. Sirve para procedimientos, demostraciones o código con pasos verificables.",
    (level) => `${ENCUENTRA_ERROR_LEVELS[level].lines} líneas`,
    [
      {
        name: "lines",
        label: "Líneas",
        description: "Líneas de la solución sin numerarlas, con una sola línea incorrecta incluida.",
        kind: "list",
        min: 4,
        max: 6,
        itemMax: 200,
      },
      {
        name: "wrongLine",
        label: "Línea incorrecta",
        description: "Número de la línea incorrecta, contando desde 1.",
        kind: "number",
        min: 1,
        max: 6,
      },
      {
        name: "correctText",
        label: "Versión correcta",
        description: "Cómo debería decir la línea incorrecta.",
        kind: "text",
        max: 200,
      },
      {
        name: "monospace",
        label: "Es código",
        description: "true si las líneas son código.",
        kind: "boolean",
      },
    ],
    {
      lines: z.array(text(200)).min(4).max(6),
      wrongLine: z.number().int().min(1).max(6),
      correctText: text(200),
      monospace: z.boolean(),
    },
  ),
  "quien-soy": game(
    "quien-soy",
    copy.games.quienSoy.name,
    "El estudiante adivina un concepto a partir de pistas cada vez más claras. Sirve para conceptos con rasgos distintivos.",
    () => "4 pistas de la más vaga a la más clara",
    [
      {
        name: "clues",
        label: "Pistas",
        description: "Pistas de la más vaga a la más clara, sin mencionar la respuesta.",
        kind: "list",
        min: 3,
        max: 6,
        itemMax: 200,
      },
      { name: "answer", label: "Respuesta", description: "Concepto a adivinar.", kind: "text", max: 80 },
      {
        name: "distractors",
        label: "Distractores",
        description: "Tres conceptos del mismo tema distintos de la respuesta.",
        kind: "list",
        min: 3,
        max: 3,
        itemMax: 80,
      },
    ],
    {
      clues: z.array(text(200)).min(3).max(6),
      answer: text(80),
      distractors: z.array(text(80)).length(3),
    },
  ),
  intruso: game(
    "intruso",
    copy.games.intruso.name,
    "El estudiante detecta qué elemento no pertenece a un grupo. Sirve para categorías o familias de conceptos.",
    (level) => (level === 3 ? "un intruso cercano, del mismo tema" : "un intruso claramente ajeno al grupo"),
    [
      {
        name: "group",
        label: "Grupo",
        description: "Tres elementos que pertenecen a una misma categoría.",
        kind: "list",
        min: 3,
        max: 3,
        itemMax: 80,
      },
      {
        name: "intruder",
        label: "Intruso",
        description: "El elemento que no pertenece.",
        kind: "text",
        max: 80,
      },
    ],
    { group: z.array(text(80)).length(3), intruder: text(80) },
  ),
  "cual-mayor": game(
    "cual-mayor",
    copy.games.cualMayor.name,
    "El estudiante compara dos elementos y elige el mayor. Solo sirve si el material da magnitudes, cantidades o duraciones comparables.",
    (level) => `${CUAL_MAYOR_LEVELS[level].rounds} rondas`,
    [
      {
        name: "rounds",
        label: "Rondas",
        description: "Comparaciones con valores tomados del material.",
        kind: "table",
        min: 3,
        max: 8,
        columns: [
          { name: "question", label: "Pregunta", description: "Qué se compara.", kind: "text", max: 120 },
          { name: "left", label: "Izquierda", description: "Elemento izquierdo.", kind: "text", max: 80 },
          { name: "right", label: "Derecha", description: "Elemento derecho.", kind: "text", max: 80 },
          {
            name: "leftValue",
            label: "Valor izquierdo",
            description: "Valor del elemento izquierdo.",
            kind: "text",
            max: 60,
          },
          {
            name: "rightValue",
            label: "Valor derecho",
            description: "Valor del elemento derecho.",
            kind: "text",
            max: 60,
          },
          {
            name: "choice",
            label: "Mayor",
            description: "Cuál es mayor: left o right.",
            kind: "choice",
            options: ["left", "right"],
          },
        ],
      },
    ],
    {
      rounds: z
        .array(
          z.object({
            question: text(120),
            left: text(80),
            right: text(80),
            leftValue: text(60),
            rightValue: text(60),
            choice: z.enum(["left", "right"]),
          }),
        )
        .min(3)
        .max(8),
    },
  ),
};

export const catalogGames = Object.values(gameCatalog);

/** Forma { id, args } que recibe el LLM de relleno. */
export function gameRequest(id: GameSlug, difficulty: Difficulty) {
  const { args, amount } = gameCatalog[id];
  return {
    id,
    cantidad: amount(difficulty),
    args: [
      ...args.map(({ name, kind, description }) => ({ name, type: kind, description })),
      { name: "sourceId", type: "text", description: "id del documento que sustenta el juego." },
      { name: "evidence", type: "text", description: "Cita textual exacta de ese documento." },
    ],
  };
}
