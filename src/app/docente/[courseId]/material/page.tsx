import { TeacherWorkspace } from "@/components/materials/TeacherWorkspace";

/** Flujo anterior con sílabo: se conserva para cursos que ya lo usan. */
export default async function TeacherMaterialPage({ params }: { params: Promise<{ courseId: string }> }) {
  return <TeacherWorkspace courseId={(await params).courseId} />;
}
