import { checkOrigin, handleApi } from "@/lib/server/errors";
import { createCourse, listCourses } from "@/lib/server/courses";
import { requireTeacher, requireUser } from "@/lib/server/supabase";

export const runtime = "nodejs";

export async function GET() {
  return handleApi(async () => listCourses(await requireUser()));
}

// Sign-up only creates students: teachers come from the teachers table, never from the browser.
export async function POST(request: Request) {
  return handleApi(async () => {
    checkOrigin(request);
    return createCourse(await requireTeacher(), await request.json());
  });
}
