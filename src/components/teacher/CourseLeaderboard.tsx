"use client";

import { useQuery } from "@tanstack/react-query";
import { CuyFrontal } from "@/components/brand/CuyFrontal";
import { LeaderboardPodium } from "@/components/gamification/LeaderboardPodium";
import { LeaderboardRow } from "@/components/gamification/LeaderboardRow";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { copy } from "@/content/copy";
import { getLeaderboard } from "@/lib/api/teacher";

const t = copy.teacher.admin.ranking;

export function CourseLeaderboard({ courseId, onAssign }: { courseId: string; onAssign: () => void }) {
  const ranking = useQuery({
    queryKey: ["teacher", "leaderboard", courseId],
    queryFn: () => getLeaderboard(courseId),
    staleTime: 0,
    retry: false,
  });
  if (ranking.isPending) return <Skeleton className="h-64" />;
  if (ranking.isError)
    return (
      <EmptyState
        title={t.loadFailed}
        action={
          <Button variant="secondary" onClick={() => ranking.refetch()}>
            {copy.common.retry}
          </Button>
        }
      />
    );
  const entries = ranking.data.leaderboard;
  if (entries.length === 0)
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <CuyFrontal expresion="animo" size={96} />
        <EmptyState
          title={t.empty}
          description={t.emptyHint}
          action={
            <Button variant="secondary" onClick={onAssign}>
              {t.assign}
            </Button>
          }
        />
      </div>
    );
  const podium = entries.filter((entry) => entry.points > 0).slice(0, 3);
  return (
    <section className="flex flex-col gap-6">
      <h2 className="type-h2 text-text">{t.title}</h2>
      {podium.length === 3 && <LeaderboardPodium entries={podium} />}
      {podium.length === 0 && (
        <div className="flex items-center gap-3 text-text-secondary">
          <CuyFrontal expresion="animo" size={64} />
          <p className="type-body">{t.noScores}</p>
        </div>
      )}
      <ol className="flex flex-col gap-2">
        {entries.map((entry) => (
          <LeaderboardRow key={entry.userId} entry={entry} />
        ))}
      </ol>
    </section>
  );
}
