import type { DebateDifficulty } from "./schema";

export interface DebateLevel {
  totalSeconds: number;
  topics: number;
  turnSeconds: number;
}

/** Punto de partida de §5 del spec; se ajusta con pruebas de usuarios. */
export const DEBATE_LEVELS: Record<DebateDifficulty, DebateLevel> = {
  baja: { totalSeconds: 180, topics: 2, turnSeconds: 90 },
  media: { totalSeconds: 300, topics: 3, turnSeconds: 60 },
  alta: { totalSeconds: 480, topics: 4, turnSeconds: 45 },
};

export const DEBATE_DIFFICULTIES: DebateDifficulty[] = ["baja", "media", "alta"];

export const MAX_ANSWER_CHARS = 600;
