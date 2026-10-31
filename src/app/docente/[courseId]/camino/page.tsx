import { LearningPath } from "@/components/teacher/LearningPath";

export default async function LearningPathPage({ params }: { params: Promise<{ courseId: string }> }) {
  return <LearningPath courseId={(await params).courseId} />;
}
