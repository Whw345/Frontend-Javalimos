import { checkOrigin, handleApi } from "@/lib/server/errors";
import { checked, getDatabase, requireCourse } from "@/lib/server/supabase";
import { startChallenge } from "@/lib/server/challenges";

type Context = { params: Promise<{ courseId: string }> };
export async function GET(_request: Request, { params }: Context) {
  return handleApi(async () => {
    const { courseId } = await params;
    await requireCourse(courseId);
    const db = getDatabase();
    const course = checked(await db.from("courses").select("name, current_week").eq("id", courseId).single());
    const challenges = checked(
      await db
        .from("generated_challenges")
        .select("id, game, difficulty, week_number")
        .eq("course_id", courseId)
        .eq("week_number", course.current_week)
        .eq("status", "published"),
    );
    return { course, challenges };
  });
}
export async function POST(request: Request, { params }: Context) {
  return handleApi(async () => {
    checkOrigin(request);
    const { courseId } = await params;
    const { userId } = await requireCourse(courseId);
    return startChallenge(courseId, userId, await request.json());
  });
}
