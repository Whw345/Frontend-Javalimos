import { MAX_ANSWER_CHARS } from "./levels";
import type {
  DebateHistoryItem,
  DebateQuestion,
  DebateSession,
  DebateTurnRequest,
  DebateTurnResponse,
  InputMode,
} from "./schema";

/**
 * Lógica pura del Debate en el cliente (sin React): estado de la pantalla, armado de
 * cada turno y reglas de envío. El servidor sigue siendo dueño del tiempo y la evaluación.
 */

export interface ComposerState {
  text: string;
  inputModes: InputMode[];
  dictatedChars: number;
  typedChars: number;
  pasteAttempts: number;
}

export type DebatePhase =
  /** El estudiante compone su respuesta; corren el reloj global y el del turno. */
  | "answering"
  /** La IA procesa la respuesta: reloj global en pausa, compositor deshabilitado. */
  | "thinking"
  /** Se acabó el tiempo o el estudiante terminó: se envía el último turno y se cierra. */
  | "closing";

export interface DebateState {
  phase: DebatePhase;
  question: DebateQuestion;
  rephrased: boolean;
  /** Hora del cliente en que empezó el turno actual. */
  turnStartedAt: number;
  /** Hora del servidor (ms). */
  deadline: number;
  clockOffsetMs: number;
  history: DebateHistoryItem[];
  composer: ComposerState;
}

export type DebateAction =
  | { type: "typed"; text: string }
  | { type: "dictated"; text: string; inserted: number }
  | { type: "cleared" }
  | { type: "pasteBlocked" }
  | { type: "submitStarted" }
  | { type: "submitFailed" }
  | { type: "turnSent"; sentAnswer: string | null; response: DebateTurnResponse; now: number }
  | { type: "rephrased"; question: DebateQuestion; deadline: string; serverTime: string; now: number }
  | { type: "closing" };

export const emptyComposer = (): ComposerState => ({
  text: "",
  inputModes: [],
  dictatedChars: 0,
  typedChars: 0,
  pasteAttempts: 0,
});

const withMode = (modes: InputMode[], mode: InputMode) => (modes.includes(mode) ? modes : [...modes, mode]);

const offsetFrom = (serverTime: string, now: number) => Date.parse(serverTime) - now;

export function initialDebateState(session: DebateSession, now: number): DebateState {
  return {
    phase: "answering",
    question: session.question,
    rephrased: false,
    turnStartedAt: now,
    deadline: Date.parse(session.deadline),
    clockOffsetMs: offsetFrom(session.serverTime, now),
    history: session.history,
    composer: emptyComposer(),
  };
}

export function debateReducer(state: DebateState, action: DebateAction): DebateState {
  switch (action.type) {
    case "typed": {
      const added = Math.max(0, action.text.length - state.composer.text.length);
      return {
        ...state,
        composer: {
          ...state.composer,
          text: action.text,
          typedChars: state.composer.typedChars + added,
          inputModes: added > 0 ? withMode(state.composer.inputModes, "texto") : state.composer.inputModes,
        },
      };
    }
    case "dictated":
      return {
        ...state,
        composer: {
          ...state.composer,
          text: action.text,
          dictatedChars: state.composer.dictatedChars + action.inserted,
          inputModes: withMode(state.composer.inputModes, "voz"),
        },
      };
    case "cleared":
      // Regrabar: se vacía el texto, pero los modos usados y los pegados siguen contando.
      return { ...state, composer: { ...state.composer, text: "", dictatedChars: 0, typedChars: 0 } };
    case "pasteBlocked":
      return { ...state, composer: { ...state.composer, pasteAttempts: state.composer.pasteAttempts + 1 } };
    case "submitStarted":
      return state.phase === "answering" ? { ...state, phase: "thinking" } : state;
    case "submitFailed":
      return state.phase === "thinking" ? { ...state, phase: "answering" } : state;
    case "turnSent": {
      const history = [
        ...state.history,
        { question: state.question, answer: action.sentAnswer, rephrased: state.rephrased },
      ];
      const base = {
        ...state,
        history,
        deadline: Date.parse(action.response.deadline),
        clockOffsetMs: offsetFrom(action.response.serverTime, action.now),
      };
      if (action.response.status === "closed" || !action.response.question) {
        return { ...base, phase: "closing" };
      }
      return {
        ...base,
        phase: state.phase === "closing" ? "closing" : "answering",
        question: action.response.question,
        rephrased: false,
        turnStartedAt: action.now,
        composer: emptyComposer(),
      };
    }
    case "rephrased":
      return {
        ...state,
        question: action.question,
        rephrased: true,
        deadline: Date.parse(action.deadline),
        clockOffsetMs: offsetFrom(action.serverTime, action.now),
      };
    case "closing":
      return { ...state, phase: "closing" };
  }
}

interface TurnRequestOptions {
  /** "pass" fuerza pasar; "answer" envía el texto (o pasa si está vacío). */
  intent: "answer" | "pass";
  timedOut: boolean;
  now: number;
}

/** Arma el cuerpo de `POST /turns`. Una respuesta vacía siempre cuenta como pasada. */
export function buildTurnRequest(state: DebateState, { intent, timedOut, now }: TurnRequestOptions) {
  const text = state.composer.text.trim();
  const action = intent === "pass" || text === "" ? "pass" : "answer";
  const request: DebateTurnRequest = {
    questionId: state.question.id,
    action,
    text: action === "answer" ? text : "",
    inputModes: state.composer.inputModes,
    dictatedChars: state.composer.dictatedChars,
    typedChars: state.composer.typedChars,
    pasteAttempts: state.composer.pasteAttempts,
    durationMs: Math.max(0, Math.round(now - state.turnStartedAt)),
    timedOut,
  };
  return request;
}

/** Turnos respondidos (no pasados): "Terminar y ver evaluación" exige al menos uno. */
export function answeredCount(history: DebateHistoryItem[], composerText = ""): number {
  return history.filter((item) => item.answer !== null).length + (composerText.trim() ? 1 : 0);
}

interface InsertResult {
  text: string;
  /** Posición del cursor después del fragmento. */
  cursor: number;
  /** Caracteres realmente insertados (puede recortarse por el máximo). */
  inserted: number;
}

/**
 * Inserta un fragmento dictado en la posición del cursor, con un espacio de separación
 * cuando hace falta, sin pasar de `maxChars`.
 */
export function insertDictation(
  text: string,
  cursor: number,
  fragment: string,
  maxChars = MAX_ANSWER_CHARS,
): InsertResult {
  const clean = fragment.trim();
  const at = Math.max(0, Math.min(cursor, text.length));
  if (!clean) return { text, cursor: at, inserted: 0 };

  const before = text.slice(0, at);
  const after = text.slice(at);
  const lead = before && !/\s$/.test(before) ? " " : "";
  const trail = after && !/^\s/.test(after) ? " " : "";
  const room = maxChars - text.length;
  if (room <= lead.length) return { text, cursor: at, inserted: 0 };

  const piece = `${lead}${clean}${trail}`.slice(0, room);
  return { text: before + piece + after, cursor: at + piece.length, inserted: piece.length };
}

/** §7.1 del spec: estrellas informativas a partir de la nota general (0–4). */
export function debateStars(overall: number): 0 | 1 | 2 | 3 {
  if (overall >= 3.5) return 3;
  if (overall >= 2.5) return 2;
  if (overall >= 1.5) return 1;
  return 0;
}
