import { DebateHistoryList } from "@/features/debate/DebateHistoryList";

export default async function DebateHistoryPage({
  params,
}: PageProps<"/cursos/[courseId]/debate/historial">) {
  const { courseId } = await params;
  return <DebateHistoryList courseId={courseId} />;
}
