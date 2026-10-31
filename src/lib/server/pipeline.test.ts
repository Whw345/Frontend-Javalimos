import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import { extractPdf } from "./pdf";
import { suggestWeeks, weeksSchema } from "./materials";
import { buildChallenge, generateForContext } from "./generation";
import { gradeAnswer, publicSession } from "./challenges";
import { huecoPayloadSchema } from "@/games/hueco/schema";
import { parejasSolutionSchema } from "@/games/parejas/schema";
import { ordenaSolutionSchema } from "@/games/ordena/schema";

const generated = {
  game: "hueco",
  before: "La ",
  after: " produce ATP mediante la respiracion celular.",
  answer: "mitocondria",
  distractors: ["membrana", "pared celular"],
  explanation: "La mitocondria produce ATP mediante la respiracion celular.",
  sourceId: "theory-1",
  evidence: "La mitocondria produce ATP mediante la respiracion celular.",
};
const recommendations = [
  {
    rank: 1,
    template: "fill_blank",
    difficulty: 1,
    score: 0.9,
    confidenceLevel: "high",
    reason: "Definicion explicita.",
  },
  {
    rank: 2,
    template: "matching",
    difficulty: 1,
    score: 0.8,
    confidenceLevel: "high",
    reason: "Conceptos y funciones.",
  },
  {
    rank: 3,
    template: "ordering",
    difficulty: 2,
    score: 0.6,
    confidenceLevel: "low",
    reason: "Requiere secuencia.",
  },
];
export async function fixture(name: string) {
  return new File([await readFile(new URL(`../../../fixtures/${name}`, import.meta.url))], name, {
    type: "application/pdf",
  });
}

describe("PDF to playable challenge pipeline", () => {
  it("extracts actual PDFs, proposes weeks, generates using the existing decision module and grades without exposing solutions", async () => {
    const syllabus = await extractPdf(await fixture("silabo.pdf"));
    const markdown = await extractPdf(await fixture("teoria.pdf"));
    const weeks = weeksSchema.parse(suggestWeeks(syllabus));
    expect(weeks.map((week) => week.weekNumber)).toEqual([1, 2]);
    expect(weeks.every((week) => week.startsOn === null)).toBe(true);
    expect(markdown).toContain("mitocondria");
    const decisionModel = { complete: vi.fn().mockResolvedValue({ recommendations }) };
    const generate = vi.fn().mockResolvedValue({ challenge: generated });
    const challenge = await generateForContext(
      {
        courseId: "bio-101",
        weekNumber: 1,
        topic: weeks[0]!.topic,
        markdown,
        sources: [{ id: "theory-1", filename: "teoria.pdf", markdown }],
      },
      decisionModel,
      { generate },
    );
    expect(decisionModel.complete).toHaveBeenCalledOnce();
    expect(generate).toHaveBeenCalledOnce();
    const session = publicSession(
      {
        id: "session",
        course_id: "bio-101",
        week_number: 1,
        started_at: new Date().toISOString(),
        deadline: new Date(Date.now() + 20_000).toISOString(),
      },
      challenge,
    );
    expect(session).not.toHaveProperty("solution");
    expect(session).not.toHaveProperty("evidence");
    const payload = huecoPayloadSchema.parse(session.payload);
    const correct = payload.options.find((option) => option.text === "mitocondria")!;
    expect(gradeAnswer("hueco", challenge.solution, { optionId: correct.id })).toBe(true);
    expect(gradeAnswer("hueco", challenge.solution, { optionId: "wrong" })).toBe(false);
    expect(challenge.source).toEqual({ documento: "teoria.pdf" });
  });

  it("rejects invalid, oversized, damaged and empty PDFs", async () => {
    await expect(
      extractPdf(new File(["fake"], "file.pdf", { type: "application/pdf" })),
    ).rejects.toMatchObject({ code: "INVALID_PDF" });
    await expect(
      extractPdf(new File(["%PDF-invalid"], "file.pdf", { type: "application/pdf" })),
    ).rejects.toMatchObject({ code: "PDF_EXTRACTION_FAILED" });
    await expect(
      extractPdf(new File([new Uint8Array(10 * 1024 * 1024 + 1)], "big.pdf", { type: "application/pdf" })),
    ).rejects.toMatchObject({ code: "INVALID_SIZE" });
    await expect(extractPdf(await fixture("vacio.pdf"))).rejects.toMatchObject({ code: "EMPTY_PDF" });
    await expect(extractPdf(new File(["text"], "file.txt", { type: "text/plain" }))).rejects.toMatchObject({
      code: "INVALID_PDF",
    });
  });

  it("rejects ambiguous choices and validates matching and ordering solutions", () => {
    expect(() => buildChallenge({ ...generated, distractors: ["mitocondria", "otro"] })).toThrow("duplicate");
    const pairs = buildChallenge({
      ...generated,
      game: "parejas",
      pairs: [
        { concept: "A", definition: "Uno" },
        { concept: "B", definition: "Dos" },
        { concept: "C", definition: "Tres" },
      ],
    });
    expect(gradeAnswer("parejas", pairs.solution, { pairs: pairs.solution })).toBe(true);
    const pairSolution = parejasSolutionSchema.parse(pairs.solution);
    expect(
      gradeAnswer("parejas", pairs.solution, { pairs: [pairSolution[0], pairSolution[0], pairSolution[0]] }),
    ).toBe(false);
    const order = buildChallenge({
      ...generated,
      game: "ordena",
      steps: ["Inicio", "Segundo", "Tercero", "Final"],
    });
    const orderSolution = ordenaSolutionSchema.parse(order.solution);
    expect(gradeAnswer("ordena", order.solution, { order: orderSolution.order })).toBe(true);
    expect(gradeAnswer("ordena", order.solution, { order: [...orderSolution.order].reverse() })).toBe(false);
  });

  it("retries unsupported evidence and rejects invented source content", async () => {
    const generate = vi
      .fn()
      .mockResolvedValue({ challenge: { ...generated, evidence: "Esta cita nunca aparece en la fuente." } });
    await expect(
      generateForContext(
        {
          courseId: "bio",
          weekNumber: 1,
          topic: "Celulas",
          markdown: "Material real",
          sources: [{ id: "theory-1", filename: "teoria.pdf", markdown: "Material real" }],
        },
        { complete: async () => ({ recommendations }) },
        { generate },
      ),
    ).rejects.toThrow("evidence");
    expect(generate).toHaveBeenCalledTimes(2);
  });
});
