"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { CuyFrontal } from "@/components/brand/CuyFrontal";
import { Badge } from "@/components/ui/Badge";
import { buttonVariants } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { copy } from "@/content/copy";
import { ApiError, errorMessage } from "@/lib/api/client";
import { useDebateHistory } from "@/lib/api/debateQueries";
import { formatDate } from "@/lib/utils/format";
import { DebateIcon } from "./DebateIcon";

/** Historial de debates del estudiante en un curso (§7.3 del spec). */
export function DebateHistoryList({ courseId }: { courseId: string }) {
  const router = useRouter();
  const history = useDebateHistory(courseId);
  const locked = history.error instanceof ApiError && history.error.code === "PREMIUM_REQUIRED";

  useEffect(() => {
    if (locked) router.replace(`/planes?curso=${encodeURIComponent(courseId)}`);
  }, [courseId, locked, router]);

  return (
    <div className="min-h-dvh bg-(image:--gradient-surface) px-4 py-8 md:px-6 lg:px-8 lg:py-12">
      <main className="mx-auto flex w-full max-w-200 flex-col gap-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-1">
            <p className="type-overline text-reward">{copy.debate.history.overline}</p>
            <h1 className="type-h1 text-text">{copy.debate.history.title}</h1>
          </div>
          <div className="flex gap-2">
            <Link href={`/cursos/${courseId}/jugar`} className={buttonVariants({ variant: "ghost" })}>
              {copy.debate.history.back}
            </Link>
            <Link href={`/cursos/${courseId}/debate`} className={buttonVariants({ variant: "primary" })}>
              {copy.debate.history.start}
            </Link>
          </div>
        </header>

        {history.isPending || locked ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        ) : history.isError ? (
          <p role="alert" className="type-body text-text-secondary">
            {errorMessage(history.error)}
          </p>
        ) : history.data.length === 0 ? (
          <Card className="flex flex-col items-center gap-4 py-10">
            <CuyFrontal expresion="invitando" size="md" />
            <EmptyState title={copy.debate.history.emptyTitle} description={copy.debate.history.emptyBody} />
          </Card>
        ) : (
          <ul className="flex flex-col gap-3">
            {history.data.map((debate) => (
              <li key={debate.debateId}>
                <Link
                  href={`/debate/${debate.debateId}/informe`}
                  className="block rounded-lg focus-visible:shadow-glow-primary"
                >
                  <Card interactive className="flex items-center gap-4">
                    <DebateIcon />
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <p className="type-caption text-text-muted">
                        {formatDate(debate.createdAt)} · {copy.debate.levels[debate.difficulty]}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {debate.topics.map((topic) => (
                          <Badge key={topic.id}>{topic.nombre}</Badge>
                        ))}
                      </div>
                    </div>
                    <p className="type-h3 tabular-nums text-text">
                      {copy.debate.history.score(debate.overall.toFixed(1).replace(".", ","))}
                    </p>
                    <ChevronRight aria-hidden className="size-5 text-text-muted" />
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
