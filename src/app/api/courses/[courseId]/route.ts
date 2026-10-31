import { checkOrigin, handleApi } from "@/lib/server/errors";
import { archiveCourse, getCoursePath, setWeekUnlocked } from "@/lib/server/courses";
import { requireCourse } from "@/lib/server/supabase";

export const runtime = "nodejs";
type Context = { params: Promise<{ courseId: string }> };

export async function GET(_request: Request, { params }: Context) {
  return handleApi(async () => {
    const { courseId } = await params;
    await requireCourse(courseId, true);
    return getCoursePath(courseId);
  });
}

export async function PATCH(request: Request, { params }: Context) {
  return handleApi(async () => {
    checkOrigin(request);
    const { courseId } = await params;
    await requireCourse(courseId, true);
    return setWeekUnlocked(courseId, await request.json());
  });
}

export async function DELETE(request: Request, { params }: Context) {
  return handleApi(async () => {
    checkOrigin(request);
    const { courseId } = await params;
    const access = await requireCourse(courseId, true);
    return archiveCourse(courseId, access.userId);
  });
}
