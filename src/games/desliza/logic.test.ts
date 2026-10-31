import { describe, expect, it } from "vitest";
import { deslizaAnswerFixture, deslizaPayloadFixture, deslizaSolutionFixture } from "./fixtures";
import {
  MAX_TILT_DEG,
  buildReview,
  countAnswered,
  countCorrect,
  createAnswer,
  isAnswerComplete,
  recordVerdict,
  resolveSwipe,
  swipeProgress,
  tiltForOffset,
} from "./logic";

const WIDTH = 400;

describe("resolveSwipe", () => {
  it("confirma verdadero al pasar el 35 % a la derecha", () => {
    expect(resolveSwipe(140, WIDTH)).toBe(true);
  });

  it("confirma falso al pasar el 35 % a la izquierda", () => {
    expect(resolveSwipe(-141, WIDTH)).toBe(false);
  });

  it("vuelve al centro si no llega al umbral y no es un flick", () => {
    expect(resolveSwipe(120, WIDTH)).toBeNull();
    expect(resolveSwipe(-60, WIDTH, -200)).toBeNull();
  });

  it("acepta un flick rápido con recorrido mínimo en la misma dirección", () => {
    expect(resolveSwipe(60, WIDTH, 1200)).toBe(true);
    expect(resolveSwipe(-60, WIDTH, -1200)).toBe(false);
  });

  it("ignora un flick en dirección contraria al arrastre o demasiado corto", () => {
    expect(resolveSwipe(60, WIDTH, -1200)).toBeNull();
    expect(resolveSwipe(20, WIDTH, 1200)).toBeNull();
  });

  it("no decide si la tarjeta no tiene ancho medido", () => {
    expect(resolveSwipe(500, 0)).toBeNull();
  });
});

describe("tiltForOffset y swipeProgress", () => {
  it("inclina como máximo 12°", () => {
    expect(tiltForOffset(WIDTH * 3, WIDTH)).toBe(MAX_TILT_DEG);
    expect(tiltForOffset(-WIDTH * 3, WIDTH)).toBe(-MAX_TILT_DEG);
    expect(tiltForOffset(WIDTH / 2, WIDTH)).toBeCloseTo(MAX_TILT_DEG / 2);
  });

  it("el progreso llega a ±1 justo en el umbral de confirmación", () => {
    expect(swipeProgress(140, WIDTH)).toBe(1);
    expect(swipeProgress(-70, WIDTH)).toBeCloseTo(-0.5);
    expect(swipeProgress(0, WIDTH)).toBe(0);
  });
});

describe("respuesta", () => {
  it("crea una respuesta vacía por cada afirmación", () => {
    const answer = createAnswer(deslizaPayloadFixture);
    expect(answer.responses).toHaveLength(deslizaPayloadFixture.statements.length);
    expect(countAnswered(answer)).toBe(0);
    expect(isAnswerComplete(answer)).toBe(false);
  });

  it("registra un veredicto sin mutar la respuesta anterior", () => {
    const empty = createAnswer(deslizaPayloadFixture);
    const next = recordVerdict(empty, "st-1", true, 1234.6);
    expect(empty.responses[0]?.verdict).toBeNull();
    expect(next.responses[0]).toEqual({ statementId: "st-1", verdict: true, elapsedMs: 1235 });
  });

  it("no permite cambiar una carta ya respondida ni ids desconocidos", () => {
    const once = recordVerdict(createAnswer(deslizaPayloadFixture), "st-1", true, 1000);
    expect(recordVerdict(once, "st-1", false, 2000)).toBe(once);
    expect(recordVerdict(once, "no-existe", false, 2000)).toBe(once);
  });

  it("está completa cuando todas las cartas tienen veredicto", () => {
    const complete = deslizaPayloadFixture.statements.reduce(
      (answer, statement) => recordVerdict(answer, statement.id, true, 500),
      createAnswer(deslizaPayloadFixture),
    );
    expect(isAnswerComplete(complete)).toBe(true);
  });
});

describe("buildReview", () => {
  it("marca aciertos, errores y cartas sin respuesta", () => {
    const review = buildReview(deslizaPayloadFixture, deslizaAnswerFixture, deslizaSolutionFixture);
    expect(review.map((item) => item.isCorrect)).toEqual([true, true, false, true, true, false]);
    expect(review[5]?.verdict).toBeNull();
    expect(countCorrect(review)).toBe(4);
  });

  it("trata una respuesta nula como todo sin responder", () => {
    const review = buildReview(deslizaPayloadFixture, null, deslizaSolutionFixture);
    expect(countCorrect(review)).toBe(0);
  });
});
