"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PointsCounter } from "@/components/gamification/PointsCounter";
import { StreakBadge } from "@/components/gamification/StreakBadge";
import { WeeklyQuota } from "@/components/gamification/WeeklyQuota";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { copy } from "@/content/copy";
import { availableGames, type AnyGameDefinition } from "@/games/registry";
import type { Difficulty } from "@/games/types";
import { errorMessage } from "@/lib/api/client";
import { useCourseProgress, useCreateChallenge } from "@/lib/api/queries";
import { cn } from "@/lib/utils/cn";
import { GameIcon, accentTextClasses } from "./GameIcon";

const DIFFICULTIES: Difficulty[] = [1, 2, 3];

/**
 * Selección de reto con tarjetas numeradas (patrón plantilla 3, §6.5).
 * El selector de nivel es provisional hasta cerrar la decisión pendiente #3 (§20).
 */
export function GamePicker({ courseId }: { courseId: string }) {
  const progress = useCourseProgress(courseId);
  const limitReached = progress.data ? progress.data.weeklyPlayed >= progress.data.weeklyLimit : false;

  return (
    <div className="min-h-dvh bg-(image:--gradient-night) px-4 py-8 md:px-6 lg:px-8 lg:py-12">
      <main className="mx-auto flex w-full max-w-300 flex-col gap-8 lg:gap-12">
        <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-2">
            <p className="type-overline text-reward">{copy.picker.overline}</p>
            <h1 className="type-h1 text-text">{copy.picker.title}</h1>
            <p className="max-w-prose type-body text-text-secondary">{copy.picker.subtitle}</p>
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

        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {availableGames.map((definition, index) => (
            <li key={definition.slug}>
              <GamePickerCard
                courseId={courseId}
                definition={definition}
                number={index + 1}
                limitReached={limitReached}
              />
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}

interface GamePickerCardProps {
  courseId: string;
  definition: AnyGameDefinition;
  number: number;
  limitReached: boolean;
}

function GamePickerCard({ courseId, definition, number, limitReached }: GamePickerCardProps) {
  const router = useRouter();
  const [difficulty, setDifficulty] = useState<Difficulty>(1);
  const createChallenge = useCreateChallenge(courseId);
  const labelId = `level-${definition.slug}`;

  const play = () =>
    createChallenge.mutate(
      { game: definition.slug, difficulty },
      { onSuccess: (session) => router.push(`/reto/${session.sessionId}`) },
    );

  return (
    <Card interactive className="flex h-full flex-col gap-4">
      <div className="flex items-start justify-between">
        <span className={cn("type-display tabular-nums", accentTextClasses[definition.accent])}>
          {number.toString().padStart(2, "0")}
        </span>
        <GameIcon definition={definition} />
      </div>
      <div className="flex flex-col gap-1">
        <h2 className="type-h3 text-text">{definition.name}</h2>
        <p className="type-body text-text-secondary">{definition.description}</p>
      </div>

      <div className="flex flex-col gap-2">
        <p id={labelId} className="type-caption text-text-muted">
          {copy.picker.level}
        </p>
        <div role="radiogroup" aria-labelledby={labelId} className="flex gap-2">
          {DIFFICULTIES.map((level) => (
            <button
              key={level}
              type="button"
              role="radio"
              aria-checked={difficulty === level}
              onClick={() => setDifficulty(level)}
              className={cn(
                "h-11 flex-1 rounded-full border type-label transition-colors duration-(--duration-fast) focus-visible:shadow-glow-primary",
                difficulty === level
                  ? "border-primary bg-primary-soft text-text"
                  : "border-border text-text-secondary hover:border-border-strong",
              )}
            >
              {copy.picker.levelOption(level)}
            </button>
          ))}
        </div>
      </div>

      {createChallenge.isError && (
        <p role="alert" className="type-body text-text-secondary">
          {errorMessage(createChallenge.error)}
        </p>
      )}

      <Button
        size="lg"
        className="mt-auto w-full"
        disabled={limitReached}
        loading={createChallenge.isPending || createChallenge.isSuccess}
        onClick={play}
      >
        {limitReached ? copy.picker.weeklyLimitReached : copy.picker.play}
      </Button>
    </Card>
  );
}
