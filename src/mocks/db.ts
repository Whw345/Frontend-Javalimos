import type { Difficulty, GameSlug } from "@/games/types";
import type { ChallengeSession, ProgressTotals } from "@/lib/api/schemas";
import { WEEKLY_CHALLENGE_LIMIT } from "@/lib/config";
import { biologyWeek5Atoms } from "./data/atoms";
import {
  ejemplosPorAtomo,
  mitosisPhasesAtom,
  mitosisVsMeiosisAtoms,
  otherUnitConcepts,
  valuedAtoms,
  valueQuestions,
} from "./data/extra";
import { createCualMayorChallenge } from "./games/cual-mayor";
import { createDeslizaChallenge } from "./games/desliza";
import { createDosCajasChallenge } from "./games/dos-cajas";
import { createEncuentraErrorChallenge } from "./games/encuentra-error";
import { createHuecoChallenge } from "./games/hueco";
import { createIntrusoChallenge } from "./games/intruso";
import { createOrdenaChallenge } from "./games/ordena";
import { createParejasChallenge } from "./games/parejas";
import { createQuienSoyChallenge } from "./games/quien-soy";
import type { MockChallenge } from "./types";

/**
 * "Base de datos" en memoria del backend simulado. Vive mientras la pestaña esté abierta:
 * al recargar, el progreso vuelve a los valores de ejemplo.
 */
export const CURRENT_WEEK = 5;

interface StoredSession {
  session: ChallengeSession;
  challenge: MockChallenge;
  hintUsed: boolean;
  answered: boolean;
}

const progressByCourse = new Map<string, ProgressTotals>();
const sessions = new Map<string, StoredSession>();

/** Generadores por juego: cómo armaría el backend cada reto desde los átomos de la semana. */
const generators: Record<GameSlug, (difficulty: Difficulty) => MockChallenge> = {
  desliza: (difficulty) => createDeslizaChallenge(biologyWeek5Atoms, difficulty),
  parejas: (difficulty) => createParejasChallenge(biologyWeek5Atoms, difficulty),
  ordena: (difficulty) => createOrdenaChallenge(mitosisPhasesAtom, difficulty),
  "dos-cajas": (difficulty) =>
    createDosCajasChallenge(mitosisVsMeiosisAtoms, { a: "Mitosis", b: "Meiosis" }, difficulty),
  hueco: (difficulty) => createHuecoChallenge(biologyWeek5Atoms, difficulty),
  "encuentra-error": (difficulty) => createEncuentraErrorChallenge(mitosisPhasesAtom, difficulty),
  "quien-soy": (difficulty) => createQuienSoyChallenge(biologyWeek5Atoms, ejemplosPorAtomo, difficulty),
  intruso: (difficulty) => createIntrusoChallenge(biologyWeek5Atoms, otherUnitConcepts, difficulty),
  "cual-mayor": (difficulty) => createCualMayorChallenge(valuedAtoms, valueQuestions, difficulty),
};

export function getProgress(courseId: string): ProgressTotals {
  let progress = progressByCourse.get(courseId);
  if (!progress) {
    progress = { points: 1250, streakDays: 5, weeklyPlayed: 3, weeklyLimit: WEEKLY_CHALLENGE_LIMIT };
    progressByCourse.set(courseId, progress);
  }
  return progress;
}

export function hasGenerator(game: GameSlug): boolean {
  return game in generators;
}

export function createSession(courseId: string, game: GameSlug, difficulty: Difficulty): ChallengeSession {
  const challenge = generators[game]!(difficulty);
  const now = Date.now();
  const session: ChallengeSession = {
    sessionId: crypto.randomUUID(),
    courseId,
    game,
    difficulty,
    week: CURRENT_WEEK,
    payload: challenge.payload,
    hintAvailable: true,
    startedAt: new Date(now).toISOString(),
    deadline: new Date(now + challenge.durationMs).toISOString(),
    serverTime: new Date(now).toISOString(),
  };
  sessions.set(session.sessionId, { session, challenge, hintUsed: false, answered: false });

  // El intento cuenta al empezar: salir del reto también lo consume.
  const progress = getProgress(courseId);
  progress.weeklyPlayed += 1;
  return session;
}

export function getSession(sessionId: string): StoredSession | undefined {
  return sessions.get(sessionId);
}
