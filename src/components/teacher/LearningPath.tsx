"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { CuyFrontal } from "@/components/brand/CuyFrontal";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { copy } from "@/content/copy";
import { getGameDefinition } from "@/games/registry";
import type { GameAccent } from "@/games/types";
import { ApiError } from "@/lib/api/client";
import { finishCourse, generateWeek, getCoursePath, type PathWeek } from "@/lib/api/teacher";
import { cn } from "@/lib/utils/cn";
import { formatDeadline } from "@/lib/utils/schedule";
import { CourseUpload } from "./CourseUpload";
import { GameEditor } from "./GameEditor";
import { TeacherHeader } from "./TeacherHeader";

const t = copy.teacher.path;

/** Cada semana hace 2 o 3 llamadas y AI Gateway permite pocas por minuto a equipos sin pagos. */
const MAX_PARALLEL_WEEKS = 1;
const POLL_MS = 4000;

/** Curva del camino (px desde el centro). */
const CURVE = [0, -52, -84, -52, 0, 52, 84, 52];

const nodeAccents: Record<GameAccent, string> = {
  "cat-1": "bg-cat-1 shadow-[0_6px_0_color-mix(in_srgb,var(--color-cat-1)_55%,var(--color-bg))]",
  "cat-2": "bg-cat-2 shadow-[0_6px_0_color-mix(in_srgb,var(--color-cat-2)_55%,var(--color-bg))]",
  "cat-3": "bg-cat-3 shadow-[0_6px_0_color-mix(in_srgb,var(--color-cat-3)_55%,var(--color-bg))]",
  "cat-4": "bg-cat-4 shadow-[0_6px_0_color-mix(in_srgb,var(--color-cat-4)_55%,var(--color-bg))]",
  "cat-5": "bg-cat-5 shadow-[0_6px_0_color-mix(in_srgb,var(--color-cat-5)_55%,var(--color-bg))]",
};

const busy = (week: PathWeek) => week.generationStatus === "pending" || week.generationStatus === "running";

function WeekPath({
  week,
  offset,
  onEdit,
  onRetry,
  retrying,
}: {
  week: PathWeek;
  offset: number;
  onEdit: (gameId: string) => void;
  onRetry: () => void;
  retrying: boolean;
}) {
  const failed = week.generationStatus === "failed";
  const empty = week.generationStatus === "done" && week.games.length === 0;
  return (
    <section aria-label={t.week(week.weekNumber)} className="flex flex-col items-center gap-8">
      <div className="w-full rounded-lg bg-(image:--gradient-dusk) p-4 text-text-on-primary">
        <p className="type-overline">{t.week(week.weekNumber)}</p>
        <h2 className="type-h3">{week.topic}</h2>
        {week.deadline && <p className="type-caption">{t.deadline(formatDeadline(week.deadline))}</p>}
      </div>
      {busy(week) && (
        <ul aria-label={t.waiting} className="flex flex-col items-center gap-6">
          {[0, 1, 2].map((index) => (
            <li
              key={index}
              style={{ transform: `translateX(${CURVE[(offset + index) % CURVE.length]}px)` }}
              className="flex size-18 animate-pulse items-center justify-center rounded-full bg-surface-raised text-text-muted shadow-[0_6px_0_var(--color-border)]"
            >
              <Lock aria-hidden className="size-6" />
            </li>
          ))}
        </ul>
      )}
      {(failed || empty) && (
        <div role="status" className="flex flex-col items-center gap-3 text-center">
          <p className="type-body text-text-secondary">
            {failed ? (week.generationError ?? t.failed) : t.noGames}
          </p>
          <Button variant="secondary" size="sm" loading={retrying} onClick={onRetry}>
            <RotateCcw aria-hidden />
            {t.retry}
          </Button>
        </div>
      )}
      {week.games.length > 0 && !busy(week) && (
        <ul className="flex flex-col items-center gap-6">
          {week.games.map((game, index) => {
            const definition = getGameDefinition(game.game);
            if (!definition) return null;
            const Icon = definition.icon;
            return (
              <li
                key={game.id}
                style={{ transform: `translateX(${CURVE[(offset + index) % CURVE.length]}px)` }}
                className="flex flex-col items-center gap-3"
              >
                <button
                  type="button"
                  aria-label={t.editGame(definition.name, week.weekNumber)}
                  onClick={() => onEdit(game.id)}
                  className={cn(
                    "flex size-18 items-center justify-center rounded-full text-text-on-primary transition-[translate,box-shadow] duration-(--duration-fast) ease-out",
                    "motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary",
                    nodeAccents[definition.accent],
                  )}
                >
                  <Icon aria-hidden className="size-8" />
                </button>
                <span className="max-w-32 text-center type-caption text-text-secondary">
                  {definition.name}
                  <span className="block text-text-muted">{t.level(game.difficulty)}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function LearningPath({ courseId }: { courseId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<number | null>(null);
  const path = useQuery({
    queryKey: ["teacher", "course", courseId],
    queryFn: () => getCoursePath(courseId),
    staleTime: 0,
    retry: false,
    refetchInterval: (query) => (query.state.data?.weeks.some(busy) ? POLL_MS : false),
  });
  const unauthorized = path.error instanceof ApiError && path.error.status === 401;
  const setupCompleted = path.data?.course.setupCompleted;
  useEffect(() => {
    if (unauthorized) router.replace("/ingresar");
    if (setupCompleted) router.replace(`/docente/${courseId}`);
  }, [unauthorized, setupCompleted, courseId, router]);

  const refresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ["teacher", "course", courseId] }),
    [queryClient, courseId],
  );

  // El cliente avanza semana por semana: cada petición cabe en el límite de la plataforma
  // y, si se recarga la página, lo pendiente sigue donde quedó.
  const started = useRef(new Set<number>());
  const inFlight = useRef(0);
  const weeks = path.data?.weeks;
  useEffect(() => {
    const next = (weeks ?? [])
      .filter((week) => week.generationStatus === "pending" && !started.current.has(week.weekNumber))
      .slice(0, Math.max(0, MAX_PARALLEL_WEEKS - inFlight.current));
    for (const { weekNumber } of next) {
      started.current.add(weekNumber);
      inFlight.current += 1;
      // Un fallo queda guardado en la semana y se muestra al refrescar.
      void generateWeek(courseId, weekNumber)
        .catch(() => undefined)
        .finally(() => {
          inFlight.current -= 1;
          void refresh();
        });
    }
  }, [weeks, courseId, refresh]);

  async function retry(weekNumber: number) {
    setRetrying(weekNumber);
    await generateWeek(courseId, weekNumber).catch(() => undefined);
    await refresh();
    setRetrying(null);
  }

  const finish = useMutation({
    mutationFn: () => finishCourse(courseId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["teacher", "courses"] });
      router.push(`/docente/${courseId}`);
    },
  });

  if (path.data && path.data.weeks.length === 0) return <CourseUpload existingCourseId={courseId} />;

  const total = weeks?.length ?? 0;
  const finished = weeks?.filter((week) => !busy(week)).length ?? 0;
  const generating = finished < total;
  const hasGames = weeks?.some((week) => week.games.length > 0);
  const offsets = (weeks ?? []).reduce<number[]>(
    (result, week, index) => [...result, result[index]! + Math.max(week.games.length, 3)],
    [0],
  );
  return (
    <div className="min-h-dvh bg-bg px-4 pt-6 pb-28 md:px-6">
      <div className="mx-auto flex max-w-xl flex-col gap-8">
        <TeacherHeader />
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
        {path.data && (
          <>
            <div className="flex items-center gap-4">
              <CuyFrontal expresion={generating ? "espera" : "feliz"} size={72} />
              <div className="min-w-0" role="status" aria-live="polite">
                <h1 className="type-h1 text-text">{path.data.course.name}</h1>
                <p className="type-body text-text-secondary">
                  {generating ? `${t.generating} ${t.progress(finished, total)}` : t.ready}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-12">
              {path.data.weeks.map((week, index) => (
                <WeekPath
                  key={week.weekNumber}
                  week={week}
                  offset={offsets[index]!}
                  onEdit={setEditing}
                  onRetry={() => retry(week.weekNumber)}
                  retrying={retrying === week.weekNumber}
                />
              ))}
            </div>
          </>
        )}
      </div>
      {path.data && (
        <div className="fixed inset-x-0 bottom-0 z-(--z-sticky) border-t border-border bg-surface/95 px-4 py-3 backdrop-blur-sm">
          <div className="mx-auto flex max-w-xl flex-col items-center gap-2">
            {finish.isError && (
              <p role="alert" className="type-caption text-error">
                {finish.error.message}
              </p>
            )}
            <Button
              size="lg"
              className="w-full"
              disabled={generating || !hasGames}
              loading={finish.isPending}
              onClick={() => finish.mutate()}
            >
              {t.finish}
            </Button>
          </div>
        </div>
      )}
      {editing && <GameEditor courseId={courseId} gameId={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
