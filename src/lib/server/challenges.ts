import "server-only";
import { z } from "zod";
import { cualMayorAnswerSchema, cualMayorSolutionSchema } from "@/games/cual-mayor/schema";
import { deslizaAnswerSchema, deslizaSolutionSchema } from "@/games/desliza/schema";
import { dosCajasAnswerSchema, dosCajasSolutionSchema } from "@/games/dos-cajas/schema";
import { encuentraErrorAnswerSchema, encuentraErrorSolutionSchema } from "@/games/encuentra-error/schema";
import { huecoAnswerSchema, huecoSolutionSchema } from "@/games/hueco/schema";
import { intrusoAnswerSchema, intrusoSolutionSchema } from "@/games/intruso/schema";
import { parejasAnswerSchema, parejasSolutionSchema } from "@/games/parejas/schema";
import { ordenaAnswerSchema, ordenaSolutionSchema } from "@/games/ordena/schema";
import { quienSoyAnswerSchema, quienSoySolutionSchema } from "@/games/quien-soy/schema";
import { challengeResultSchema, challengeSessionSchema, gameSlugSchema } from "@/lib/api/schemas";
import { checked, getDatabase, requireCourse, requireUser } from "./supabase";
import { HttpError } from "./errors";

/** Los juegos con varias cartas o rondas cuentan como acierto con 75 % o más (§12). */
const PASSING_RATIO = 0.75;
/** Equivocarse no deja en cero: responder algo vale como 2 de los 10 puntos. */
const ATTEMPT_SCORE = 0.2;

const partialScore = (correct: number, total: number, answered: boolean) =>
  answered && total > 0 ? Math.max(correct / total, ATTEMPT_SCORE) : 0;
const roundsScore = (correct: number, total: number, answered: boolean) =>
  answered && total > 0 && correct >= Math.ceil(total * PASSING_RATIO)
    ? 1
    : partialScore(correct, total, answered);
const singleScore = (correct: boolean) => (correct ? 1 : ATTEMPT_SCORE);

/** Fracción del reto resuelta, de 0 a 1. Los puntos salen de ella y de la pista en finish_challenge. */
export function gradeAnswer(game: string, solution: unknown, answer: unknown): number {
  if (game === "hueco") {
    const parsed = huecoAnswerSchema.safeParse(answer);
    return parsed.success
      ? singleScore(parsed.data.optionId === huecoSolutionSchema.parse(solution).optionId)
      : 0;
  }
  if (game === "ordena") {
    const parsed = ordenaAnswerSchema.safeParse(answer);
    if (!parsed.success) return 0;
    const expected = ordenaSolutionSchema.parse(solution).order;
    const inPlace = expected.filter((step, index) => parsed.data.order[index] === step).length;
    return partialScore(inPlace, expected.length, parsed.data.order.length > 0);
  }
  if (game === "parejas") {
    const parsed = parejasAnswerSchema.safeParse(answer);
    if (!parsed.success) return 0;
    const expected = parejasSolutionSchema.parse(solution);
    const { pairs } = parsed.data;
    // Cada concepto se une una sola vez: enviar todas las combinaciones no suma.
    if (pairs.length > expected.length || new Set(pairs.map((pair) => pair.conceptId)).size !== pairs.length)
      return 0;
    const matched = expected.filter((pair) =>
      pairs.some(
        (candidate) => candidate.conceptId === pair.conceptId && candidate.definitionId === pair.definitionId,
      ),
    ).length;
    return partialScore(matched, expected.length, pairs.length > 0);
  }
  if (game === "desliza") {
    const parsed = deslizaAnswerSchema.safeParse(answer);
    if (!parsed.success) return 0;
    const expected = deslizaSolutionSchema.parse(solution);
    return roundsScore(
      expected.filter(
        (item) =>
          parsed.data.responses.find((response) => response.statementId === item.statementId)?.verdict ===
          item.isTrue,
      ).length,
      expected.length,
      parsed.data.responses.some((response) => response.verdict !== null),
    );
  }
  if (game === "dos-cajas") {
    const parsed = dosCajasAnswerSchema.safeParse(answer);
    if (!parsed.success) return 0;
    const expected = dosCajasSolutionSchema.parse(solution);
    return roundsScore(
      expected.filter(
        (item) => parsed.data.responses.find((response) => response.cardId === item.cardId)?.box === item.box,
      ).length,
      expected.length,
      parsed.data.responses.some((response) => response.box !== null),
    );
  }
  if (game === "cual-mayor") {
    const parsed = cualMayorAnswerSchema.safeParse(answer);
    if (!parsed.success) return 0;
    const expected = cualMayorSolutionSchema.parse(solution);
    return roundsScore(
      expected.filter(
        (item) =>
          parsed.data.responses.find((response) => response.roundId === item.roundId)?.choice === item.choice,
      ).length,
      expected.length,
      parsed.data.responses.some((response) => response.choice !== null),
    );
  }
  if (game === "encuentra-error") {
    const parsed = encuentraErrorAnswerSchema.safeParse(answer);
    return parsed.success
      ? singleScore(parsed.data.lineId === encuentraErrorSolutionSchema.parse(solution).lineId)
      : 0;
  }
  if (game === "intruso") {
    const parsed = intrusoAnswerSchema.safeParse(answer);
    return parsed.success
      ? singleScore(parsed.data.itemId === intrusoSolutionSchema.parse(solution).itemId)
      : 0;
  }
  if (game === "quien-soy") {
    const parsed = quienSoyAnswerSchema.safeParse(answer);
    return parsed.success && parsed.data.optionId !== null
      ? singleScore(parsed.data.optionId === quienSoySolutionSchema.parse(solution).optionId)
      : 0;
  }
  return 0;
}

export function publicSession(session: Record<string, unknown>, challenge: Record<string, unknown>) {
  return challengeSessionSchema.parse({
    sessionId: session.id,
    courseId: session.course_id,
    game: challenge.game,
    difficulty: challenge.difficulty,
    week: session.week_number,
    payload: challenge.payload,
    hintAvailable: true,
    startedAt: new Date(String(session.started_at)).toISOString(),
    deadline: new Date(String(session.deadline)).toISOString(),
    serverTime: new Date().toISOString(),
  });
}

export async function getOwnedSession(sessionId: string) {
  const userId = await requireUser();
  const db = getDatabase();
  const session = checked(
    await db.from("challenge_sessions").select("*").eq("id", sessionId).eq("user_id", userId).maybeSingle(),
  );
  if (!session) throw new HttpError(404, "SESSION_NOT_FOUND", "No se encontró el reto.");
  await requireCourse(session.course_id);
  const challenge = checked(
    await db.from("generated_challenges").select("*").eq("id", session.challenge_id).single(),
  );
  return { session, challenge, userId };
}

export async function getProgress(courseId: string, userId: string) {
  return checked(await getDatabase().rpc("course_progress", { p_course: courseId, p_user: userId }));
}

const isoDate = (value: unknown) => (value ? new Date(value as string).toISOString() : null);

/**
 * Camino completo del curso para un alumno. Nunca incluye solución, pista ni cita, y de las
 * semanas futuras solo dice cuántos retos traen: ni el tema ni qué juegos son.
 */
export async function getStudentPath(courseId: string, userId: string) {
  const db = getDatabase();
  const course = checked(await db.from("courses").select("name").eq("id", courseId).single());
  const currentWeek = checked(await db.rpc("course_active_week", { p_course: courseId })) as number;
  const weeks = checked(
    await db.from("course_weeks").select("week_number, topic").eq("course_id", courseId).order("week_number"),
  );
  const challenges = checked(
    await db
      .from("generated_challenges")
      .select("id, week_number, game, difficulty, opens_at, deadline")
      .eq("course_id", courseId)
      .eq("status", "published")
      .order("position"),
  );
  const sessions = checked(
    await db
      .from("challenge_sessions")
      .select("challenge_id, points")
      .eq("course_id", courseId)
      .eq("user_id", userId),
  );
  const now = Date.now();
  const isOpen = ({ opens_at, deadline }: { opens_at: string | null; deadline: string | null }) =>
    (!opens_at || Date.parse(opens_at) <= now) && (!deadline || Date.parse(deadline) > now);
  return {
    course: { ...course, current_week: currentWeek },
    weeks: weeks
      .map((week) => {
        const weekNumber = week.week_number as number;
        const games = challenges.filter((game) => game.week_number === weekNumber);
        const future = weekNumber > currentWeek;
        return {
          weekNumber,
          state: future ? "future" : weekNumber < currentWeek ? "past" : "current",
          topic: future ? null : (week.topic as string),
          opensAt: isoDate(games[0]?.opens_at),
          deadline: isoDate(games[0]?.deadline),
          hiddenGames: future ? games.length : 0,
          games: future
            ? []
            : games.map((game) => {
                const session = sessions.find((item) => item.challenge_id === game.id);
                const open = weekNumber === currentWeek && isOpen(game);
                return {
                  id: game.id,
                  game: game.game,
                  difficulty: game.difficulty,
                  status: session ? "played" : open ? "available" : "missed",
                  points: session ? (session.points as number) : null,
                };
              }),
        };
      })
      .filter((week) => week.state === "current" || week.games.length > 0 || week.hiddenGames > 0),
  };
}

export async function startChallenge(courseId: string, userId: string, body: unknown) {
  const input = z
    .object({
      game: gameSlugSchema,
      difficulty: z.number().int().min(1).max(3),
      challengeId: z.string().uuid().optional(),
    })
    .parse(body);
  const result = await getDatabase().rpc("start_challenge", {
    p_course: courseId,
    p_user: userId,
    p_game: input.game,
    p_difficulty: input.difficulty,
    p_challenge: input.challengeId ?? null,
  });
  if (result.error) {
    if (result.error.message.includes("WEEKLY_LIMIT_REACHED"))
      throw new HttpError(409, "WEEKLY_LIMIT_REACHED", "Ya completaste los diez retos de esta semana.");
    throw new HttpError(
      422,
      "NO_CHALLENGE",
      "No hay un reto publicado con estas opciones para la semana activa.",
    );
  }
  const session = result.data;
  const challenge = checked(
    await getDatabase()
      .from("generated_challenges")
      .select("game, difficulty, payload")
      .eq("id", session.challenge_id)
      .single(),
  );
  return publicSession(session, challenge);
}

export async function revealSessionHint(sessionId: string) {
  const { userId } = await getOwnedSession(sessionId);
  const result = await getDatabase().rpc("reveal_session_hint", { p_session: sessionId, p_user: userId });
  if (result.error) throw new HttpError(409, "CHALLENGE_EXPIRED", "El reto terminó.");
  return { hintRevealed: true, hint: result.data };
}

export async function submitSession(sessionId: string, answer: unknown) {
  const { session, challenge, userId } = await getOwnedSession(sessionId);
  const result = await getDatabase().rpc("finish_challenge", {
    p_session: sessionId,
    p_user: userId,
    p_score: gradeAnswer(challenge.game, challenge.solution, answer),
    p_answer: answer ?? null,
  });
  if (result.error) throw new HttpError(409, "ALREADY_ANSWERED", "Este reto ya fue respondido.");
  return challengeResultSchema.parse({
    ...result.data,
    correctAnswer: challenge.solution,
    explanation: challenge.explanation,
    source: challenge.source,
    totals: await getProgress(session.course_id, userId),
  });
}
