import { checkOrigin, handleApi } from "@/lib/server/errors";
import { createCourse, listCourses } from "@/lib/server/courses";
import { requireUser } from "@/lib/server/supabase";

export const runtime = "nodejs";

export async function GET() {
  return handleApi(async () => listCourses(await requireUser()));
}

// Whoever creates a course becomes its teacher: the role never comes from the browser.
export async function POST(request: Request) {
  return handleApi(async () => {
    checkOrigin(request);
    return createCourse(await requireUser(), await request.json());
  });
}
