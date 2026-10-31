import "server-only";
import { z } from "zod";
import { checked, getDatabase } from "./supabase";
import { extractPdf } from "./pdf";
import { HttpError } from "./errors";

export const weekSchema = z.object({
  weekNumber: z.number().int().min(1).max(52),
  topic: z.string().trim().min(3).max(160),
  startsOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .default(null),
});
export const weeksSchema = z
  .array(weekSchema)
  .min(1)
  .max(52)
  .refine(
    (weeks) => new Set(weeks.map((week) => week.weekNumber)).size === weeks.length,
    "No repitas semanas.",
  );

// Suggestions are deliberately conservative and always require teacher confirmation.
export function suggestWeeks(markdown: string) {
  const weeks: z.infer<typeof weekSchema>[] = [];
  const pattern = /(?:^|\n)\s*(?:#+\s*)?semana\s+(\d{1,2})\s*[:.\-–|]?\s*([^\n]+)/gi;
  for (const match of markdown.matchAll(pattern)) {
    const weekNumber = Number(match[1]);
    const topic = match[2]?.replace(/\s+/g, " ").trim().slice(0, 160) ?? "";
    if (
      weekNumber >= 1 &&
      weekNumber <= 52 &&
      topic.length >= 3 &&
      !weeks.some((week) => week.weekNumber === weekNumber)
    ) {
      weeks.push({ weekNumber, topic, startsOn: null });
    }
  }
  return weeks;
}

/** Nombre legible del PDF: es el tema de la semana mientras el docente no indique otro. */
export function topicFromFilename(filename: string, weekNumber: number) {
  const topic = filename
    .replace(/\.pdf$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
  return topic.length >= 3 ? topic : `Semana ${weekNumber}`;
}

export async function uploadMaterial(
  courseId: string,
  userId: string,
  kind: "syllabus" | "theory",
  file: File,
  weekNumber?: number,
) {
  const markdown = await extractPdf(file);
  const db = getDatabase();
  const id = crypto.randomUUID();
  try {
    checked(
      await db
        .from("course_documents")
        .insert({
          id,
          course_id: courseId,
          uploaded_by: userId,
          kind,
          filename: file.name.slice(0, 200),
          markdown,
        })
        .select("id")
        .single(),
    );
    if (weekNumber !== undefined) {
      checked(
        await db.rpc("attach_document_week", {
          p_course: courseId,
          p_document: id,
          p_week: weekNumber,
          p_topic: topicFromFilename(file.name, weekNumber),
        }),
      );
    }
  } catch (error) {
    await db.from("course_documents").delete().eq("id", id);
    throw error;
  }
  return {
    id,
    kind,
    filename: file.name,
    markdown,
    suggestedWeeks: kind === "syllabus" ? suggestWeeks(markdown) : [],
  };
}

export async function confirmWeeks(courseId: string, syllabusId: string, input: unknown) {
  const weeks = weeksSchema.parse(input);
  const db = getDatabase();
  const syllabus = checked(
    await db
      .from("course_documents")
      .select("id")
      .eq("id", syllabusId)
      .eq("course_id", courseId)
      .eq("kind", "syllabus")
      .maybeSingle(),
  );
  if (!syllabus) throw new HttpError(404, "NOT_FOUND", "No se encontró el sílabo del curso.");
  const result = await db.rpc("confirm_course_weeks", {
    p_course: courseId,
    p_syllabus: syllabusId,
    p_weeks: weeks,
  });
  if (result.error)
    throw new HttpError(
      422,
      "INVALID_WEEKS",
      "No se pudieron confirmar las semanas. No puedes eliminar una semana que ya tiene retos.",
    );
  return { weeks };
}

export async function assignDocument(courseId: string, documentId: string, input: unknown) {
  const weekNumbers = z.array(z.number().int().min(1).max(52)).max(52).parse(input);
  const db = getDatabase();
  const document = checked(
    await db
      .from("course_documents")
      .select("id")
      .eq("id", documentId)
      .eq("course_id", courseId)
      .eq("kind", "theory")
      .maybeSingle(),
  );
  const weeks = checked(
    await db
      .from("course_weeks")
      .select("week_number")
      .eq("course_id", courseId)
      .eq("confirmed", true)
      .in("week_number", weekNumbers),
  );
  if (!document || weeks.length !== new Set(weekNumbers).size)
    throw new HttpError(
      422,
      "INVALID_ASSIGNMENT",
      "Confirma las semanas y selecciona material de este curso.",
    );
  checked(
    await db.rpc("assign_document_weeks", {
      p_course: courseId,
      p_document: documentId,
      p_weeks: [...new Set(weekNumbers)],
    }),
  );
  return { assigned: true };
}

export async function getWeekContext(courseId: string, weekNumber: number) {
  const db = getDatabase();
  const week = checked(
    await db
      .from("course_weeks")
      .select("topic, confirmed")
      .eq("course_id", courseId)
      .eq("week_number", weekNumber)
      .maybeSingle(),
  );
  if (!week?.confirmed)
    throw new HttpError(422, "UNCONFIRMED_WEEK", "El docente debe confirmar el tema de esta semana.");
  const assignments = checked(
    await db
      .from("document_weeks")
      .select("document_id")
      .eq("course_id", courseId)
      .eq("week_number", weekNumber),
  );
  if (!assignments.length)
    throw new HttpError(422, "NO_MATERIAL", "Asigna al menos un PDF teórico a esta semana.");
  const documents = checked(
    await db
      .from("course_documents")
      .select("id, filename, markdown")
      .eq("course_id", courseId)
      .eq("kind", "theory")
      .in(
        "id",
        assignments.map((item) => item.document_id),
      ),
  );
  const markdown = documents
    .map((document) => `Documento: ${document.filename}\n${document.markdown}`)
    .join("\n\n");
  if (markdown.length > 100_000)
    throw new HttpError(422, "CONTEXT_TOO_LONG", "Asigna menos material a esta semana.");
  return {
    courseId,
    weekNumber,
    topic: week.topic as string,
    markdown,
    sources: documents.map((document) => ({
      id: document.id as string,
      filename: document.filename as string,
      markdown: document.markdown as string,
    })),
  };
}
