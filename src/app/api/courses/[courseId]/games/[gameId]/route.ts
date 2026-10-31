import { checkOrigin, handleApi } from "@/lib/server/errors";
import { getGame, updateGame } from "@/lib/server/courses";
import { requireCourse } from "@/lib/server/supabase";

export const runtime = "nodejs";
type Context = { params: Promise<{ courseId: string; gameId: string }> };

// Teacher only: this response contains the solution of the game.
export async function GET(_request: Request, { params }: Context) {
  return handleApi(async () => {
    const { courseId, gameId } = await params;
    await requireCourse(courseId, true);
    return getGame(courseId, gameId);
  });
}

export async function PATCH(request: Request, { params }: Context) {
  return handleApi(async () => {
    checkOrigin(request);
    const { courseId, gameId } = await params;
    await requireCourse(courseId, true);
    return updateGame(courseId, gameId, await request.json());
  });
}
