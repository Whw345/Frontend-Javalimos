import "server-only";
import { z } from "zod";
import { gameSlugSchema } from "@/lib/api/schemas";
import { gameCatalog } from "@/lib/games/catalog";
import type { Difficulty } from "@/games/types";
import { dateKey, firstMonday, weekWindow } from "@/lib/utils/schedule";
import { HttpError } from "./errors";
import { buildChallenge } from "./generation";
import { checked, getDatabase, isTeacher } from "./supabase";

/** Same window after which claim_week_generation lets a week be claimed again. */
const STALE_GENERATION_MS = 5 * 60 * 1000;

export async function listCourses(userId: string) {
  const db = getDatabase();
  const memberships = checked(
    await db.from("course_members").select("course_id, role").eq("user_id", userId),
  );
  const ids = memberships.map((membership) => membership.course_id as string);
  const canCreateCourses = await isTeacher(userId);
  if (!ids.length) return { canCreateCourses, courses: [] };
  const courses = checked(
    await db.from("courses").select("id, name, created_at, setup_completed_at").in("id", ids),
  );
  const weeks = checked(await db.from("course_weeks").select("course_id").in("course_id", ids));
  const games = checked(
    await db.from("generated_challenges").select("course_id, status").in("course_id", ids),
  );
  return {
    canCreateCourses,
    courses: courses
      .map((course) => ({
        id: course.id as string,
        name: course.name as string,
        createdAt: new Date(course.created_at as string).toISOString(),
        role: memberships.find((membership) => membership.course_id === course.id)!.role as string,
        setupCompleted: Boolean(course.setup_completed_at),
        weeks: weeks.filter((week) => week.course_id === course.id).length,
        games: games.filter((game) => game.course_id === course.id && game.status !== "discarded").length,
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  };
}

export async function createCourse(userId: string, input: unknown) {
  const { name } = z.object({ name: z.string().trim().min(3).max(120) }).parse(input);
  const id = checked(
    await getDatabase().rpc("create_course", {
      p_name: name,
      p_user: userId,
      p_starts_on: firstMonday(new Date()),
    }),
  ) as string;
  return { id };
}

export async function getCoursePath(courseId: string) {
  const db = getDatabase();
  const course = checked(
    await db.from("courses").select("id, name, starts_on, setup_completed_at").eq("id", courseId).single(),
  );
  const weeks = checked(
    await db
      .from("course_weeks")
      .select("week_number, topic, generation_status, generation_started_at, generation_error")
      .eq("course_id", courseId)
      .order("week_number"),
  );
  // An instance can die mid generation: without this the week would look busy forever.
  const isStale = (week: { generation_status: unknown; generation_started_at: unknown }) =>
    week.generation_status === "running" &&
    Date.now() - new Date(week.generation_started_at as string).getTime() > STALE_GENERATION_MS;
  const games = checked(
    await db
      .from("generated_challenges")
      .select("id, week_number, game, difficulty, status, position")
      .eq("course_id", courseId)
      .order("position"),
  );
  const startsOn = course.starts_on ? dateKey(course.starts_on) : null;
  return {
    course: {
      id: course.id as string,
      name: course.name as string,
      setupCompleted: Boolean(course.setup_completed_at),
    },
    weeks: weeks.map((week) => ({
      weekNumber: week.week_number as number,
      topic: week.topic as string,
      generationStatus: isStale(week) ? "failed" : (week.generation_status as string),
      generationError: isStale(week)
        ? "La generación se interrumpió. Inténtalo de nuevo."
        : (week.generation_error as string | null),
      deadline: startsOn ? weekWindow(startsOn, week.week_number as number).deadline : null,
      games: games
        .filter((game) => game.week_number === week.week_number && game.status !== "discarded")
        .map((game) => ({
          id: game.id as string,
          game: game.game as string,
          difficulty: game.difficulty as number,
          status: game.status as string,
        })),
    })),
  };
}

async function findGame(courseId: string, gameId: string) {
  if (!z.string().uuid().safeParse(gameId).success)
    throw new HttpError(404, "NOT_FOUND", "No se encontró el juego.");
  return checked(
    await getDatabase()
      .from("generated_challenges")
      .select("id, game, difficulty, status, week_number, content, source, evidence")
      .eq("id", gameId)
      .eq("course_id", courseId)
      .maybeSingle(),
  );
}

export async function getGame(courseId: string, gameId: string) {
  const game = await findGame(courseId, gameId);
  return {
    id: game.id as string,
    game: gameSlugSchema.parse(game.game),
    difficulty: game.difficulty as number,
    status: game.status as string,
    weekNumber: game.week_number as number,
    content: game.content as Record<string, unknown> | null,
    source: game.source as { documento: string },
    evidence: game.evidence as string,
  };
}

/** El docente edita los parámetros; payload, solución y pista se reconstruyen en el servidor. */
export async function updateGame(courseId: string, gameId: string, input: unknown) {
  const game = await findGame(courseId, gameId);
  if (game.status !== "draft" || !game.content)
    throw new HttpError(409, "GAME_LOCKED", "Este juego ya no se puede editar.");
  const slug = gameSlugSchema.parse(game.game);
  const previous = game.content as { sourceId: string; evidence: string };
  const content = gameCatalog[slug].schema.parse({
    ...z.object({ content: z.record(z.string(), z.unknown()) }).parse(input).content,
    sourceId: previous.sourceId,
    evidence: previous.evidence,
  });
  let built: ReturnType<typeof buildChallenge>;
  try {
    built = buildChallenge({ ...content, game: slug }, game.difficulty as Difficulty);
  } catch {
    throw new HttpError(
      422,
      "INVALID_GAME",
      "Revisa el juego: hay opciones repetidas o datos inconsistentes.",
    );
  }
  checked(
    await getDatabase()
      .from("generated_challenges")
      .update({
        content,
        payload: built.payload,
        solution: built.solution,
        hint: built.hint,
        explanation: (content as { explanation: string }).explanation,
        time_limit_seconds: built.timeLimitSeconds,
      })
      .eq("id", gameId)
      .eq("course_id", courseId)
      .select("id")
      .maybeSingle(),
  );
  return { id: gameId };
}

export async function finishCourse(courseId: string) {
  const result = await getDatabase().rpc("finish_course_setup", { p_course: courseId });
  if (result.error) {
    const message = String((result.error as { message?: string }).message);
    if (message.includes("GENERATION_PENDING"))
      throw new HttpError(409, "GENERATION_PENDING", "Espera a que terminen de generarse las semanas.");
    if (message.includes("NO_GAMES"))
      throw new HttpError(409, "NO_GAMES", "Necesitas al menos un juego para terminar.");
    throw result.error;
  }
  return { published: result.data as number };
}
