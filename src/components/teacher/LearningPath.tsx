"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { CuyFrontal } from "@/components/brand/CuyFrontal";
import { Button, buttonVariants } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { copy } from "@/content/copy";
import { getGameDefinition } from "@/games/registry";
import { ApiError } from "@/lib/api/client";
import { finishCourse, generateWeek, getCoursePath, type PathWeek } from "@/lib/api/teacher";
import { cn } from "@/lib/utils/cn";
import { formatDeadline } from "@/lib/utils/schedule";
import { nodeAccents } from "@/components/game/pathStyle";
import { SinePath } from "@/components/game/SinePath";
import { CourseUpload } from "./CourseUpload";
import { GameEditor } from "./GameEditor";
import { TeacherHeader } from "./TeacherHeader";

const t = copy.teacher.path;

/** Cada semana hace 2 o 3 llamadas y AI Gateway permite pocas por minuto a equipos sin pagos. */
const MAX_PARALLEL_WEEKS = 1;
const POLL_MS = 4000;

const busy = (week: PathWeek) => week.generationStatus === "pending" || week.generationStatus === "running";

type WeekItem = { week: PathWeek } & (
  { kind: "waiting"; index: number } | { kind: "status" } | { kind: "game"; game: PathWeek["games"][number] }
);

function weekItems(week: PathWeek): WeekItem[] {
  if (busy(week)) return [0, 1, 2].map((index) => ({ week, kind: "waiting", index }));
  if (week.games.length === 0 || week.generationStatus === "failed") return [{ week, kind: "status" }];
  return week.games.map((game) => ({ week, kind: "game", game }));
}

function WeekCard({ week }: { week: PathWeek }) {
  return (
    <div className="rounded-lg bg-(image:--gradient-dusk) p-4 text-text-on-primary">
      <p className="type-overline">{t.week(week.weekNumber)}</p>
      <h2 title={week.topic} className="line-clamp-2 type-h3">
        {week.topic}
      </h2>
      {week.deadline && <p className="type-caption">{t.deadline(formatDeadline(week.deadline))}</p>}
    </div>
  );
}

function WeekNode({
  item,
  onEdit,
  onRetry,
  retrying,
}: {
  item: WeekItem;
  onEdit: (gameId: string) => void;
  onRetry?: () => void;
  retrying: boolean;
}) {
  const { week } = item;
  if (item.kind === "waiting") {
    return (
      <div className="flex size-18 animate-pulse items-center justify-center rounded-full bg-surface-raised text-text-muted shadow-[0_6px_0_var(--color-border)]">
        <Lock aria-hidden className="size-6" />
      </div>
    );
  }
  if (item.kind === "status") {
    return (
      <div role="status" className="flex w-44 flex-col items-center gap-3 text-center">
        <p className="type-body text-text-secondary">
          {week.generationStatus === "failed" ? (week.generationError ?? t.failed) : t.noGames}
        </p>
        {onRetry && (
          <Button variant="secondary" size="sm" loading={retrying} onClick={onRetry}>
            <RotateCcw aria-hidden />
            {t.retry}
          </Button>
        )}
      </div>
    );
  }
  const { game } = item;
  const definition = getGameDefinition(game.game);
  if (!definition) return null;
  const Icon = definition.icon;
  return (
    <>
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
      <span className="w-full text-center type-caption text-text-secondary">
        {definition.name}
        <span className="block text-text-muted">{t.level(game.difficulty)}</span>
      </span>
    </>
  );
}

/** Página propia al crear el curso; `embedded` es la pestaña Juegos de su administración. */
export function LearningPath({ courseId, embedded = false }: { courseId: string; embedded?: boolean }) {
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
    if (setupCompleted && !embedded) router.replace(`/docente/${courseId}`);
  }, [unauthorized, setupCompleted, embedded, courseId, router]);

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
    // Al refrescar, la página del camino redirige sola a la administración del curso.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["teacher"] }),
  });

  if (path.data && path.data.weeks.length === 0) {
    if (!embedded) return <CourseUpload existingCourseId={courseId} />;
    return (
      <EmptyState
        className="py-8"
        title={copy.teacher.admin.games.noMaterial}
        description={copy.teacher.admin.games.noMaterialHint}
        action={
          <Link href={`/docente/${courseId}/camino`} className={buttonVariants()}>
            {copy.teacher.admin.games.upload}
          </Link>
        }
      />
    );
  }

  const total = weeks?.length ?? 0;
  const finished = weeks?.filter((week) => !busy(week)).length ?? 0;
  const generating = finished < total;
  const hasGames = weeks?.some((week) => week.games.length > 0);
  return (
    <div className={cn(!embedded && "min-h-dvh bg-bg px-4 pt-6 md:px-6 lg:px-8", !setupCompleted && "pb-28")}>
      <div className="mx-auto flex max-w-[1200px] flex-col gap-8">
        {!embedded && <TeacherHeader />}
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
                {!embedded && <h1 className="type-h1 text-text">{path.data.course.name}</h1>}
                <p className="type-body text-text-secondary">
                  {generating ? `${t.generating} ${t.progress(finished, total)}` : t.ready}
                </p>
              </div>
            </div>
            <SinePath
              segments={path.data.weeks.map((week) => ({
                key: week.weekNumber,
                label: t.week(week.weekNumber),
                card: <WeekCard week={week} />,
                items: weekItems(week),
                itemsLabel: busy(week) ? t.waiting : undefined,
              }))}
              getKey={(item, index) => (item.kind === "game" ? item.game.id : index)}
              renderNode={(item) => (
                <WeekNode
                  item={item}
                  onEdit={setEditing}
                  onRetry={setupCompleted ? undefined : () => retry(item.week.weekNumber)}
                  retrying={retrying === item.week.weekNumber}
                />
              )}
            />
          </>
        )}
      </div>
      {path.data && !setupCompleted && (
        <div className="fixed inset-x-0 bottom-0 z-(--z-sticky) border-t border-border bg-surface/95 px-4 py-3 backdrop-blur-sm">
          <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-2">
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
