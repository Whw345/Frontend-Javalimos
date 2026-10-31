import { handleApi } from "@/lib/server/errors";
import { getLeaderboard } from "@/lib/server/courses";
import { requireCourse } from "@/lib/server/supabase";

export const runtime = "nodejs";
type Context = { params: Promise<{ courseId: string }> };

export async function GET(_request: Request, { params }: Context) {
  return handleApi(async () => {
    const { courseId } = await params;
    await requireCourse(courseId, true);
    return getLeaderboard(courseId);
  });
}
