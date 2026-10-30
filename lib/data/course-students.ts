import "server-only";

import { createClient } from "@/lib/supabase/server";
import { requireMyCourse } from "./courses";
import { DataError } from "./errors";
import {
  findStudentByEmail,
  listStudentProfiles,
  requireCurrentStudent,
} from "./students";

export type CourseStudent = {
  id: number;
  courseId: number;
  studentId: number;
  latestFinishedGame: number | null;
  points: number;
};

export type CourseStudentWithProfile = CourseStudent & {
  name: string;
  email: string;
  image: string | null;
};

export type CourseProgress = {
  latestFinishedGame: number | null;
  points: number;
};

type CourseStudentRow = {
  id: number;
  course_id: number;
  student_id: number;
  latest_finished_game: number | null;
  points: number;
};

const columns = "id, course_id, student_id, latest_finished_game, points";

function toCourseStudent(row: CourseStudentRow): CourseStudent {
  return {
    id: row.id,
    courseId: row.course_id,
    studentId: row.student_id,
    latestFinishedGame: row.latest_finished_game,
    points: row.points,
  };
}

export async function listMyCourseStudents(
  courseId: number,
): Promise<CourseStudentWithProfile[]> {
  await requireMyCourse(courseId);

  const { data, error } = await createClient()
    .from("course_student")
    .select(columns)
    .eq("course_id", courseId)
    .order("points", { ascending: false });

  if (error) throw new DataError("Could not load students", { cause: error });

  const courseStudents = data.map(toCourseStudent);
  const profiles = await listStudentProfiles(
    courseStudents.map((courseStudent) => courseStudent.studentId),
  );
  const profilesById = new Map(
    profiles.map((profile) => [profile.id, profile]),
  );

  return courseStudents.map((courseStudent) => {
    const { name, email, image } = profilesById.get(courseStudent.studentId)!;
    return { ...courseStudent, name, email, image };
  });
}

// The student must have an account already. Nothing is sent to them: they just
// see the course in listMyEnrolledCourses().
export async function inviteStudentToMyCourse(
  courseId: number,
  email: string,
): Promise<CourseStudent> {
  await requireMyCourse(courseId);

  const student = await findStudentByEmail(email);

  if (!student) throw new DataError("No student has this email");

  const { data, error } = await createClient()
    .from("course_student")
    .insert({ course_id: courseId, student_id: student.id })
    .select(columns)
    .single();

  if (error?.code === "23505") {
    throw new DataError("Student is already in this course", { cause: error });
  }

  if (error) throw new DataError("Could not invite student", { cause: error });

  return toCourseStudent(data);
}

export async function removeStudentFromMyCourse(
  courseId: number,
  studentId: number,
): Promise<void> {
  await requireMyCourse(courseId);

  const { error } = await createClient()
    .from("course_student")
    .delete()
    .eq("course_id", courseId)
    .eq("student_id", studentId);

  if (error) throw new DataError("Could not remove student", { cause: error });
}

export async function getMyProgress(
  courseId: number,
): Promise<CourseStudent | null> {
  const student = await requireCurrentStudent();

  const { data, error } = await createClient()
    .from("course_student")
    .select(columns)
    .eq("course_id", courseId)
    .eq("student_id", student.id)
    .maybeSingle();

  if (error) throw new DataError("Could not load progress", { cause: error });

  return data && toCourseStudent(data);
}

// Compute these values on the server. If they came straight from a form, a
// student could send any score.
export async function saveMyProgress(
  courseId: number,
  progress: CourseProgress,
): Promise<CourseStudent> {
  const student = await requireCurrentStudent();

  const { data, error } = await createClient()
    .from("course_student")
    .update({
      latest_finished_game: progress.latestFinishedGame,
      points: progress.points,
    })
    .eq("course_id", courseId)
    .eq("student_id", student.id)
    .select(columns)
    .single();

  if (error) throw new DataError("Could not save progress", { cause: error });

  return toCourseStudent(data);
}
