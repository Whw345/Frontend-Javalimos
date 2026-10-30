import "server-only";

import { createClient } from "@/lib/supabase/server";
import { DataError } from "./errors";
import { getCurrentStudent, requireCurrentStudent } from "./students";
import { getCurrentTeacher, requireCurrentTeacher } from "./teachers";
import { requireCurrentUser } from "./users";

export type Course = {
  id: number;
  name: string;
  teacherId: number;
  description: string;
};

export type CourseInput = {
  name: string;
  description: string;
};

type CourseRow = {
  id: number;
  name: string;
  teacher_id: number;
  description: string;
};

const columns = "id, name, teacher_id, description";

function toCourse(row: CourseRow): Course {
  return {
    id: row.id,
    name: row.name,
    teacherId: row.teacher_id,
    description: row.description,
  };
}

async function findCourse(id: number): Promise<Course | null> {
  const { data, error } = await createClient()
    .from("course")
    .select(columns)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new DataError("Could not load course", { cause: error });

  return data && toCourse(data);
}

export async function listMyCourses(): Promise<Course[]> {
  const teacher = await requireCurrentTeacher();

  const { data, error } = await createClient()
    .from("course")
    .select(columns)
    .eq("teacher_id", teacher.id)
    .order("id");

  if (error) throw new DataError("Could not load courses", { cause: error });

  return data.map(toCourse);
}

export async function listMyEnrolledCourses(): Promise<Course[]> {
  const student = await requireCurrentStudent();
  const client = createClient();

  const { data: enrollments, error: enrollmentsError } = await client
    .from("course_student")
    .select("course_id")
    .eq("student_id", student.id);

  if (enrollmentsError) {
    throw new DataError("Could not load courses", { cause: enrollmentsError });
  }

  const { data, error } = await client
    .from("course")
    .select(columns)
    .in(
      "id",
      enrollments.map((enrollment) => enrollment.course_id),
    )
    .order("id");

  if (error) throw new DataError("Could not load courses", { cause: error });

  return data.map(toCourse);
}

// Returns null when the course doesn't exist or the user isn't part of it.
export async function getCourse(id: number): Promise<Course | null> {
  await requireCurrentUser();

  const course = await findCourse(id);

  if (!course) return null;

  const teacher = await getCurrentTeacher();

  if (course.teacherId === teacher?.id) return course;

  const student = await getCurrentStudent();

  if (!student) return null;

  const { data, error } = await createClient()
    .from("course_student")
    .select("id")
    .eq("course_id", id)
    .eq("student_id", student.id)
    .maybeSingle();

  if (error) throw new DataError("Could not load course", { cause: error });

  return data && course;
}

export async function requireMyCourse(id: number): Promise<Course> {
  const teacher = await requireCurrentTeacher();
  const course = await findCourse(id);

  if (course?.teacherId !== teacher.id) {
    throw new DataError("Course not found");
  }

  return course;
}

// The count and the insert are separate queries, so two simultaneous requests
// can go over the limit by one.
export async function createMyCourse(input: CourseInput): Promise<Course> {
  const teacher = await requireCurrentTeacher();
  const client = createClient();

  const { count, error: countError } = await client
    .from("course")
    .select("id", { count: "exact", head: true })
    .eq("teacher_id", teacher.id);

  if (countError) {
    throw new DataError("Could not create course", { cause: countError });
  }

  if ((count ?? 0) >= teacher.courseLimit) {
    throw new DataError("Course limit reached");
  }

  const { data, error } = await client
    .from("course")
    .insert({
      name: input.name,
      description: input.description,
      teacher_id: teacher.id,
    })
    .select(columns)
    .single();

  if (error) throw new DataError("Could not create course", { cause: error });

  return toCourse(data);
}

export async function updateMyCourse(
  id: number,
  input: CourseInput,
): Promise<Course> {
  const teacher = await requireCurrentTeacher();

  const { data, error } = await createClient()
    .from("course")
    .update({ name: input.name, description: input.description })
    .eq("id", id)
    .eq("teacher_id", teacher.id)
    .select(columns)
    .single();

  if (error) throw new DataError("Could not update course", { cause: error });

  return toCourse(data);
}

export async function deleteMyCourse(id: number): Promise<void> {
  const teacher = await requireCurrentTeacher();

  const { error } = await createClient()
    .from("course")
    .delete()
    .eq("id", id)
    .eq("teacher_id", teacher.id);

  if (error) throw new DataError("Could not delete course", { cause: error });
}
