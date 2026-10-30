import { createStore } from "zustand/vanilla";
import type { ClientChallengeSession } from "@/lib/api/challenges";
import type { ChallengeResult } from "@/lib/api/schemas";

export type SessionStatus = "playing" | "submitting" | "feedback";
export type HintState = "idle" | "armed" | "loading" | "revealed";

export interface GameSessionState {
  session: ClientChallengeSession;
  status: SessionStatus;
  /** Última respuesta reportada por el juego con `onAnswerChange`. */
  answer: unknown;
  isComplete: boolean;
  hint: HintState;
  /** Dato de la pista devuelto por el servidor (p. ej. un par correcto en Parejas). */
  hintData: unknown;
  /** Juegos por rondas: ronda actual y cuándo empezó (hora del servidor, ms). */
  round: number;
  roundStartedAt: number;
  /** Hora del servidor (ms) en que empezó el reto. */
  startedAt: number;
  elapsedMs: number;
  result: ChallengeResult | null;
  submitError: string | null;
  actions: {
    setAnswer: (answer: unknown, isComplete: boolean) => void;
    completeRound: () => void;
    armHint: () => void;
    cancelHint: () => void;
    startHint: () => void;
    revealHint: (hintData: unknown) => void;
    failHint: () => void;
    /** Pasa a "submitting". Devuelve false si ya se estaba enviando o se envió. */
    startSubmit: () => boolean;
    failSubmit: (message: string) => void;
    clearSubmitError: () => void;
    finish: (result: ChallengeResult) => void;
  };
}

export type GameSessionStore = ReturnType<typeof createGameSessionStore>;

/** Un store por sesión de juego (§2). Lo crea `GameSessionProvider`. */
export function createGameSessionStore(session: ClientChallengeSession) {
  const serverNow = () => Date.now() + session.clockOffsetMs;
  // El reloj arranca con la hora del servidor, no al montar: el backend valida contra su deadline (§2).
  const startedAt = Math.min(Date.parse(session.startedAt), serverNow());

  return createStore<GameSessionState>()((set, get) => ({
    session,
    status: "playing",
    answer: null,
    isComplete: false,
    hint: "idle",
    hintData: null,
    round: 0,
    roundStartedAt: startedAt,
    startedAt,
    elapsedMs: 0,
    result: null,
    submitError: null,
    actions: {
      setAnswer: (answer, isComplete) => {
        if (get().status === "playing") set({ answer, isComplete });
      },
      completeRound: () => {
        if (get().status === "playing")
          set((state) => ({ round: state.round + 1, roundStartedAt: serverNow() }));
      },
      armHint: () => {
        if (get().hint === "idle" && get().status === "playing") set({ hint: "armed" });
      },
      cancelHint: () => {
        if (get().hint === "armed") set({ hint: "idle" });
      },
      startHint: () => set({ hint: "loading" }),
      revealHint: (hintData) => set({ hint: "revealed", hintData }),
      failHint: () => set({ hint: "idle" }),
      startSubmit: () => {
        if (get().status !== "playing") return false;
        set({ status: "submitting", submitError: null, elapsedMs: serverNow() - get().startedAt });
        return true;
      },
      failSubmit: (message) => set({ submitError: message }),
      clearSubmitError: () => set({ submitError: null }),
      finish: (result) => set({ status: "feedback", result, submitError: null }),
    },
  }));
}
