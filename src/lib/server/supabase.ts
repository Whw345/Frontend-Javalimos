import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSessionCookie } from "better-auth/cookies";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "./auth";
import { HttpError } from "./errors";

export function getDatabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new HttpError(503, "NOT_CONFIGURED", "Falta configurar Supabase en el servidor.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function requireUser() {
  const requestHeaders = await headers();
  if (!getSessionCookie(requestHeaders))
    throw new HttpError(401, "UNAUTHORIZED", "Inicia sesión para continuar.");
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session) throw new HttpError(401, "UNAUTHORIZED", "Tu sesión terminó. Vuelve a iniciar sesión.");
  return session.user.id;
}

export async function requireCourse(courseId: string, teacherOnly = false) {
  const userId = await requireUser();
  if (!z.string().uuid().safeParse(courseId).success) {
    throw new HttpError(403, "FORBIDDEN", "No tienes permiso para acceder a este curso.");
  }
  const { data, error } = await getDatabase()
    .from("course_members")
    .select("role, section")
    .eq("course_id", courseId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data || (teacherOnly && data.role !== "teacher")) {
    throw new HttpError(403, "FORBIDDEN", "No tienes permiso para acceder a este curso.");
  }
  return { userId, role: data.role as string, section: data.section as string };
}

export function checked<T>(result: { data: T; error: unknown }): NonNullable<T> {
  if (result.error) throw result.error;
  if (result.data === null || result.data === undefined)
    throw new HttpError(404, "NOT_FOUND", "No se encontró el recurso solicitado.");
  return result.data;
}
