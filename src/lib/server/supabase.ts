import "server-only";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { HttpError } from "./errors";

export function getDatabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new HttpError(503, "NOT_CONFIGURED", "Falta configurar Supabase en el servidor.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function requireUser() {
  const token = (await cookies()).get("javalimos-access")?.value;
  if (!token) throw new HttpError(401, "UNAUTHORIZED", "Inicia sesión para continuar.");
  const { data, error } = await getDatabase().auth.getUser(token);
  if (error || !data.user)
    throw new HttpError(401, "UNAUTHORIZED", "Tu sesión terminó. Vuelve a iniciar sesión.");
  return data.user.id;
}

export async function requireCourse(courseId: string, teacherOnly = false) {
  const userId = await requireUser();
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
