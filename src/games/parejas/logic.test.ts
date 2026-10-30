import { describe, expect, it } from "vitest";
import { parejasAnswerFixture, parejasPayloadFixture, parejasSolutionFixture } from "./fixtures";
import {
  EMPTY_BOARD,
  buildReview,
  conceptIndex,
  countCorrect,
  isBoardComplete,
  selectTile,
  toAnswer,
  withHint,
  type BoardState,
} from "./logic";
import type { Pair } from "./schema";

const pick = (...steps: [Parameters<typeof selectTile>[1], string][]): BoardState =>
  steps.reduce((board, [side, id]) => selectTile(board, side, id), EMPTY_BOARD);

describe("selectTile", () => {
  it("selecciona una ficha y la deselecciona al tocarla de nuevo", () => {
    const selected = pick(["concept", "c-mitosis"]);
    expect(selected.selection).toEqual({ side: "concept", id: "c-mitosis" });
    expect(selectTile(selected, "concept", "c-mitosis").selection).toBeNull();
  });

  it("cambia la selección dentro del mismo lado", () => {
    const board = pick(["concept", "c-mitosis"], ["concept", "c-meiosis"]);
    expect(board.selection).toEqual({ side: "concept", id: "c-meiosis" });
    expect(board.pairs).toHaveLength(0);
  });

  it("forma un par en cualquier orden: concepto→definición o definición→concepto", () => {
    expect(pick(["concept", "c-mitosis"], ["definition", "d-mitosis"]).pairs).toEqual([
      { conceptId: "c-mitosis", definitionId: "d-mitosis" },
    ]);
    expect(pick(["definition", "d-meiosis"], ["concept", "c-meiosis"]).pairs).toEqual([
      { conceptId: "c-meiosis", definitionId: "d-meiosis" },
    ]);
  });

  it("tocar una ficha unida suelta el par y la deja seleccionada", () => {
    const board = pick(["concept", "c-mitosis"], ["definition", "d-mitosis"], ["definition", "d-mitosis"]);
    expect(board.pairs).toHaveLength(0);
    expect(board.selection).toEqual({ side: "definition", id: "d-mitosis" });
  });

  it("no permite tocar las fichas del par fijado por la pista", () => {
    const locked: Pair = { conceptId: "c-anafase", definitionId: "d-anafase" };
    const board = selectTile(EMPTY_BOARD, "concept", "c-anafase", locked);
    expect(board).toBe(EMPTY_BOARD);
  });
});

describe("withHint", () => {
  it("el par de la pista reemplaza a los pares que usan sus fichas", () => {
    const pairs: Pair[] = [
      { conceptId: "c-anafase", definitionId: "d-mitosis" },
      { conceptId: "c-meiosis", definitionId: "d-meiosis" },
    ];
    const hint: Pair = { conceptId: "c-mitosis", definitionId: "d-mitosis" };
    expect(withHint(pairs, hint)).toEqual([hint, { conceptId: "c-meiosis", definitionId: "d-meiosis" }]);
  });

  it("sin pista devuelve los mismos pares", () => {
    const pairs: Pair[] = [{ conceptId: "a", definitionId: "b" }];
    expect(withHint(pairs, null)).toBe(pairs);
  });
});

describe("tablero", () => {
  it("está completo cuando hay un par por concepto", () => {
    expect(isBoardComplete(parejasAnswerFixture.pairs, parejasPayloadFixture)).toBe(false);
    expect(isBoardComplete(parejasSolutionFixture, parejasPayloadFixture)).toBe(true);
  });

  it("toAnswer deja solo los ids", () => {
    expect(toAnswer(parejasSolutionFixture).pairs[0]).toEqual({
      conceptId: "c-mitosis",
      definitionId: "d-mitosis",
    });
  });

  it("conceptIndex da la posición del concepto en el tablero", () => {
    expect(conceptIndex(parejasPayloadFixture, "c-citocinesis")).toBe(2);
  });
});

describe("buildReview", () => {
  it("marca pares correctos, cruzados y sin unir", () => {
    const review = buildReview(parejasPayloadFixture, parejasAnswerFixture, parejasSolutionFixture);
    expect(review.map((item) => item.isCorrect)).toEqual([true, false, false, false]);
    expect(review[1]?.chosenDefinition).toBe("División del citoplasma al final de la división celular.");
    expect(review[3]?.chosenDefinition).toBeNull();
    expect(countCorrect(review)).toBe(1);
  });
});
