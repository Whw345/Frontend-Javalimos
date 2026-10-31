import { TeacherWorkspace } from "@/components/materials/TeacherWorkspace";

export default async function TeacherPage({ params }: { params: Promise<{ courseId: string }> }) {
  return <TeacherWorkspace courseId={(await params).courseId} />;
}
