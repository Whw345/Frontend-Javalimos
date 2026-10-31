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
  teacherRequest("/api/courses", z.object({ courses: z.array(courseCardSchema) }));

export const createCourse = (name: string) =>
  teacherRequest("/api/courses", z.object({ id: z.string() }), json("POST", { name }));

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

export const generateWeek = (courseId: string, weekNumber: number) =>
  teacherRequest(`${coursePath(courseId)}/generation`, z.unknown(), json("POST", { weekNumber }));

export const finishCourse = (courseId: string) =>
  teacherRequest(`${coursePath(courseId)}/finish`, z.unknown(), json("POST", {}));

export const getGame = (courseId: string, gameId: string) =>
  teacherRequest(`${coursePath(courseId)}/games/${gameId}`, editableGameSchema);

export const saveGame = (courseId: string, gameId: string, content: Record<string, unknown>) =>
  teacherRequest(`${coursePath(courseId)}/games/${gameId}`, z.unknown(), json("PATCH", { content }));
