import "server-only";
import { z } from "zod";
import { huecoAnswerSchema, huecoSolutionSchema } from "@/games/hueco/schema";
import { parejasAnswerSchema, parejasSolutionSchema } from "@/games/parejas/schema";
import { ordenaAnswerSchema, ordenaSolutionSchema } from "@/games/ordena/schema";
import { challengeResultSchema, challengeSessionSchema } from "@/lib/api/schemas";
import { checked, getDatabase, requireCourse, requireUser } from "./supabase";
import { HttpError } from "./errors";

export function gradeAnswer(game: string, solution: unknown, answer: unknown): boolean {
  if (game === "hueco") {
    const parsed = huecoAnswerSchema.safeParse(answer);
    return parsed.success && parsed.data.optionId === huecoSolutionSchema.parse(solution).optionId;
  }
  if (game === "ordena") {
    const parsed = ordenaAnswerSchema.safeParse(answer);
    return (
      parsed.success &&
      JSON.stringify(parsed.data.order) === JSON.stringify(ordenaSolutionSchema.parse(solution).order)
    );
  }
  if (game === "parejas") {
    const parsed = parejasAnswerSchema.safeParse(answer);
    const expected = parejasSolutionSchema.parse(solution);
    return (
      parsed.success &&
      parsed.data.pairs.length === expected.length &&
      new Set(parsed.data.pairs.map((pair) => pair.conceptId)).size === expected.length &&
      expected.every((pair) =>
        parsed.data.pairs.some(
          (candidate) =>
            candidate.conceptId === pair.conceptId && candidate.definitionId === pair.definitionId,
        ),
      )
    );
  }
  return false;
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

export async function startChallenge(courseId: string, userId: string, body: unknown) {
  const input = z
    .object({
      game: z.enum(["hueco", "parejas", "ordena"]),
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
  const correct = gradeAnswer(challenge.game, challenge.solution, answer);
  const result = await getDatabase().rpc("finish_challenge", {
    p_session: sessionId,
    p_user: userId,
    p_correct: correct,
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
