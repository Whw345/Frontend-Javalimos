import { delay, http, HttpResponse } from "msw";
import { difficultySchema, gameSlugSchema, type ApiErrorBody, type ChallengeResult } from "@/lib/api/schemas";
import { API_BASE_URL, POINTS_CORRECT, POINTS_CORRECT_WITH_HINT } from "@/lib/config";
import { createSession, getProgress, getSession, hasGenerator } from "./db";

/** Margen de red que el backend acepta después del deadline (§17). */
const NETWORK_GRACE_MS = 1500;
/** Latencia simulada para ver skeletons y estados de carga. */
const LATENCY_MS = 350;

const api = (path: string) => `${API_BASE_URL}/api${path}`;

function apiError(status: number, code: string, message: string) {
  return HttpResponse.json<ApiErrorBody>({ code, message }, { status });
}

export const handlers = [
  http.get(api("/courses/:courseId/progress"), async ({ params }) => {
    await delay(LATENCY_MS);
    return HttpResponse.json(getProgress(String(params.courseId)));
  }),

  http.post(api("/courses/:courseId/challenges"), async ({ params, request }) => {
    await delay(LATENCY_MS);
    const courseId = String(params.courseId);
    const body = (await request.json()) as { game?: unknown; difficulty?: unknown };
    const game = gameSlugSchema.safeParse(body.game);
    const difficulty = difficultySchema.safeParse(body.difficulty);

    if (!game.success || !difficulty.success || !hasGenerator(game.data)) {
      return apiError(400, "BAD_REQUEST", "Juego o dificultad inválidos");
    }
    const progress = getProgress(courseId);
    if (progress.weeklyPlayed >= progress.weeklyLimit) {
      return apiError(409, "WEEKLY_LIMIT_REACHED", "Límite semanal alcanzado");
    }
    return HttpResponse.json(createSession(courseId, game.data, difficulty.data), { status: 201 });
  }),

  http.get(api("/challenges/:sessionId"), async ({ params }) => {
    await delay(LATENCY_MS);
    const stored = getSession(String(params.sessionId));
    if (!stored || stored.answered) return apiError(404, "SESSION_NOT_FOUND", "Sesión no encontrada");
    return HttpResponse.json({ ...stored.session, serverTime: new Date().toISOString() });
  }),

  http.post(api("/challenges/:sessionId/hint"), async ({ params }) => {
    await delay(LATENCY_MS);
    const stored = getSession(String(params.sessionId));
    if (!stored || stored.answered) return apiError(404, "SESSION_NOT_FOUND", "Sesión no encontrada");
    stored.hintUsed = true;
    return HttpResponse.json({ hintRevealed: true, hint: stored.challenge.hint?.() });
  }),

  http.post(api("/challenges/:sessionId/answer"), async ({ params, request }) => {
    await delay(LATENCY_MS);
    const stored = getSession(String(params.sessionId));
    if (!stored || stored.answered) return apiError(404, "SESSION_NOT_FOUND", "Sesión no encontrada");
    if (Date.now() > Date.parse(stored.session.deadline) + NETWORK_GRACE_MS) {
      stored.answered = true;
      return apiError(410, "CHALLENGE_EXPIRED", "El reto expiró");
    }

    const { answer } = (await request.json()) as { answer: unknown };
    if (stored.challenge.gradingDelayMs) await delay(stored.challenge.gradingDelayMs);
    const grade = stored.challenge.grade(answer);
    const pointsAwarded = grade.correct ? (stored.hintUsed ? POINTS_CORRECT_WITH_HINT : POINTS_CORRECT) : 0;

    const progress = getProgress(stored.session.courseId);
    progress.points += pointsAwarded;
    stored.answered = true;

    const result: ChallengeResult = {
      correct: grade.correct,
      pointsAwarded,
      timedOut: grade.timedOut,
      correctAnswer: stored.challenge.solution,
      explanation: grade.explanation,
      source: stored.challenge.source,
      totals: { ...progress },
    };
    return HttpResponse.json(result);
  }),
];
