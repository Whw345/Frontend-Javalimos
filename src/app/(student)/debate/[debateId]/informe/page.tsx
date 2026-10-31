import { DebateReport } from "@/features/debate/DebateReport";

export default async function DebateReportPage({ params }: PageProps<"/debate/[debateId]/informe">) {
  const { debateId } = await params;
  return <DebateReport debateId={debateId} />;
}
