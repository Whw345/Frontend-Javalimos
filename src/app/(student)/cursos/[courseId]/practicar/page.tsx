import { PublishedChallenges } from "@/components/materials/PublishedChallenges";

export default async function PracticePage({ params }: { params: Promise<{ courseId: string }> }) {
  return <PublishedChallenges courseId={(await params).courseId} />;
}
