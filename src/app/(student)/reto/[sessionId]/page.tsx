import { ChallengeScreen } from "@/components/game/ChallengeScreen";

export default async function ChallengePage({ params }: PageProps<"/reto/[sessionId]">) {
  const { sessionId } = await params;
  return <ChallengeScreen sessionId={sessionId} />;
}
