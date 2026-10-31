import { DebateScreen } from "@/features/debate/DebateScreen";

export default async function DebatePage({ params, searchParams }: PageProps<"/debate/[debateId]">) {
  const [{ debateId }, { modo }] = await Promise.all([params, searchParams]);
  return <DebateScreen debateId={debateId} initialMode={modo === "voz" ? "voz" : "texto"} />;
}
