"use client";

import {
  CircleAlert,
  CircleCheck,
  CircleX,
  CornerUpRight,
  Gavel,
  Keyboard,
  Mic,
  SkipForward,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { CuyFrontal } from "@/components/brand/CuyFrontal";
import { StarRating } from "@/components/gamification/StarRating";
import { Badge } from "@/components/ui/Badge";
import { buttonVariants } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Skeleton } from "@/components/ui/Skeleton";
import { copy } from "@/content/copy";
import { errorMessage } from "@/lib/api/client";
import { useDebateReport } from "@/lib/api/debateQueries";
import { cn } from "@/lib/utils/cn";
import { formatClock, formatDuration } from "@/lib/utils/format";
import type { DebateReport as Report, TurnMark } from "./schema";

/** Informe del mediador (§7 del spec). Mientras evalúa, muestra la espera con el cuy. */
export function DebateReport({ debateId }: { debateId: string }) {
  const query = useDebateReport(debateId);

  if (query.isPending || (query.data && "status" in query.data)) return <MediatorWaiting />;
  if (query.isError) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg px-4">
        <EmptyState
          title={errorMessage(query.error)}
          action={
            <Link href="/" className={buttonVariants({ variant: "primary" })}>
              {copy.common.backToChallenges}
            </Link>
          }
        />
      </div>
    );
  }
  return <ReportView report={query.data} />;
}

function MediatorWaiting() {
  return (
    <div className="min-h-dvh bg-bg px-4 py-8 lg:px-8 lg:py-12" aria-busy>
      <main className="mx-auto flex w-full max-w-300 flex-col gap-8">
        <div className="flex items-center gap-4" aria-live="polite">
          <CuyFrontal expresion="pensando" size="md" />
          <div className="flex flex-col gap-1">
            <h1 className="type-h2 text-text">{copy.debate.waiting.title}</h1>
            <p className="type-body text-text-secondary">{copy.debate.waiting.body}</p>
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-12">
          <Skeleton className="h-80 lg:col-span-5" />
          <div className="flex flex-col gap-4 lg:col-span-7">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
        </div>
      </main>
    </div>
  );
}

const MARKS: Record<TurnMark, { icon: LucideIcon; className: string }> = {
  solida: { icon: CircleCheck, className: "text-success" },
  imprecisa: { icon: CircleAlert, className: "text-warning" },
  erronea: { icon: CircleX, className: "text-error" },
  evadida: { icon: CornerUpRight, className: "text-text-muted" },
  pasada: { icon: SkipForward, className: "text-text-muted" },
};

const scoreVariant = (score: number) => (score >= 3 ? "success" : score === 2 ? "warning" : "error");

function ReportView({ report }: { report: Report }) {
  const overall = report.overall.toFixed(1).replace(".", ",");
  const { stats, integrity } = report;
  const hasIntegrityEvents = integrity.pasteAttempts > 0 || integrity.tabHidden > 0;

  return (
    <div className="min-h-dvh bg-bg px-4 py-8 lg:px-8 lg:py-12">
      <main className="mx-auto grid w-full max-w-300 gap-6 lg:grid-cols-12 lg:gap-8">
        {/* Resumen */}
        <section className="flex flex-col gap-6 lg:col-span-5">
          <Card className="flex flex-col items-center gap-4 text-center">
            <CuyFrontal expresion={report.overall >= 3 ? "celebrando" : "animando"} size="lg" />
            <h1 className="type-h2 text-text">{copy.debate.report.title}</h1>
            <p className="flex items-baseline gap-2" aria-label={copy.debate.report.overallAria(overall)}>
              <span aria-hidden className="type-display-xl tabular-nums text-text">
                {overall}
              </span>
              <span aria-hidden className="type-h3 text-text-muted">
                {copy.debate.report.outOf}
              </span>
            </p>
            <StarRating stars={report.stars} />
            <div className="flex flex-wrap justify-center gap-2">
              {report.topics.map((topic) => (
                <Badge key={topic.id}>
                  {topic.nombre} · {copy.debate.intro.topicWeek(topic.semana)}
                </Badge>
              ))}
            </div>
          </Card>

          <Card className="flex flex-col gap-2">
            <h2 className="flex items-center gap-2 type-label text-text-secondary">
              <Gavel aria-hidden className="size-4" />
              {copy.debate.report.verdict}
            </h2>
            <p className="type-body-lg text-text">{report.verdict}</p>
          </Card>

          <Card className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="type-label text-text-secondary">{copy.debate.report.stats}</h2>
              <p className="type-caption text-text-muted">{copy.debate.report.statsNote}</p>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
              <Stat
                label={copy.debate.report.answered}
                value={copy.debate.report.answeredValue(stats.answered, stats.questionsTotal)}
              />
              <Stat label={copy.debate.report.passed} value={String(stats.passed)} />
              <Stat label={copy.debate.report.rephrases} value={String(stats.rephrasesUsed)} />
              <Stat label={copy.debate.report.avgTime} value={formatDuration(stats.avgResponseMs)} />
              <Stat label={copy.debate.report.voiceShare} value={`${Math.round(stats.voiceShare * 100)} %`} />
              <Stat label={copy.debate.report.duration} value={formatClock(stats.durationMs)} />
            </dl>
            {hasIntegrityEvents && (
              <div className="flex flex-col gap-1 border-t border-border pt-3">
                <p className="type-caption text-text-muted">{copy.debate.report.integrity}</p>
                {integrity.pasteAttempts > 0 && (
                  <p className="type-body text-text-secondary">
                    {copy.debate.report.integrityPaste(integrity.pasteAttempts)}
                  </p>
                )}
                {integrity.tabHidden > 0 && (
                  <p className="type-body text-text-secondary">
                    {copy.debate.report.integrityTabs(integrity.tabHidden)}
                  </p>
                )}
              </div>
            )}
          </Card>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href={`/cursos/${report.courseId}/debate`}
              className={cn(buttonVariants({ size: "lg" }), "flex-1")}
            >
              {copy.debate.report.again}
            </Link>
            <Link
              href={`/cursos/${report.courseId}/debate/historial`}
              className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "flex-1")}
            >
              {copy.debate.report.history}
            </Link>
          </div>
        </section>

        {/* Detalle */}
        <section className="flex flex-col gap-6 lg:col-span-7">
          <div className="flex flex-col gap-3">
            <h2 className="type-h2 text-text">{copy.debate.report.rubric}</h2>
            <ul className="grid gap-3 md:grid-cols-2">
              {report.criteria.map((criterion) => (
                <li key={criterion.id}>
                  <Card className="flex h-full flex-col gap-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="type-label text-text">{copy.debate.report.criteria[criterion.id]}</h3>
                      <span className="type-h3 tabular-nums text-text">
                        {criterion.score}
                        <span className="type-caption text-text-muted"> {copy.debate.report.outOf}</span>
                      </span>
                    </div>
                    <ProgressBar
                      value={criterion.score}
                      max={4}
                      variant={scoreVariant(criterion.score)}
                      label={copy.debate.report.criteria[criterion.id]}
                      valueText={copy.debate.report.scoreAria(criterion.score)}
                    />
                    <div className="flex flex-col gap-1">
                      <p className="type-caption text-success">{copy.debate.report.strength}</p>
                      <p className="type-body text-text-secondary">{criterion.strength}</p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <p className="type-caption text-warning">{copy.debate.report.improvement}</p>
                      <p className="type-body text-text-secondary">{criterion.improvement}</p>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="type-h2 text-text">{copy.debate.report.errors}</h2>
            {report.errors.length === 0 ? (
              <Card>
                <p className="flex items-center gap-2 type-body text-text-secondary">
                  <CircleCheck aria-hidden className="size-5 text-success" />
                  {copy.debate.report.noErrors}
                </p>
              </Card>
            ) : (
              <ul className="flex flex-col gap-3">
                {report.errors.map((error) => (
                  <li key={`${error.turnIndex}-${error.quote}`}>
                    <Card className="flex flex-col gap-2">
                      <p className="type-body text-text-secondary">
                        <span className="text-text-muted">{copy.debate.report.youSaid} </span>
                        <q className="text-text">{error.quote}</q>
                      </p>
                      <p className="flex gap-2 type-body text-text">
                        <CircleX aria-hidden className="mt-0.5 size-5 shrink-0 text-error" />
                        <span>
                          <span className="type-label">{copy.debate.report.correct} </span>
                          {error.correction}
                        </span>
                      </p>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="type-caption text-text-muted">
                          {copy.debate.report.source(
                            error.source.semana,
                            error.source.documento,
                            error.source.pagina,
                          )}
                        </p>
                        <a
                          href={`#turno-${error.turnIndex + 1}`}
                          className="rounded-sm type-caption text-primary-text hover:underline focus-visible:shadow-glow-primary"
                          onClick={() => {
                            const details = document.getElementById("transcript");
                            if (details instanceof HTMLDetailsElement) details.open = true;
                          }}
                        >
                          {copy.debate.report.goToTurn(error.turnIndex + 1)}
                        </a>
                      </div>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <details id="transcript" className="group rounded-lg border border-border bg-surface">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg p-4 focus-visible:shadow-glow-primary lg:p-6">
              <span className="flex flex-col gap-1">
                <span className="type-h3 text-text">{copy.debate.report.transcript}</span>
                <span className="type-caption text-text-muted">{copy.debate.report.transcriptToggle}</span>
              </span>
              <span aria-hidden className="type-h3 text-text-muted transition-transform group-open:rotate-90">
                ›
              </span>
            </summary>
            <ol className="flex flex-col gap-3 px-4 pb-4 lg:px-6 lg:pb-6">
              {report.transcript.map((turn) => {
                const mark = MARKS[turn.mark];
                const MarkIcon = mark.icon;
                return (
                  <li
                    key={turn.index}
                    id={`turno-${turn.index + 1}`}
                    className="flex scroll-mt-4 flex-col gap-2 rounded-md bg-surface-raised p-3 lg:p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="type-caption text-text-secondary">
                        {copy.debate.screen.questionMeta(turn.index + 1, turn.question.kind)}
                        {turn.rephrased && ` · ${copy.debate.report.rephrasedTag}`}
                      </p>
                      <p className={cn("inline-flex items-center gap-1 type-label", mark.className)}>
                        <MarkIcon aria-hidden className="size-4" />
                        {copy.debate.report.marks[turn.mark]}
                      </p>
                    </div>
                    <p className="type-body text-text">{turn.question.text}</p>
                    <div className="flex gap-2 border-l-2 border-border pl-3">
                      <div className="flex flex-col gap-1">
                        <p className="type-body text-text-secondary">
                          {turn.answer ?? (
                            <span className="italic text-text-secondary">{copy.debate.report.noAnswer}</span>
                          )}
                        </p>
                        <p className="flex flex-wrap items-center gap-3 type-caption text-text-secondary">
                          {turn.inputModes.includes("voz") && (
                            <span className="inline-flex items-center gap-1">
                              <Mic aria-hidden className="size-3.5" />
                              {copy.debate.report.modeVoice}
                            </span>
                          )}
                          {turn.inputModes.includes("texto") && (
                            <span className="inline-flex items-center gap-1">
                              <Keyboard aria-hidden className="size-3.5" />
                              {copy.debate.report.modeText}
                            </span>
                          )}
                          <span>{formatDuration(turn.durationMs)}</span>
                        </p>
                      </div>
                    </div>
                    {turn.comment && <p className="type-caption text-text-secondary">{turn.comment}</p>}
                  </li>
                );
              })}
            </ol>
          </details>
        </section>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="type-caption text-text-muted">{label}</dt>
      <dd className="type-h3 tabular-nums text-text">{value}</dd>
    </div>
  );
}
