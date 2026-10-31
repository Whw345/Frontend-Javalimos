import { ResultScreen } from "@/components/game/ResultScreen";

export default async function ChallengeResultPage({ params }: PageProps<"/reto/[sessionId]/resultado">) {
  const { sessionId } = await params;
  return <ResultScreen sessionId={sessionId} />;
}
