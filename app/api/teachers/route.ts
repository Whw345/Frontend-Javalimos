import { findOrganizationByApiKey } from "@/lib/data/organizations";
import { createTeacher } from "@/lib/data/teachers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const apiKey = request.headers.get("x-api-key");
  const organization = apiKey && (await findOrganizationByApiKey(apiKey));

  if (!organization) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const { email, courseLimit } = body ?? {};

  if (
    typeof email !== "string" ||
    !Number.isInteger(courseLimit) ||
    courseLimit < 0
  ) {
    return NextResponse.json(
      { error: "Send an email and a courseLimit of 0 or more" },
      { status: 400 },
    );
  }

  const teacher = await createTeacher(organization.id, email, courseLimit);

  if (!teacher) {
    return NextResponse.json(
      { error: "No available user has this email" },
      { status: 404 },
    );
  }

  return NextResponse.json(teacher);
}
