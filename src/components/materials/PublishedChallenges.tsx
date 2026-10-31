"use client";

import { CircleCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { CuyFrontal } from "@/components/brand/CuyFrontal";
import { GameIcon } from "@/components/game/GameIcon";
import { PointsCounter } from "@/components/gamification/PointsCounter";
import { StreakBadge } from "@/components/gamification/StreakBadge";
import { WeeklyQuota } from "@/components/gamification/WeeklyQuota";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { copy } from "@/content/copy";
import { getGameDefinition } from "@/games/registry";
import { ApiError, errorMessage } from "@/lib/api/client";
import { useCourseProgress, useCreateChallenge, useWeekChallenges } from "@/lib/api/queries";
import type { WeekChallenge } from "@/lib/api/schemas";
import { formatDeadline } from "@/lib/utils/schedule";

const t = copy.practice;

/** Retos publicados de la semana en curso, con lo que este alumno ya jugó. */
export function PublishedChallenges({ courseId }: { courseId: string }) {
  const router = useRouter();
  const week = useWeekChallenges(courseId);
  const progress = useCourseProgress(courseId);
  const createChallenge = useCreateChallenge(courseId);
  const unauthorized = week.error instanceof ApiError && week.error.status === 401;
  useEffect(() => {
    if (unauthorized) router.replace("/ingresar");
  }, [unauthorized, router]);

  const challenges = week.data?.challenges ?? [];
  const deadline = challenges[0]?.deadline;
  const limitReached = progress.data ? progress.data.weeklyPlayed >= progress.data.weeklyLimit : false;
  const busy = createChallenge.isPending || createChallenge.isSuccess;

  const play = ({ id, game, difficulty }: WeekChallenge) =>
    createChallenge.mutate(
      { challengeId: id, game, difficulty },
      {
        onSuccess: (session) => router.push(`/reto/${session.sessionId}`),
        // La semana pudo cambiar con la pantalla abierta.
        onError: () => void week.refetch(),
      },
    );

  return (
    <div className="min-h-dvh bg-(image:--gradient-night) px-4 py-8 md:px-6 lg:px-8 lg:py-12">
      <main className="mx-auto flex w-full max-w-300 flex-col gap-8 lg:gap-12">
        <Link href="/cursos" className={buttonVariants({ variant: "secondary", className: "self-start" })}>
          {copy.teacher.backToCourses}
        </Link>

        <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-2">
            <p className="type-overline text-reward">
              {week.data ? t.week(week.data.course.current_week) : copy.picker.overline}
            </p>
            <h1 className="type-h1 text-text">{week.data?.course.name ?? copy.picker.title}</h1>
            <p className="max-w-prose type-body text-text-secondary">{copy.picker.subtitle}</p>
            {deadline && (
              <p className="type-caption text-text-muted">{t.deadline(formatDeadline(deadline))}</p>
            )}
          </div>
          <Card className="flex w-full flex-col gap-3 lg:w-80">
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

        {week.isPending && <Skeleton className="h-64" />}
        {week.isError && !unauthorized && (
          <EmptyState
            title={t.loadFailed}
            action={
              <Button variant="secondary" onClick={() => week.refetch()}>
                {copy.common.retry}
              </Button>
            }
          />
        )}
        {week.data && !challenges.length && (
          <div className="flex flex-col items-center gap-4 py-12">
            <CuyFrontal expresion="animo" size={96} />
            <EmptyState title={t.empty} description={t.emptyHint} />
          </div>
        )}

        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {challenges.map((challenge) => (
            <li key={challenge.id}>
              <ChallengeCard
                challenge={challenge}
                limitReached={limitReached}
                disabled={busy}
                loading={busy && createChallenge.variables?.challengeId === challenge.id}
                onPlay={() => play(challenge)}
              />
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}

interface ChallengeCardProps {
  challenge: WeekChallenge;
  limitReached: boolean;
  disabled: boolean;
  loading: boolean;
  onPlay: () => void;
}

function ChallengeCard({ challenge, limitReached, disabled, loading, onPlay }: ChallengeCardProps) {
  const definition = getGameDefinition(challenge.game);
  if (!definition) return null;
  return (
    <Card interactive={!challenge.played} className="flex h-full flex-col gap-4">
      <div className="flex items-start justify-between">
        <GameIcon definition={definition} />
        <span className="type-caption text-text-muted">{copy.picker.levelOption(challenge.difficulty)}</span>
      </div>
      <div className="flex flex-col gap-1">
        <h2 className="type-h3 text-text">{definition.name}</h2>
        <p className="type-body text-text-secondary">{definition.description}</p>
      </div>
      {challenge.played ? (
        <p className="mt-auto flex min-h-11 items-center gap-2 type-label text-text-secondary">
          <CircleCheck aria-hidden className="size-5 text-success" />
          {t.played(challenge.points ?? 0)}
        </p>
      ) : (
        <Button
          size="lg"
          className="mt-auto w-full"
          disabled={limitReached || disabled}
          loading={loading}
          onClick={onPlay}
        >
          {limitReached ? copy.picker.weeklyLimitReached : copy.picker.play}
        </Button>
      )}
    </Card>
  );
}
