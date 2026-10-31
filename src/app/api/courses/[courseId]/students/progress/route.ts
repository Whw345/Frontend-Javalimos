import { checkOrigin, handleApi } from "@/lib/server/errors";
import { resetStudentProgress } from "@/lib/server/courses";
import { requireCourse } from "@/lib/server/supabase";

export const runtime = "nodejs";
type Context = { params: Promise<{ courseId: string }> };

// Teachers only: a student who could reset themselves could replay challenges for points.
export async function DELETE(request: Request, { params }: Context) {
  return handleApi(async () => {
    checkOrigin(request);
    const { courseId } = await params;
    await requireCourse(courseId, true);
    return resetStudentProgress(courseId, await request.json());
  });
}
