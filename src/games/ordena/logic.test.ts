import { describe, expect, it } from "vitest";
import { ordenaAnswerFixture, ordenaPayloadFixture, ordenaSolutionFixture } from "./fixtures";
import { buildReview, countCorrect, initialOrder, moveStep } from "./logic";

describe("moveStep", () => {
  const order = ["a", "b", "c", "d"];

  it("mueve hacia abajo y hacia arriba", () => {
    expect(moveStep(order, 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(moveStep(order, 3, 0)).toEqual(["d", "a", "b", "c"]);
  });

  it("no cambia nada con índices iguales o fuera de rango", () => {
    expect(moveStep(order, 1, 1)).toBe(order);
    expect(moveStep(order, -1, 2)).toBe(order);
    expect(moveStep(order, 0, 4)).toBe(order);
  });

  it("no muta el arreglo original", () => {
    moveStep(order, 0, 3);
    expect(order).toEqual(["a", "b", "c", "d"]);
  });
});

describe("initialOrder", () => {
  it("respeta el orden en que llegan los pasos", () => {
    expect(initialOrder(ordenaPayloadFixture)).toEqual([
      "s-anafase",
      "s-profase",
      "s-telofase",
      "s-metafase",
    ]);
  });
});

describe("buildReview", () => {
  it("indica la posición correcta y la elegida de cada paso", () => {
    const review = buildReview(ordenaPayloadFixture, ordenaAnswerFixture, ordenaSolutionFixture);
    expect(review.map((item) => item.isCorrect)).toEqual([true, false, false, true]);
    expect(review[1]).toMatchObject({ position: 2, chosenPosition: 3 });
    expect(countCorrect(review)).toBe(2);
  });

  it("sin respuesta, nada está en su lugar", () => {
    const review = buildReview(ordenaPayloadFixture, null, ordenaSolutionFixture);
    expect(review.every((item) => item.chosenPosition === null)).toBe(true);
  });
});
