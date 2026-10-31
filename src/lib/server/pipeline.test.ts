import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import { extractPdf } from "./pdf";
import { suggestWeeks, topicFromFilename, weeksSchema } from "./materials";
import { buildChallenge, generateForContext, isSupportedEvidence, spacedBlank } from "./generation";
import { gradeAnswer, gradeExplanation, publicSession } from "./challenges";
import { deslizaSolutionSchema } from "@/games/desliza/schema";
import { encuentraErrorPayloadSchema, encuentraErrorSolutionSchema } from "@/games/encuentra-error/schema";
import { huecoPayloadSchema } from "@/games/hueco/schema";
import type { GameSlug } from "@/games/types";
import { MAX_PDF_BYTES } from "@/lib/config";
import { gameCatalog } from "@/lib/games/catalog";
import { decisionAnswers } from "@/test/decisions";
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
const huecoArgs = Object.fromEntries(Object.entries(generated).filter(([key]) => key !== "game"));
/** Modelo de decisión de prueba: solo Hueco se marca como bueno. */
const onlyHueco = {
  ask: vi.fn(async () => decisionAnswers("hueco")),
};
const args = {
  explanation: "Explicacion suficientemente larga.",
  sourceId: "theory-1",
  evidence: "Cita del material.",
};
const allGames: Record<string, Record<string, unknown>> = {
  desliza: {
    statements: [1, 2, 3, 4].map((index) => ({
      text: `Afirmacion ${index}`,
      isTrue: index % 2 === 0,
      concept: "Celula",
      explanation: "Porque asi lo dice.",
    })),
  },
  parejas: {
    pairs: ["A", "B", "C"].map((key) => ({ concept: key, definition: `Definicion ${key}` })),
  },
  ordena: { steps: ["Uno", "Dos", "Tres", "Cuatro"] },
  "dos-cajas": {
    boxA: "Mitosis",
    boxB: "Meiosis",
    cards: [1, 2, 3, 4].map((index) => ({
      text: `Rasgo ${index}`,
      box: index % 2 ? "a" : "b",
      explanation: "Por definicion.",
    })),
  },
  hueco: {
    before: "La ",
    answer: "mitocondria",
    after: " produce ATP.",
    distractors: ["membrana", "nucleo"],
  },
  "encuentra-error": {
    lines: ["Paso 1", "Paso 2", "Paso 3", "Paso 4"],
    wrongLine: 3,
    correctText: "Paso correcto",
    monospace: false,
  },
  "quien-soy": {
    clues: ["Vaga", "Media", "Clara"],
    answer: "Mitocondria",
    distractors: ["Nucleo", "Ribosoma", "Lisosoma"],
  },
  intruso: { group: ["ATP", "ADP", "AMP"], intruder: "Pared celular" },
  "cual-mayor": {
    rounds: ["A", "B", "C"].map((key) => ({
      question: "¿Cual dura mas?",
      left: `${key}1`,
      right: `${key}2`,
      leftValue: "1 h",
      rightValue: "2 h",
      choice: "right",
    })),
  },
  explicalo: {
    concept: "Mitocondria",
    reference: "Organelo que produce ATP.",
    keyIdeas: ["ATP", "respiracion"],
  },
};
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
    const complete = vi.fn().mockResolvedValue({ hueco: huecoArgs });
    onlyHueco.ask.mockClear();
    const { games, decisions } = await generateForContext(
      {
        courseId: "bio-101",
        weekNumber: 1,
        topic: weeks[0]!.topic,
        markdown,
        sources: [{ id: "theory-1", filename: "teoria.pdf", markdown }],
      },
      onlyHueco,
      { complete, generate: vi.fn() },
    );
    expect(onlyHueco.ask).toHaveBeenCalledOnce();
    expect((onlyHueco.ask.mock.calls[0] as unknown as [string])[0]).toContain(markdown);
    expect(decisions.filter((decision) => decision.suitable).map(({ id }) => id)).toEqual(["hueco"]);
    expect(complete).toHaveBeenCalledOnce();
    const request = JSON.parse(complete.mock.calls[0]![2]);
    expect(request.games).toEqual([expect.objectContaining({ id: "hueco", args: expect.any(Array) })]);
    const challenge = games[0]!;
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
      extractPdf(new File([new Uint8Array(MAX_PDF_BYTES + 1)], "big.pdf", { type: "application/pdf" })),
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
    const complete = vi
      .fn()
      .mockResolvedValue({ hueco: { ...huecoArgs, evidence: "Esta cita nunca aparece en la fuente." } });
    await expect(
      generateForContext(
        {
          courseId: "bio",
          weekNumber: 1,
          topic: "Celulas",
          markdown: "Material real",
          sources: [{ id: "theory-1", filename: "teoria.pdf", markdown: "Material real" }],
        },
        onlyHueco,
        { complete, generate: vi.fn() },
      ),
    ).rejects.toThrow("evidence");
    expect(complete).toHaveBeenCalledTimes(2);
  });

  it("keeps the valid games and retries only the rejected ones", async () => {
    const markdown = `Material real. ${generated.evidence}`;
    const complete = vi
      .fn()
      .mockResolvedValueOnce({ hueco: huecoArgs, parejas: { ...huecoArgs, pairs: [] } })
      .mockResolvedValueOnce({
        parejas: { ...allGames.parejas, ...huecoArgs, evidence: generated.evidence },
      });
    const { games } = await generateForContext(
      {
        courseId: "bio",
        weekNumber: 1,
        topic: "Celulas",
        markdown,
        sources: [{ id: "theory-1", filename: "teoria.pdf", markdown }],
      },
      { ask: async () => decisionAnswers("hueco", "parejas") },
      { complete, generate: vi.fn() },
    );
    expect(games.map((game) => game.game)).toEqual(["hueco", "parejas"]);
    expect(complete).toHaveBeenCalledTimes(2);
    expect(Object.keys(JSON.parse(complete.mock.calls[1]![2]).games[0])).toContain("args");
    expect(JSON.parse(complete.mock.calls[1]![2]).games.map((game: { id: string }) => game.id)).toEqual([
      "parejas",
    ]);
  });

  it.each(Object.entries(allGames))("builds a playable %s without leaking its solution", (game, content) => {
    for (const difficulty of [1, 2, 3] as const) {
      const built = buildChallenge({ ...content, ...args, game }, difficulty);
      expect(gameCatalog[game as GameSlug].schema.safeParse({ ...content, ...args }).success).toBe(true);
      expect(built.timeLimitSeconds).toBeGreaterThan(0);
      expect(JSON.stringify(built.payload)).not.toContain("explanation");
      expect(JSON.stringify(built.payload)).not.toContain("isTrue");
    }
  });

  it("grades every round based game with the 75 % rule and the single answer games exactly", () => {
    const slide = deslizaSolutionSchema.parse(
      buildChallenge({ ...allGames.desliza, ...args, game: "desliza" }).solution,
    );
    const verdicts = (wrong: number) => ({
      responses: slide.map((item, index) => ({
        statementId: item.statementId,
        verdict: index < wrong ? !item.isTrue : item.isTrue,
        elapsedMs: 1,
      })),
    });
    expect(gradeAnswer("desliza", slide, verdicts(1))).toBe(true);
    expect(gradeAnswer("desliza", slide, verdicts(2))).toBe(false);
    const line = buildChallenge({ ...allGames["encuentra-error"], ...args, game: "encuentra-error" });
    const lineSolution = encuentraErrorSolutionSchema.parse(line.solution);
    const payload = encuentraErrorPayloadSchema.parse(line.payload);
    expect(lineSolution.lineId).toBe(payload.lines[2]!.id);
    expect(gradeAnswer("encuentra-error", line.solution, { lineId: lineSolution.lineId })).toBe(true);
    expect(gradeAnswer("encuentra-error", line.solution, { lineId: payload.lines[0]!.id })).toBe(false);
    const free = buildChallenge({ ...allGames["quien-soy"], ...args, game: "quien-soy" }, 3);
    expect(
      gradeAnswer("quien-soy", free.solution, { optionId: null, text: " mitocondria ", cluesSeen: 2 }),
    ).toBe(true);
  });

  it("evaluates an explanation after the attempt and ignores ideas outside the rubric", async () => {
    const solution = { reference: "Produce ATP.", keyIdeas: ["ATP", "respiracion"] };
    const generate = vi.fn().mockResolvedValue({ matched: ["ATP", "inventada"] });
    const graded = await gradeExplanation(solution, { text: "Hace ATP" }, { generate, complete: vi.fn() });
    expect(graded).toEqual({
      correct: true,
      solution: { reference: "Produce ATP.", matched: ["ATP"], missing: ["respiracion"] },
    });
    const blank = await gradeExplanation(solution, { text: "  " }, { generate, complete: vi.fn() });
    expect(blank.correct).toBe(false);
    expect(generate).toHaveBeenCalledOnce();
  });

  it("accepts several verbatim quotes but no invented or trivial fragment", () => {
    const source = "La mitosis produce dos celulas hijas.\nLa meiosis produce cuatro celulas.";
    expect(isSupportedEvidence("La mitosis produce dos celulas hijas.", source)).toBe(true);
    expect(isSupportedEvidence("La mitosis produce... La meiosis produce cuatro celulas...", source)).toBe(
      true,
    );
    expect(isSupportedEvidence("produce dos celulas hijas. La meiosis produce", source)).toBe(true);
    expect(isSupportedEvidence("Produce dos celulas hijas... LA MEIOSIS produce", source)).toBe(true);
    expect(isSupportedEvidence("La mitosis produce dos celulas... La meiosis produce cuatro.", source)).toBe(
      true,
    );
    const notAdjacent = "La difusion no gasta energia. La mitosis ocurre rapido. La meiosis ocurre lento.";
    expect(isSupportedEvidence("La difusion no gasta energia. La meiosis ocurre lento.", notAdjacent)).toBe(
      true,
    );
    expect(isSupportedEvidence("La mitosis ocurre en el citoplasma", source)).toBe(false);
    expect(
      isSupportedEvidence("La difusion no gasta energia. La meiosis es lenta y larga.", notAdjacent),
    ).toBe(false);
    expect(isSupportedEvidence("La mitosis produce... La meiosis produce ocho celulas.", source)).toBe(false);
    expect(isSupportedEvidence("La... La...", source)).toBe(false);
    expect(isSupportedEvidence("...", source)).toBe(false);
  });

  it("reads quotes through the formatting of real PDFs without accepting rewritten text", () => {
    const slide =
      "⦿ Es una “solución” a un problema\ncon consecuencias.\nHipótesis: ൝𝐻0: ∀ 𝑖, 𝑗 ∶ 𝑝𝑖𝑗= 𝑝𝑖. 𝑝.𝑗";
    expect(isSupportedEvidence("Es una solucion a un problema con consecuencias.", slide)).toBe(true);
    expect(isSupportedEvidence("Es una solución a un problema con consecuencias... H1: pij", slide)).toBe(
      true,
    );
    expect(isSupportedEvidence("Es una respuesta a un problema con consecuencias.", slide)).toBe(false);
  });

  it("keeps the sentence readable around the blank", () => {
    expect(spacedBlank("Ocurre en la ", "de la solucion.")).toEqual({
      before: "Ocurre en la ",
      after: " de la solucion.",
    });
    expect(spacedBlank("Se hace uso de", ".")).toEqual({ before: "Se hace uso de ", after: "." });
    expect(spacedBlank("", " es la clave.")).toEqual({ before: "", after: " es la clave." });
  });

  it("removes a drawn blank and the numbering the model adds", () => {
    expect(spacedBlank("eliminando los ______", "que separan.")).toEqual({
      before: "eliminando los ",
      after: " que separan.",
    });
    const line = buildChallenge({
      ...allGames["encuentra-error"],
      ...args,
      game: "encuentra-error",
      lines: ["1. Paso uno", "2) Paso dos", "3. Paso tres", "Paso 4"],
    });
    expect(encuentraErrorPayloadSchema.parse(line.payload).lines.map((item) => item.text)).toEqual([
      "Paso uno",
      "Paso dos",
      "Paso tres",
      "Paso 4",
    ]);
  });

  it("rejects a question that already shows its answer", () => {
    expect(() =>
      buildChallenge({ ...allGames.hueco, ...args, game: "hueco", before: "La mitocondria es la " }),
    ).toThrow("reveals");
    expect(() =>
      buildChallenge({
        ...allGames["quien-soy"],
        ...args,
        game: "quien-soy",
        clues: ["Vaga", "Media", "Soy la mitocondria"],
      }),
    ).toThrow("reveals");
  });

  it("derives a readable topic from the PDF name", () => {
    expect(topicFromFilename("tema_01-celulas.PDF", 1)).toBe("tema 01 celulas");
    expect(topicFromFilename("a.pdf", 3)).toBe("Semana 3");
  });
});
