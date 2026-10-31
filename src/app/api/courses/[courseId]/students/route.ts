import { checkOrigin, handleApi } from "@/lib/server/errors";
import { assignStudents, getStudents, removeStudent } from "@/lib/server/courses";
import { requireCourse } from "@/lib/server/supabase";

export const runtime = "nodejs";
type Context = { params: Promise<{ courseId: string }> };

export async function GET(_request: Request, { params }: Context) {
  return handleApi(async () => {
    const { courseId } = await params;
    await requireCourse(courseId, true);
    return getStudents(courseId);
  });
}

export async function POST(request: Request, { params }: Context) {
  return handleApi(async () => {
    checkOrigin(request);
    const { courseId } = await params;
    await requireCourse(courseId, true);
    return assignStudents(courseId, await request.json());
  });
}

export async function DELETE(request: Request, { params }: Context) {
  return handleApi(async () => {
    checkOrigin(request);
    const { courseId } = await params;
    await requireCourse(courseId, true);
    return removeStudent(courseId, await request.json());
  });
}
