import type { Difficulty } from "../types";
import type { Pair, ParejasAnswer, ParejasPayload, ParejasSolution } from "./schema";

/** §12: dificultad progresiva. El backend arma el reto; el frontend usa lo que llega. */
export const PAREJAS_LEVELS: Record<Difficulty, { pairs: number; seconds: number }> = {
  1: { pairs: 3, seconds: 45 },
  2: { pairs: 4, seconds: 50 },
  3: { pairs: 5, seconds: 50 },
};

export type Side = "concept" | "definition";

export interface Selection {
  side: Side;
  id: string;
}

export interface BoardState {
  /** Pares formados por el estudiante (sin el de la pista). */
  pairs: Pair[];
  selection: Selection | null;
}

export const EMPTY_BOARD: BoardState = { pairs: [], selection: null };

const idOf = (pair: Pair, side: Side) => (side === "concept" ? pair.conceptId : pair.definitionId);

export function findPair(pairs: Pair[], side: Side, id: string): Pair | undefined {
  return pairs.find((pair) => idOf(pair, side) === id);
}

/**
 * Tocar una ficha:
 * - si está fija por la pista, no pasa nada;
 * - si ya estaba unida, se suelta ese par y la ficha queda seleccionada (para corregir);
 * - si hay una ficha seleccionada del otro lado, se forma el par;
 * - si no, se selecciona (o deselecciona si era la misma).
 */
export function selectTile(
  board: BoardState,
  side: Side,
  id: string,
  locked: Pair | null = null,
): BoardState {
  if (locked && idOf(locked, side) === id) return board;

  const existing = findPair(board.pairs, side, id);
  if (existing) {
    return { pairs: board.pairs.filter((pair) => pair !== existing), selection: { side, id } };
  }

  const { selection } = board;
  if (selection && selection.side !== side) {
    const pair: Pair =
      side === "concept"
        ? { conceptId: id, definitionId: selection.id }
        : { conceptId: selection.id, definitionId: id };
    return { pairs: [...board.pairs, pair], selection: null };
  }

  if (selection?.side === side && selection.id === id) return { ...board, selection: null };
  return { ...board, selection: { side, id } };
}

/** Une los pares del estudiante con el de la pista, que gana si alguna ficha se repite. */
export function withHint(pairs: Pair[], hint: Pair | null): Pair[] {
  if (!hint) return pairs;
  const free = pairs.filter(
    (pair) => pair.conceptId !== hint.conceptId && pair.definitionId !== hint.definitionId,
  );
  return [hint, ...free];
}

export function isBoardComplete(pairs: Pair[], payload: ParejasPayload): boolean {
  return pairs.length === payload.concepts.length;
}

export function toAnswer(pairs: Pair[]): ParejasAnswer {
  return { pairs: pairs.map(({ conceptId, definitionId }) => ({ conceptId, definitionId })) };
}

/** Índice del concepto en el tablero: define su categoría (color + forma) y su atajo. */
export function conceptIndex(payload: ParejasPayload, conceptId: string): number {
  return payload.concepts.findIndex((concept) => concept.id === conceptId);
}

export interface ParejasReviewItem {
  conceptText: string;
  categoryIndex: number;
  correctDefinition: string;
  chosenDefinition: string | null;
  explanation: string;
  isCorrect: boolean;
}

export function buildReview(
  payload: ParejasPayload,
  answer: ParejasAnswer | null,
  solution: ParejasSolution,
): ParejasReviewItem[] {
  const definitionText = (id: string | undefined) =>
    payload.definitions.find((definition) => definition.id === id)?.text ?? null;

  return payload.concepts.flatMap((concept, index) => {
    const expected = solution.find((pair) => pair.conceptId === concept.id);
    if (!expected) return [];
    const chosen = answer?.pairs.find((pair) => pair.conceptId === concept.id);
    return [
      {
        conceptText: concept.text,
        categoryIndex: index,
        correctDefinition: definitionText(expected.definitionId) ?? "",
        chosenDefinition: definitionText(chosen?.definitionId),
        explanation: expected.explanation,
        isCorrect: chosen?.definitionId === expected.definitionId,
      },
    ];
  });
}

export function countCorrect(items: ParejasReviewItem[]): number {
  return items.filter((item) => item.isCorrect).length;
}
