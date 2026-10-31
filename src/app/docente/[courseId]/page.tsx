import { CourseAdmin } from "@/components/teacher/CourseAdmin";

export default async function CourseAdminPage({ params }: { params: Promise<{ courseId: string }> }) {
  return <CourseAdmin courseId={(await params).courseId} />;
}
