import { DebateIntro } from "@/features/debate/DebateIntro";

export default async function DebateIntroPage({ params }: PageProps<"/cursos/[courseId]/debate">) {
  const { courseId } = await params;
  return <DebateIntro courseId={courseId} />;
}
