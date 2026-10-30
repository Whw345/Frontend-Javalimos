import { describe, expect, it } from "vitest";
import { dosCajasAnswerFixture, dosCajasPayloadFixture, dosCajasSolutionFixture } from "./fixtures";
import { buildReview, countCorrect, createAnswer, isAnswerComplete, recordBox } from "./logic";

describe("respuesta", () => {
  it("empieza sin cajas elegidas", () => {
    const answer = createAnswer(dosCajasPayloadFixture);
    expect(answer.responses.every((response) => response.box === null)).toBe(true);
    expect(isAnswerComplete(answer)).toBe(false);
  });

  it("registra una caja una sola vez", () => {
    const once = recordBox(createAnswer(dosCajasPayloadFixture), "k-1", "a");
    expect(once.responses[0]?.box).toBe("a");
    expect(recordBox(once, "k-1", "b")).toBe(once);
    expect(recordBox(once, "no-existe", "b")).toBe(once);
  });

  it("está completa cuando todas las tarjetas tienen caja", () => {
    const answer = ["k-1", "k-2", "k-3"].reduce(
      (current, id) => recordBox(current, id, "b"),
      createAnswer(dosCajasPayloadFixture),
    );
    expect(isAnswerComplete(answer)).toBe(true);
  });
});

describe("buildReview", () => {
  it("marca aciertos, errores y tarjetas sin respuesta", () => {
    const review = buildReview(dosCajasPayloadFixture, dosCajasAnswerFixture, dosCajasSolutionFixture);
    expect(review.map((item) => item.isCorrect)).toEqual([true, false, false]);
    expect(review[2]?.chosen).toBeNull();
    expect(countCorrect(review)).toBe(1);
  });
});
