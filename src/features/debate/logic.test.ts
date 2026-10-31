import { describe, expect, it } from "vitest";
import {
  answeredCount,
  buildTurnRequest,
  debateReducer,
  debateStars,
  initialDebateState,
  insertDictation,
} from "./logic";
import type { DebateQuestion, DebateSession } from "./schema";

const question = (id: string): DebateQuestion => ({
  id,
  text: `Pregunta ${id}`,
  kind: "eje",
  topicIds: ["a", "b"],
  canRephrase: true,
});

const session: DebateSession = {
  debateId: "d1",
  courseId: "bio-101",
  difficulty: "baja",
  topics: [],
  totalSeconds: 180,
  turnSeconds: 90,
  startedAt: "2026-10-30T10:00:00.000Z",
  deadline: "2026-10-30T10:03:00.000Z",
  serverTime: "2026-10-30T10:00:00.000Z",
  question: question("q1"),
  history: [],
};

const start = Date.parse("2026-10-30T10:00:00.000Z");

describe("debateReducer", () => {
  it("cuenta lo escrito y lo dictado por separado y registra ambos modos", () => {
    let state = initialDebateState(session, start);
    state = debateReducer(state, { type: "typed", text: "La mitosis" });
    state = debateReducer(state, { type: "dictated", text: "La mitosis produce dos células", inserted: 20 });

    expect(state.composer.typedChars).toBe(10);
    expect(state.composer.dictatedChars).toBe(20);
    expect(state.composer.inputModes).toEqual(["texto", "voz"]);
  });

  it("borrar no cuenta como escribir", () => {
    let state = initialDebateState(session, start);
    state = debateReducer(state, { type: "typed", text: "abc" });
    state = debateReducer(state, { type: "typed", text: "ab" });
    expect(state.composer.typedChars).toBe(3);
  });

  it("regrabar vacía el texto pero conserva los pegados bloqueados", () => {
    let state = initialDebateState(session, start);
    state = debateReducer(state, { type: "pasteBlocked" });
    state = debateReducer(state, { type: "dictated", text: "hola", inserted: 4 });
    state = debateReducer(state, { type: "cleared" });
    expect(state.composer.text).toBe("");
    expect(state.composer.pasteAttempts).toBe(1);
    expect(state.composer.inputModes).toEqual(["voz"]);
  });

  it("al recibir la siguiente pregunta guarda el turno y reinicia el compositor", () => {
    let state = initialDebateState(session, start);
    state = debateReducer(state, { type: "typed", text: "respuesta" });
    state = debateReducer(state, { type: "submitStarted" });
    expect(state.phase).toBe("thinking");

    state = debateReducer(state, {
      type: "turnSent",
      sentAnswer: "respuesta",
      now: start + 5000,
      response: {
        status: "continue",
        deadline: "2026-10-30T10:03:01.200Z",
        serverTime: "2026-10-30T10:00:05.000Z",
        question: question("q2"),
      },
    });

    expect(state.phase).toBe("answering");
    expect(state.history).toHaveLength(1);
    expect(state.history[0]!.answer).toBe("respuesta");
    expect(state.question.id).toBe("q2");
    expect(state.composer.text).toBe("");
    expect(state.turnStartedAt).toBe(start + 5000);
    expect(state.deadline).toBe(Date.parse("2026-10-30T10:03:01.200Z"));
  });

  it("si el servidor cierra el debate pasa a closing", () => {
    let state = initialDebateState(session, start);
    state = debateReducer(state, { type: "submitStarted" });
    state = debateReducer(state, {
      type: "turnSent",
      sentAnswer: null,
      now: start,
      response: { status: "closed", deadline: session.deadline, serverTime: session.serverTime },
    });
    expect(state.phase).toBe("closing");
  });

  it("reformular marca la pregunta como reformulada", () => {
    let state = initialDebateState(session, start);
    state = debateReducer(state, {
      type: "rephrased",
      question: { ...question("q1"), text: "Otra forma", canRephrase: false },
      deadline: session.deadline,
      serverTime: session.serverTime,
      now: start,
    });
    expect(state.rephrased).toBe(true);
    expect(state.question.canRephrase).toBe(false);
  });
});

describe("buildTurnRequest", () => {
  it("una respuesta vacía siempre se envía como pasada", () => {
    let state = initialDebateState(session, start);
    state = debateReducer(state, { type: "typed", text: "   " });
    const request = buildTurnRequest(state, { intent: "answer", timedOut: true, now: start + 90_000 });
    expect(request.action).toBe("pass");
    expect(request.text).toBe("");
    expect(request.durationMs).toBe(90_000);
    expect(request.timedOut).toBe(true);
  });

  it("pasar descarta el texto escrito", () => {
    let state = initialDebateState(session, start);
    state = debateReducer(state, { type: "typed", text: "algo" });
    expect(buildTurnRequest(state, { intent: "pass", timedOut: false, now: start }).text).toBe("");
  });

  it("recorta los espacios de la respuesta", () => {
    let state = initialDebateState(session, start);
    state = debateReducer(state, { type: "typed", text: "  la mitosis  " });
    expect(buildTurnRequest(state, { intent: "answer", timedOut: false, now: start }).text).toBe(
      "la mitosis",
    );
  });
});

describe("insertDictation", () => {
  it("agrega un espacio entre el texto y el fragmento", () => {
    expect(insertDictation("La mitosis", 10, "produce dos células")).toEqual({
      text: "La mitosis produce dos células",
      cursor: 30,
      inserted: 20,
    });
  });

  it("inserta en medio del texto respetando los espacios", () => {
    expect(insertDictation("uno tres", 4, "dos").text).toBe("uno dos tres");
  });

  it("no pasa del máximo de caracteres", () => {
    const result = insertDictation("12345", 5, "678910", 8);
    expect(result.text).toBe("12345 67");
    expect(result.inserted).toBe(3);
  });

  it("ignora fragmentos vacíos", () => {
    expect(insertDictation("hola", 4, "  ").inserted).toBe(0);
  });
});

describe("answeredCount y debateStars", () => {
  it("cuenta respuestas del historial y del compositor", () => {
    const history = [
      { question: question("q1"), answer: "sí", rephrased: false },
      { question: question("q2"), answer: null, rephrased: false },
    ];
    expect(answeredCount(history)).toBe(1);
    expect(answeredCount(history, "borrador")).toBe(2);
  });

  it("convierte la nota en estrellas", () => {
    expect(debateStars(4)).toBe(3);
    expect(debateStars(3.4)).toBe(2);
    expect(debateStars(1.5)).toBe(1);
    expect(debateStars(1.4)).toBe(0);
  });
});
