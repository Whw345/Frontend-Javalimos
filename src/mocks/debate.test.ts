import { describe, expect, it } from "vitest";
import { debateReportSchema, debateSessionSchema, type DebateTurnRequest } from "@/features/debate/schema";
import {
  createDebate,
  DebateMockError,
  EVALUATION_MS,
  finishDebate,
  getDebateReport,
  getDebateSetup,
  listDebates,
  rephraseQuestion,
  submitTurn,
  THINKING_MS,
} from "./debate";

const NOW = Date.parse("2026-10-30T10:00:00.000Z");

const answer = (
  questionId: string,
  text: string,
  extra: Partial<DebateTurnRequest> = {},
): DebateTurnRequest => ({
  questionId,
  action: "answer",
  text,
  inputModes: ["texto"],
  dictatedChars: 0,
  typedChars: text.length,
  pasteAttempts: 0,
  durationMs: 20_000,
  timedOut: false,
  ...extra,
});

const pass = (questionId: string): DebateTurnRequest => ({
  ...answer(questionId, ""),
  action: "pass",
  typedChars: 0,
});

describe("setup del debate", () => {
  it("elige la cantidad de temas del nivel, con uno de la semana actual", () => {
    const setup = getDebateSetup("bio-101", "media");
    expect(setup.premium).toBe(true);
    expect(setup.topics).toHaveLength(3);
    expect(setup.topics.some((topic) => topic.semana === 5)).toBe(true);
    expect(new Set(setup.topics.map((topic) => topic.semana)).size).toBeGreaterThan(1);
  });

  it("mantiene los temas de la intro hasta crear el debate", () => {
    const first = getDebateSetup("bio-101", "alta").topics;
    expect(getDebateSetup("bio-101", "alta").topics).toEqual(first);
    const session = createDebate("bio-101", "alta", NOW);
    expect(session.topics).toEqual(first);
  });

  it("un curso sin Premium no puede crear debates", () => {
    expect(getDebateSetup("gratis-101", "baja").premium).toBe(false);
    expect(() => createDebate("gratis-101", "baja", NOW)).toThrowError(DebateMockError);
  });
});

describe("entrevistador", () => {
  it("la primera pregunta eje cruza dos temas y la sesión cumple el contrato", () => {
    const session = createDebate("bio-101", "baja", NOW);
    expect(debateSessionSchema.safeParse(session).success).toBe(true);
    expect(session.question.kind).toBe("eje");
    expect(session.question.topicIds).toHaveLength(2);
    expect(Date.parse(session.deadline) - NOW).toBe(180_000);
  });

  it("repregunta cuando la respuesta es corta y descuenta el tiempo de pensar", () => {
    const session = createDebate("bio-101", "baja", NOW);
    const response = submitTurn(session.debateId, answer(session.question.id, "Porque sí."), NOW + 10_000);
    expect(response.status).toBe("continue");
    expect(response.question?.kind).toBe("repregunta");
    expect(Date.parse(response.deadline)).toBe(Date.parse(session.deadline) + THINKING_MS);
  });

  it("no repregunta más de dos veces seguidas", () => {
    const session = createDebate("bio-101", "media", NOW);
    let question = session.question;
    const kinds: string[] = [];
    for (let i = 0; i < 3; i++) {
      const response = submitTurn(session.debateId, answer(question.id, "No sé."), NOW + i * 1000);
      question = response.question!;
      kinds.push(question.kind);
    }
    expect(kinds).toEqual(["repregunta", "repregunta", "eje"]);
  });

  it("pasar lleva a otra pregunta eje y todos los temas aparecen", () => {
    const session = createDebate("bio-101", "alta", NOW);
    const seen = new Set(session.question.topicIds);
    let question = session.question;
    for (let i = 0; i < 3; i++) {
      question = submitTurn(session.debateId, pass(question.id), NOW + i * 1000).question!;
      expect(question.kind).toBe("eje");
      question.topicIds.forEach((id) => seen.add(id));
    }
    expect(seen.size).toBe(4);
  });

  it("reformula una sola vez por pregunta", () => {
    const session = createDebate("bio-101", "baja", NOW);
    const { question } = rephraseQuestion(session.debateId, NOW);
    expect(question.id).toBe(session.question.id);
    expect(question.text).not.toBe(session.question.text);
    expect(question.canRephrase).toBe(false);
    expect(() => rephraseQuestion(session.debateId, NOW)).toThrowError(/Ya se reformuló/);
  });

  it("cierra el debate si llega una respuesta con el tiempo casi agotado", () => {
    const session = createDebate("bio-101", "baja", NOW);
    const late = Date.parse(session.deadline) - 200;
    expect(submitTurn(session.debateId, answer(session.question.id, "Algo"), late).status).toBe("closed");
  });
});

describe("mediador", () => {
  it("devuelve un informe válido, con el error citado y la fuente", () => {
    const session = createDebate("bio-101", "baja", NOW);
    const mitosis = session.topics.find((topic) => topic.nombre === "Mitosis");
    const text = mitosis
      ? "La mitosis produce cuatro células hijas con la mitad de cromosomas."
      : "No estoy seguro.";
    submitTurn(
      session.debateId,
      answer(session.question.id, text, { dictatedChars: text.length, typedChars: 0 }),
      NOW + 5000,
    );

    finishDebate(session.debateId, NOW + 6000);
    expect(getDebateReport(session.debateId, NOW + 6000)).toBeNull();

    const report = getDebateReport(session.debateId, NOW + 6000 + EVALUATION_MS)!;
    expect(debateReportSchema.safeParse(report).success).toBe(true);
    expect(report.criteria.map((criterion) => criterion.id)).toEqual([
      "precision",
      "integracion",
      "argumentacion",
      "repregunta",
    ]);
    expect(report.stats.answered).toBe(1);
    expect(report.stats.voiceShare).toBe(1);
    if (mitosis && session.question.topicIds.includes(mitosis.id)) {
      expect(report.transcript[0]!.mark).toBe("erronea");
      expect(report.errors[0]!.source.documento).toContain("Semana5");
    }
  });

  it("una respuesta desarrollada que conecta temas puntúa mejor que una evasiva", () => {
    const strong = createDebate("bio-101", "baja", NOW);
    const [a, b] = strong.topics;
    submitTurn(
      strong.debateId,
      answer(
        strong.question.id,
        `${a!.nombre} y ${b!.nombre} se relacionan porque ambos dependen de que el ADN se duplique durante la interfase, por ejemplo antes de que la célula se divida y forme células hijas.`,
      ),
      NOW + 1000,
    );
    finishDebate(strong.debateId, NOW + 2000);

    const weak = createDebate("bio-101", "baja", NOW);
    submitTurn(weak.debateId, pass(weak.question.id), NOW + 1000);
    finishDebate(weak.debateId, NOW + 2000);

    const later = NOW + 2000 + EVALUATION_MS;
    const strongReport = getDebateReport(strong.debateId, later)!;
    const weakReport = getDebateReport(weak.debateId, later)!;
    expect(strongReport.overall).toBeGreaterThan(weakReport.overall);
    expect(weakReport.stats.passed).toBe(1);
    expect(weakReport.transcript[0]!.mark).toBe("pasada");
  });

  it("guarda el debate terminado en el historial del curso", () => {
    const session = createDebate("hist-101", "baja", NOW);
    finishDebate(session.debateId, NOW + 1000);
    expect(listDebates("hist-101")[0]!.debateId).toBe(session.debateId);
  });
});
