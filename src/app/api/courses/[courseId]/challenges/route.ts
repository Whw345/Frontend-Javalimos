import { checkOrigin, handleApi } from "@/lib/server/errors";
import { requireCourse } from "@/lib/server/supabase";
import { getWeekChallenges, startChallenge } from "@/lib/server/challenges";

type Context = { params: Promise<{ courseId: string }> };
export async function GET(_request: Request, { params }: Context) {
  return handleApi(async () => {
    const { courseId } = await params;
    const { userId } = await requireCourse(courseId);
    return getWeekChallenges(courseId, userId);
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
