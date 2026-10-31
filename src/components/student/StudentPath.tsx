"use client";

import { Lock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CuyFrontal } from "@/components/brand/CuyFrontal";
import { CURVE, pathOffsets } from "@/components/game/pathStyle";
import { PointsCounter } from "@/components/gamification/PointsCounter";
import { StreakBadge } from "@/components/gamification/StreakBadge";
import { WeeklyQuota } from "@/components/gamification/WeeklyQuota";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { copy } from "@/content/copy";
import { ApiError, errorMessage } from "@/lib/api/client";
import { useCourseProgress, useCreateChallenge, useStudentPath } from "@/lib/api/queries";
import type { PathGame, StudentWeek } from "@/lib/api/schemas";
import { cn } from "@/lib/utils/cn";
import { formatDeadline } from "@/lib/utils/schedule";
import { PathGameNode } from "./PathGameNode";

const t = copy.practice;

function weekNote(week: StudentWeek) {
  if (week.state === "future") return week.opensAt ? t.opens(formatDeadline(week.opensAt)) : t.soon;
  if (week.state === "past") return t.closed;
  return week.deadline ? t.deadline(formatDeadline(week.deadline)) : null;
}

function WeekBanner({ week }: { week: StudentWeek }) {
  const note = weekNote(week);
  const future = week.state === "future";
  return (
    <div
      className={cn(
        "flex w-full items-start justify-between gap-3 rounded-lg p-4",
        week.state === "current"
          ? "bg-(image:--gradient-dusk) text-text-on-primary"
          : "border border-border bg-surface text-text-muted",
      )}
    >
      <div className="min-w-0">
        <p className="type-overline">{t.week(week.weekNumber)}</p>
        {week.topic && <h2 className="type-h3">{week.topic}</h2>}
        {note && <p className="type-caption">{note}</p>}
      </div>
      {week.state === "current" && (
        <span className="shrink-0 rounded-sm bg-text-on-primary/15 px-2 py-1 type-caption">{t.thisWeek}</span>
      )}
      {future && <Lock aria-hidden className="size-5 shrink-0" />}
    </div>
  );
}

/** Mismo camino que ve el docente: lo pasado queda, lo actual se juega y lo futuro sigue oculto. */
export function StudentPath({ courseId }: { courseId: string }) {
  const router = useRouter();
  const path = useStudentPath(courseId);
  const progress = useCourseProgress(courseId);
  const createChallenge = useCreateChallenge(courseId);
  const [openGame, setOpenGame] = useState<string | null>(null);
  const unauthorized = path.error instanceof ApiError && path.error.status === 401;
  useEffect(() => {
    if (unauthorized) router.replace("/ingresar");
  }, [unauthorized, router]);

  const weeks = path.data?.weeks ?? [];
  const offsets = pathOffsets(weeks.map((week) => week.games.length + week.hiddenGames));
  const currentGames = weeks.find((week) => week.state === "current")?.games ?? [];
  const pending = currentGames.some((game) => game.status === "available");
  const limitReached = progress.data ? progress.data.weeklyPlayed >= progress.data.weeklyLimit : false;
  const busy = createChallenge.isPending || createChallenge.isSuccess;

  const play = ({ id, game, difficulty }: PathGame) =>
    createChallenge.mutate(
      { challengeId: id, game, difficulty },
      {
        onSuccess: (session) => router.push(`/reto/${session.sessionId}`),
        // La semana pudo cambiar con la pantalla abierta.
        onError: () => void path.refetch(),
      },
    );

  return (
    <div className="min-h-dvh bg-(image:--gradient-night) px-4 py-8 md:px-6 lg:py-12">
      <main className="mx-auto flex w-full max-w-xl flex-col gap-8">
        <Link href="/cursos" className={buttonVariants({ variant: "secondary", className: "self-start" })}>
          {copy.teacher.backToCourses}
        </Link>

        <header className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <p className="type-overline text-reward">
              {path.data ? t.week(path.data.course.current_week) : copy.picker.overline}
            </p>
            <h1 className="type-h1 text-text">{path.data?.course.name ?? copy.picker.title}</h1>
            <p className="max-w-prose type-body text-text-secondary">{copy.picker.subtitle}</p>
          </div>
          <Card className="flex flex-col gap-3">
            {progress.data ? (
              <>
                <div className="flex items-center gap-3">
                  <PointsCounter points={progress.data.points} />
                  <StreakBadge streakDays={progress.data.streakDays} />
                </div>
                <WeeklyQuota played={progress.data.weeklyPlayed} limit={progress.data.weeklyLimit} />
              </>
            ) : (
              <Skeleton className="h-16 w-full" />
            )}
          </Card>
        </header>

        {createChallenge.isError && (
          <p role="alert" className="type-body text-text-secondary">
            {errorMessage(createChallenge.error)}
          </p>
        )}

        {path.isPending && <Skeleton className="h-96" />}
        {path.isError && !unauthorized && (
          <EmptyState
            title={t.loadFailed}
            action={
              <Button variant="secondary" onClick={() => path.refetch()}>
                {copy.common.retry}
              </Button>
            }
          />
        )}
        {path.data && !pending && (
          <div role="status" className="flex items-center gap-4">
            <CuyFrontal expresion={currentGames.length ? "feliz" : "animo"} size={72} />
            <p className="type-body text-text-secondary">
              {currentGames.length ? t.allPlayed : `${t.empty}. ${t.emptyHint}`}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-12">
          {weeks.map((week, weekIndex) => (
            <section
              key={week.weekNumber}
              aria-label={t.week(week.weekNumber)}
              className="flex flex-col items-center gap-8"
            >
              <WeekBanner week={week} />
              <ul className="flex flex-col items-center gap-6">
                {week.games.map((game, index) => (
                  <PathGameNode
                    key={game.id}
                    game={game}
                    weekNumber={week.weekNumber}
                    curve={CURVE[(offsets[weekIndex]! + index) % CURVE.length]!}
                    open={openGame === game.id}
                    limitReached={limitReached}
                    disabled={busy}
                    loading={busy && createChallenge.variables?.challengeId === game.id}
                    onOpen={() => setOpenGame(game.id)}
                    onClose={() => setOpenGame((current) => (current === game.id ? null : current))}
                    onPlay={() => play(game)}
                  />
                ))}
                {Array.from({ length: week.hiddenGames }, (_, index) => (
                  <li
                    key={index}
                    aria-label={t.locked}
                    style={{ transform: `translateX(${CURVE[(offsets[weekIndex]! + index) % CURVE.length]}px)` }}
                    className="flex size-18 items-center justify-center rounded-full bg-surface-raised text-text-muted opacity-60 shadow-[0_6px_0_var(--color-border)]"
                  >
                    <Lock aria-hidden className="size-6" />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
