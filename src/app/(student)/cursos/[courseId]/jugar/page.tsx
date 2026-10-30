import { GamePicker } from "@/components/game/GamePicker";

export default async function PlayPage({ params }: PageProps<"/cursos/[courseId]/jugar">) {
  const { courseId } = await params;
  return <GamePicker courseId={courseId} />;
}
