import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getCourse, requireMyCourse } from "./courses";
import { DataError } from "./errors";

export type CourseGame = {
  id: number;
  courseId: number;
  game: number;
  arguments: unknown;
  // YYYY-MM-DD. Kept as text because new Date() would read it as UTC and show
  // the previous day in Lima.
  dueDate: string;
};

export type CourseGameInput = {
  game: number;
  arguments: unknown;
  dueDate: string;
};

type CourseGameRow = {
  id: number;
  course_id: number;
  game: number;
  arguments: unknown;
  due_date: string;
};

const columns = "id, course_id, game, arguments, due_date";

function toCourseGame(row: CourseGameRow): CourseGame {
  return {
    id: row.id,
    courseId: row.course_id,
    game: row.game,
    arguments: row.arguments,
    dueDate: row.due_date,
  };
}

export async function listCourseGames(courseId: number): Promise<CourseGame[]> {
  const course = await getCourse(courseId);

  if (!course) throw new DataError("Course not found");

  const { data, error } = await createClient()
    .from("course_game")
    .select(columns)
    .eq("course_id", courseId)
    .order("due_date");

  if (error) throw new DataError("Could not load games", { cause: error });

  return data.map(toCourseGame);
}

export async function addGameToMyCourse(
  courseId: number,
  input: CourseGameInput,
): Promise<CourseGame> {
  await requireMyCourse(courseId);

  const { data, error } = await createClient()
    .from("course_game")
    .insert({
      course_id: courseId,
      game: input.game,
      arguments: input.arguments,
      due_date: input.dueDate,
    })
    .select(columns)
    .single();

  if (error) throw new DataError("Could not add game", { cause: error });

  return toCourseGame(data);
}

export async function updateMyCourseGame(
  courseId: number,
  id: number,
  input: CourseGameInput,
): Promise<CourseGame> {
  await requireMyCourse(courseId);

  const { data, error } = await createClient()
    .from("course_game")
    .update({
      game: input.game,
      arguments: input.arguments,
      due_date: input.dueDate,
    })
    .eq("id", id)
    .eq("course_id", courseId)
    .select(columns)
    .single();

  if (error) throw new DataError("Could not update game", { cause: error });

  return toCourseGame(data);
}

export async function removeGameFromMyCourse(
  courseId: number,
  id: number,
): Promise<void> {
  await requireMyCourse(courseId);

  const { error } = await createClient()
    .from("course_game")
    .delete()
    .eq("id", id)
    .eq("course_id", courseId);

  if (error) throw new DataError("Could not remove game", { cause: error });
}
