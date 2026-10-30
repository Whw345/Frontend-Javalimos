import "server-only";

import { createClient } from "@/lib/supabase/server";
import { cache } from "react";
import { DataError } from "./errors";
import {
  findUserByEmail,
  getCurrentUser,
  listUsers,
  requireCurrentUser,
  type User,
} from "./users";

export type Student = {
  id: number;
  userId: string;
};

export type StudentProfile = Student & Omit<User, "id">;

type StudentRow = {
  id: number;
  user_id: string;
};

const columns = "id, user_id";

function toStudent(row: StudentRow): Student {
  return { id: row.id, userId: row.user_id };
}

// The student row is created by a database trigger when the user signs up.
export const getCurrentStudent = cache(async (): Promise<Student | null> => {
  const user = await getCurrentUser();

  if (!user) return null;

  const { data, error } = await createClient()
    .from("student")
    .select(columns)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw new DataError("Could not load student", { cause: error });

  return data && toStudent(data);
});

export async function requireCurrentStudent(): Promise<Student> {
  await requireCurrentUser();

  const student = await getCurrentStudent();

  if (!student) throw new DataError("Only students can do this");

  return student;
}

// findStudentByEmail and listStudentProfiles don't check the session, so they
// expose other people's data. Only call them after authorizing the caller.
export async function findStudentByEmail(
  email: string,
): Promise<Student | null> {
  const user = await findUserByEmail(email);

  if (!user) return null;

  const { data, error } = await createClient()
    .from("student")
    .select(columns)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw new DataError("Could not load student", { cause: error });

  return data && toStudent(data);
}

export async function listStudentProfiles(
  ids: number[],
): Promise<StudentProfile[]> {
  const { data, error } = await createClient()
    .from("student")
    .select(columns)
    .in("id", ids);

  if (error) throw new DataError("Could not load students", { cause: error });

  const students = data.map(toStudent);
  const users = await listUsers(students.map((student) => student.userId));
  const usersById = new Map(users.map((user) => [user.id, user]));

  return students.map((student) => {
    const { name, email, image } = usersById.get(student.userId)!;
    return { ...student, name, email, image };
  });
}
