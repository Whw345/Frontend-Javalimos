import { z } from "zod";
import { checkOrigin, handleApi, HttpError } from "@/lib/server/errors";
import { checked, getDatabase, requireCourse } from "@/lib/server/supabase";
import { assignDocument, confirmWeeks, suggestWeeks, uploadMaterial } from "@/lib/server/materials";

export const runtime = "nodejs";
type Context = { params: Promise<{ courseId: string }> };

export async function GET(_request: Request, { params }: Context) {
  return handleApi(async () => {
    const { courseId } = await params;
    await requireCourse(courseId, true);
    const db = getDatabase();
    const documents = checked(
      await db
        .from("course_documents")
        .select("id, kind, filename, markdown")
        .eq("course_id", courseId)
        .order("created_at"),
    );
    const weeks = checked(
      await db
        .from("course_weeks")
        .select("week_number, topic, starts_on, confirmed")
        .eq("course_id", courseId)
        .order("week_number"),
    );
    const assignments = checked(
      await db.from("document_weeks").select("document_id, week_number").eq("course_id", courseId),
    );
    const challenges = checked(
      await db
        .from("generated_challenges")
        .select("id, week_number, game, difficulty, status, payload, solution, explanation, source, evidence")
        .eq("course_id", courseId)
        .order("created_at", { ascending: false }),
    );
    const syllabus = documents.filter((document) => document.kind === "syllabus").at(-1);
    return {
      documents,
      weeks,
      assignments,
      challenges,
      suggestedWeeks: syllabus ? suggestWeeks(syllabus.markdown) : [],
    };
  });
}

export async function POST(request: Request, { params }: Context) {
  return handleApi(async () => {
    checkOrigin(request);
    const { courseId } = await params;
    const { userId } = await requireCourse(courseId, true);
    const contentLength = Number(request.headers.get("content-length"));
    if (contentLength > 11 * 1024 * 1024)
      throw new HttpError(413, "INVALID_SIZE", "Carga un PDF de hasta 10 MB por solicitud.");
    const form = await request.formData();
    const kind = z.enum(["syllabus", "theory"]).parse(form.get("kind"));
    const file = form.get("file");
    if (!(file instanceof File)) throw new HttpError(400, "BAD_REQUEST", "Selecciona un PDF.");
    return uploadMaterial(courseId, userId, kind, file);
  });
}

export async function PATCH(request: Request, { params }: Context) {
  return handleApi(async () => {
    checkOrigin(request);
    const { courseId } = await params;
    await requireCourse(courseId, true);
    const input = z
      .discriminatedUnion("action", [
        z.object({ action: z.literal("confirm"), syllabusId: z.string().uuid(), weeks: z.unknown() }),
        z.object({ action: z.literal("assign"), documentId: z.string().uuid(), weekNumbers: z.unknown() }),
      ])
      .parse(await request.json());
    if (input.action === "confirm") return confirmWeeks(courseId, input.syllabusId, input.weeks);
    return assignDocument(courseId, input.documentId, input.weekNumbers);
  });
}
