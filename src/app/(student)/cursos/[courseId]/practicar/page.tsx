import { StudentPath } from "@/components/student/StudentPath";

export default async function PracticePage({ params }: { params: Promise<{ courseId: string }> }) {
  return <StudentPath courseId={(await params).courseId} />;
}
