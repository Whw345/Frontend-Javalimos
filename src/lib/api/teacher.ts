import { z } from "zod";
import { API_BASE_URL } from "@/lib/config";
import { ApiError } from "./client";
import { apiErrorSchema, gameSlugSchema } from "./schemas";

export const courseCardSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  setupCompleted: z.boolean(),
  weeks: z.number(),
  games: z.number(),
});
export type CourseCard = z.infer<typeof courseCardSchema>;

export const pathWeekSchema = z.object({
  weekNumber: z.number(),
  topic: z.string(),
  generationStatus: z.string(),
  generationError: z.string().nullable(),
  deadline: z.string().nullable(),
  future: z.boolean(),
  unlocked: z.boolean(),
  games: z.array(
    z.object({ id: z.string(), game: gameSlugSchema, difficulty: z.number(), status: z.string() }),
  ),
});
export type PathWeek = z.infer<typeof pathWeekSchema>;

export const coursePathSchema = z.object({
  course: z.object({ id: z.string(), name: z.string(), setupCompleted: z.boolean() }),
  weeks: z.array(pathWeekSchema),
});
export type CoursePath = z.infer<typeof coursePathSchema>;

export const editableGameSchema = z.object({
  id: z.string(),
  game: gameSlugSchema,
  difficulty: z.number(),
  status: z.string(),
  weekNumber: z.number(),
  content: z.record(z.string(), z.unknown()).nullable(),
  source: z.object({ documento: z.string() }),
  evidence: z.string(),
});
export type EditableGame = z.infer<typeof editableGameSchema>;

export const leaderboardEntrySchema = z.object({
  userId: z.string(),
  name: z.string(),
  points: z.number(),
  played: z.number(),
  rank: z.number(),
});
export type LeaderboardEntry = z.infer<typeof leaderboardEntrySchema>;

export const courseStudentSchema = z.object({
  email: z.string(),
  name: z.string().nullable(),
  pending: z.boolean(),
});
export type CourseStudent = z.infer<typeof courseStudentSchema>;

/** Estas rutas ya responden en español; el mensaje del servidor se muestra tal cual. */
async function teacherRequest<T>(path: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, credentials: "include" });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const parsed = apiErrorSchema.safeParse(body);
    throw parsed.success
      ? new ApiError(parsed.data.code, parsed.data.message, response.status)
      : new ApiError("UNKNOWN", response.statusText, response.status);
  }
  return schema.parse(body);
}

const json = (method: string, data: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data),
});
const coursePath = (courseId: string) => `/api/courses/${encodeURIComponent(courseId)}`;

export const getCourses = () =>
  teacherRequest(
    "/api/courses",
    z.object({ canCreateCourses: z.boolean(), courses: z.array(courseCardSchema) }),
  );

export const createCourse = (name: string) =>
  teacherRequest("/api/courses", z.object({ id: z.string() }), json("POST", { name }));

export const archiveCourse = (courseId: string) =>
  teacherRequest(
    coursePath(courseId),
    z.object({ id: z.string(), archived: z.literal(true) }),
    { method: "DELETE" },
  );

export function uploadPdf(courseId: string, file: File, week: number) {
  const form = new FormData();
  form.set("kind", "theory");
  form.set("week", String(week));
  form.set("file", file);
  return teacherRequest(`${coursePath(courseId)}/materials`, z.object({ id: z.string() }), {
    method: "POST",
    body: form,
  });
}

export const getCoursePath = (courseId: string) => teacherRequest(coursePath(courseId), coursePathSchema);

export const setWeekUnlocked = (courseId: string, weekNumber: number, unlocked: boolean) =>
  teacherRequest(coursePath(courseId), z.unknown(), json("PATCH", { weekNumber, unlocked }));

export const generateWeek = (courseId: string, weekNumber: number) =>
  teacherRequest(`${coursePath(courseId)}/generation`, z.unknown(), json("POST", { weekNumber }));

export const finishCourse = (courseId: string) =>
  teacherRequest(`${coursePath(courseId)}/finish`, z.unknown(), json("POST", {}));

export const getGame = (courseId: string, gameId: string) =>
  teacherRequest(`${coursePath(courseId)}/games/${gameId}`, editableGameSchema);

export const saveGame = (courseId: string, gameId: string, content: Record<string, unknown>) =>
  teacherRequest(`${coursePath(courseId)}/games/${gameId}`, z.unknown(), json("PATCH", { content }));

export const getLeaderboard = (courseId: string) =>
  teacherRequest(
    `${coursePath(courseId)}/leaderboard`,
    z.object({ leaderboard: z.array(leaderboardEntrySchema) }),
  );

export const getStudents = (courseId: string) =>
  teacherRequest(`${coursePath(courseId)}/students`, z.object({ students: z.array(courseStudentSchema) }));

export const assignStudents = (courseId: string, emails: string[]) =>
  teacherRequest(
    `${coursePath(courseId)}/students`,
    z.object({ enrolled: z.number(), invited: z.number() }),
    json("POST", { emails }),
  );

export const removeStudent = (courseId: string, email: string) =>
  teacherRequest(`${coursePath(courseId)}/students`, z.unknown(), json("DELETE", { email }));

export const resetStudentProgress = (courseId: string, email: string) =>
  teacherRequest(
    `${coursePath(courseId)}/students/progress`,
    z.object({ email: z.string(), removed: z.number() }),
    json("DELETE", { email }),
  );
