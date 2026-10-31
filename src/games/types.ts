import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";
import type { ZodType } from "zod";

export type GameSlug =
  | "desliza"
  | "parejas"
  | "ordena"
  | "dos-cajas"
  | "hueco"
  | "encuentra-error"
  | "quien-soy"
  | "intruso"
  | "cual-mayor";

export type Difficulty = 1 | 2 | 3;

export type GameAccent = `cat-${1 | 2 | 3 | 4 | 5}`;

/** Átomo de conocimiento generado por el backend desde los PDFs (§11.1). */
export interface Atom {
  id: string;
  concepto: string;
  definicion: string;
  confusiones: string[];
  pasos?: string[];
  categoria?: string;
  relacionados: string[];
  ejemplos?: string[];
  valor?: { cantidad: number; unidad: string; etiqueta: string };
  fuente: { documento: string; pagina?: number; fragmento: string };
  semana: number;
  dificultad: Difficulty;
}

export interface GameProps<TPayload, TAnswer> {
  /** Datos del reto, sin la solución. */
  payload: TPayload;
  difficulty: Difficulty;
  /** true cuando el tiempo terminó o la respuesta ya se envió. */
  disabled: boolean;
  hintRevealed: boolean;
  /** Dato de la pista que envía el servidor, si el juego lo usa. Cada juego lo valida con su schema. */
  hint: unknown;
  onAnswerChange: (answer: TAnswer | null, isComplete: boolean) => void;
  /** Para juegos que se envían solos al completar la interacción. */
  onSubmit: (answer: TAnswer) => void;
  /**
   * Juegos por rondas (ver `GameDefinition.getRounds`): índice de la ronda actual.
   * Lo controla el shell, que también lleva el temporizador de cada ronda.
   */
  round: number;
  /** Juegos por rondas: el jugador respondió la ronda actual. */
  onRoundComplete: () => void;
}

/** Props de la vista de revisión que el `FeedbackSheet` muestra tras responder. */
export interface ResultDetailProps<TPayload, TAnswer, TSolution> {
  payload: TPayload;
  answer: TAnswer | null;
  solution: TSolution;
}

export interface RoundTiming {
  rounds: number;
  secondsPerRound: number;
}

export interface GameShortcut {
  keys: string;
  label: string;
}

export interface GameDefinition<TPayload, TAnswer, TSolution = unknown> {
  slug: GameSlug;
  name: string;
  instruction: string;
  description: string;
  icon: LucideIcon;
  accent: GameAccent;
  /** Valida lo que llega del API. */
  payloadSchema: ZodType<TPayload>;
  /** Valida lo que se envía al API. */
  answerSchema: ZodType<TAnswer>;
  /** Valida `ChallengeResult.correctAnswer`, que llega solo después de responder. */
  solutionSchema: ZodType<TSolution>;
  /** "auto": se envía al completar la interacción (o al terminar la última ronda). */
  submitMode: "button" | "auto";
  /**
   * Si el juego tiene rondas con tiempo propio (Desliza, ¿Cuál es mayor?), el shell
   * muestra un temporizador por ronda en lugar del temporizador del reto.
   */
  getRounds?: (payload: TPayload) => RoundTiming;
  /** Atajos propios del juego para la leyenda bajo el área de juego (§11.5). */
  shortcuts: (payload: TPayload) => GameShortcut[];
  Component: ComponentType<GameProps<TPayload, TAnswer>>;
  ResultDetail?: ComponentType<ResultDetailProps<TPayload, TAnswer, TSolution>>;
}
