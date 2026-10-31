import { handleApi } from "@/lib/server/errors";
import { requireCourse } from "@/lib/server/supabase";
import { getProgress } from "@/lib/server/challenges";

export async function GET(_request: Request, { params }: { params: Promise<{ courseId: string }> }) {
  return handleApi(async () => {
    const { courseId } = await params;
    const { userId } = await requireCourse(courseId);
    return getProgress(courseId, userId);
  });
}
