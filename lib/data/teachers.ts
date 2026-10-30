import "server-only";

import { createClient } from "@/lib/supabase/server";
import { cache } from "react";
import { DataError } from "./errors";
import { findUserByEmail, getCurrentUser, requireCurrentUser } from "./users";

export type Teacher = {
  id: number;
  userId: string;
  organizationId: number;
  courseLimit: number;
};

type TeacherRow = {
  id: number;
  user_id: string;
  organization_id: number;
  course_limit: number;
};

const columns = "id, user_id, organization_id, course_limit";

function toTeacher(row: TeacherRow): Teacher {
  return {
    id: row.id,
    userId: row.user_id,
    organizationId: row.organization_id,
    courseLimit: row.course_limit,
  };
}

export const getCurrentTeacher = cache(async (): Promise<Teacher | null> => {
  const user = await getCurrentUser();

  if (!user) return null;

  const { data, error } = await createClient()
    .from("teacher")
    .select(columns)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw new DataError("Could not load teacher", { cause: error });

  return data && toTeacher(data);
});

export async function requireCurrentTeacher(): Promise<Teacher> {
  await requireCurrentUser();

  const teacher = await getCurrentTeacher();

  if (!teacher) throw new DataError("Only teachers can do this");

  return teacher;
}

// Doesn't check the session: anyone reaching this could become a teacher. Only
// app/api/teachers may call it, with the organization of a valid API key. Calling
// it again for the same email updates the course limit. Returns null if no user
// has the email, or if that user teaches in another organization.
export async function createTeacher(
  organizationId: number,
  email: string,
  courseLimit: number,
): Promise<Teacher | null> {
  const user = await findUserByEmail(email);

  if (!user) return null;

  const client = createClient();

  const { data: existing, error: existingError } = await client
    .from("teacher")
    .select("organization_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingError) {
    throw new DataError("Could not create teacher", { cause: existingError });
  }

  if (existing && existing.organization_id !== organizationId) return null;

  const { data, error } = await client
    .from("teacher")
    .upsert(
      {
        user_id: user.id,
        organization_id: organizationId,
        course_limit: courseLimit,
      },
      { onConflict: "user_id" },
    )
    .select(columns)
    .single();

  if (error) throw new DataError("Could not create teacher", { cause: error });

  return toTeacher(data);
}
