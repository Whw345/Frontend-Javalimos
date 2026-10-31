import { checkOrigin, handleApi } from "@/lib/server/errors";
import { checked, getDatabase, requireCourse } from "@/lib/server/supabase";
import { startChallenge } from "@/lib/server/challenges";

type Context = { params: Promise<{ courseId: string }> };
export async function GET(_request: Request, { params }: Context) {
  return handleApi(async () => {
    const { courseId } = await params;
    await requireCourse(courseId);
    const db = getDatabase();
    const course = checked(await db.from("courses").select("name").eq("id", courseId).single());
    const currentWeek = checked(await db.rpc("course_active_week", { p_course: courseId })) as number;
    const challenges = checked(
      await db
        .from("generated_challenges")
        .select("id, game, difficulty, week_number, opens_at, deadline")
        .eq("course_id", courseId)
        .eq("week_number", currentWeek)
        .eq("status", "published"),
    );
    const now = Date.now();
    return {
      course: { ...course, current_week: currentWeek },
      challenges: challenges.filter(
        ({ opens_at, deadline }) =>
          (!opens_at || Date.parse(opens_at) <= now) && (!deadline || Date.parse(deadline) > now),
      ),
    };
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
