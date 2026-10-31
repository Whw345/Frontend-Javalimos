import { z } from "zod";
import { checkOrigin, handleApi, HttpError } from "@/lib/server/errors";
import { checked, getDatabase, requireCourse } from "@/lib/server/supabase";
import { generateWeek } from "@/lib/server/generation";

export const runtime = "nodejs";
export const maxDuration = 300;
type Context = { params: Promise<{ courseId: string }> };
export async function POST(request: Request, { params }: Context) {
  return handleApi(async () => {
    checkOrigin(request);
    const { courseId } = await params;
    await requireCourse(courseId, true);
    const { weekNumber } = z
      .object({ weekNumber: z.number().int().min(1).max(52) })
      .parse(await request.json());
    return generateWeek(courseId, weekNumber);
  });
}

export async function PATCH(request: Request, { params }: Context) {
  return handleApi(async () => {
    checkOrigin(request);
    const { courseId } = await params;
    await requireCourse(courseId, true);
    const { challengeId, status } = z
      .object({ challengeId: z.string().uuid(), status: z.enum(["published", "discarded"]) })
      .parse(await request.json());
    const challenge = checked(
      await getDatabase()
        .from("generated_challenges")
        .update({ status })
        .eq("id", challengeId)
        .eq("course_id", courseId)
        .select("id")
        .maybeSingle(),
    );
    if (!challenge) throw new HttpError(404, "NOT_FOUND", "No se encontró el reto.");
    return challenge;
  });
}
