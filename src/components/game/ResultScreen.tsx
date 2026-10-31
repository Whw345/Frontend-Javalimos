"use client";

import { Clock, Flame, Sparkles, Trophy, Zap } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { StarRating } from "@/components/gamification/StarRating";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { copy } from "@/content/copy";
import { API_MOCKING_ENABLED } from "@/lib/config";
import { getGameDefinition } from "@/games/registry";
import { useOutcome } from "@/lib/api/queries";
import { cn } from "@/lib/utils/cn";
import { formatDuration, formatNumber } from "@/lib/utils/format";
import { computeStars } from "@/lib/utils/stars";
import { GameIcon } from "./GameIcon";

/** Pantalla de resultado del reto (§13). */
export function ResultScreen({ sessionId }: { sessionId: string }) {
  const outcome = useOutcome(sessionId);

  if (!outcome) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg px-4">
        <EmptyState
          title={copy.result.notFoundTitle}
          description={copy.result.notFoundBody}
          action={
            <Link href="/" className={buttonVariants({ variant: "primary" })}>
              {copy.common.backToChallenges}
            </Link>
          }
        />
      </div>
    );
  }

  const { session, result, hintUsed, elapsedMs, totalMs } = outcome;
  const definition = getGameDefinition(session.game);
  const stars = computeStars({ correct: result.correct, hintUsed, elapsedMs, totalMs });
  const remaining = Math.max(0, result.totals.weeklyLimit - result.totals.weeklyPlayed);
  const playHref = `/cursos/${session.courseId}/${API_MOCKING_ENABLED ? "jugar" : "practicar"}`;

  return (
    <div className="min-h-dvh bg-(image:--gradient-night) px-4 py-8 md:px-6 lg:px-8 lg:py-12">
      <main className="mx-auto grid w-full max-w-160 gap-6 lg:max-w-240 lg:grid-cols-2 lg:items-center lg:gap-12">
        <section className="flex flex-col items-center gap-4 text-center lg:items-start lg:text-left">
          {definition && (
            <p className="flex items-center gap-2 type-label text-text-secondary">
              <GameIcon definition={definition} size="sm" />
              {definition.name} · {copy.shell.meta(session.week, session.difficulty)}
            </p>
          )}
          <h1 className="type-display text-text">
            {result.correct ? copy.result.titleCorrect : copy.result.titleIncorrect}
          </h1>
          <StarRating stars={stars} />
          <p
            className={cn(
              "inline-flex items-center gap-2 type-display-xl tabular-nums",
              result.pointsAwarded > 0 ? "text-reward" : "text-text-muted",
            )}
          >
            <Sparkles aria-hidden className="size-10" />
            {copy.feedback.earned(result.pointsAwarded)}
          </p>
          <p className="max-w-prose type-body text-text-secondary">{result.explanation}</p>
        </section>

        <section className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Stat
              icon={<Sparkles />}
              label={copy.result.totalPoints}
              value={copy.common.points(formatNumber(result.totals.points))}
            />
            <Stat icon={<Clock />} label={copy.result.timeUsed} value={formatDuration(elapsedMs)} />
            <Stat
              icon={<Flame />}
              label={copy.result.streak}
              value={copy.result.streakValue(result.totals.streakDays)}
            />
            <Stat
              icon={<Zap />}
              label={copy.result.weeklyRemaining}
              value={copy.result.weeklyRemainingValue(remaining)}
            />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href={playHref} className={cn(buttonVariants({ size: "lg" }), "flex-1")}>
              {copy.result.nextChallenge}
            </Link>
            <Button variant="secondary" size="lg" disabled title={copy.common.comingSoon} className="flex-1">
              <Trophy aria-hidden />
              {copy.result.viewRanking}
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <Card className="flex flex-col gap-1">
      <span className="flex items-center gap-1 type-caption text-text-muted [&_svg]:size-4">
        {icon}
        {label}
      </span>
      <span className="type-h3 text-text tabular-nums">{value}</span>
    </Card>
  );
}
