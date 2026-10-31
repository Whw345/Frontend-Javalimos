import { describe, expect, it } from "vitest";
import { computeStars } from "./stars";

describe("computeStars", () => {
  const base = { correct: true, hintUsed: false, elapsedMs: 10_000, totalMs: 48_000 };

  it("da 3 estrellas a un acierto rápido sin pista", () => {
    expect(computeStars(base)).toBe(3);
  });

  it("da 2 estrellas a un acierto lento sin pista", () => {
    expect(computeStars({ ...base, elapsedMs: 40_000 })).toBe(2);
  });

  it("da 1 estrella a un acierto con pista, aunque sea rápido", () => {
    expect(computeStars({ ...base, hintUsed: true })).toBe(1);
  });

  it("da 0 estrellas si no acertó", () => {
    expect(computeStars({ ...base, correct: false })).toBe(0);
  });
});
