"use client";

import { Keyboard, Mic, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type ReactNode } from "react";
import { CuyFrontal } from "@/components/brand/CuyFrontal";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Kbd } from "@/components/ui/Kbd";
import { Skeleton } from "@/components/ui/Skeleton";
import { copy } from "@/content/copy";
import { errorMessage } from "@/lib/api/client";
import { useCreateDebate, useDebateSetup } from "@/lib/api/debateQueries";
import { useGameHotkeys } from "@/lib/hooks/useGameHotkeys";
import { useBrowserSupport } from "@/lib/hooks/useBrowserSupport";
import { isDictationSupported, requestMicrophone } from "@/lib/hooks/useDictation";
import { cn } from "@/lib/utils/cn";
import { LevelPicker } from "./LevelPicker";
import type { DebateDifficulty, InputMode } from "./schema";

type MicStatus = "unknown" | "granted" | "denied";

/**
 * Intro del debate (§3.1 del spec): temas elegidos por el sistema, nivel, modo de respuesta
 * y reglas. Fuera del temporizador, así que aquí sí aparece el cuy frontal.
 */
export function DebateIntro({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [difficulty, setDifficulty] = useState<DebateDifficulty>("baja");
  const dictationSupported = useBrowserSupport(isDictationSupported);
  // null = sin elegir todavía: por defecto se habla si el navegador permite dictado.
  const [chosenMode, setMode] = useState<InputMode | null>(null);
  const [mic, setMic] = useState<MicStatus>("unknown");
  const mode: InputMode = dictationSupported && mic !== "denied" ? (chosenMode ?? "voz") : "texto";
  const setup = useDebateSetup(courseId, difficulty);
  const createDebate = useCreateDebate(courseId);
  const modeLabelId = useId();

  useEffect(() => {
    if (setup.data && !setup.data.premium) router.replace(`/planes?curso=${encodeURIComponent(courseId)}`);
  }, [courseId, router, setup.data]);

  const chooseVoice = async () => {
    if (!dictationSupported) return;
    setMode("voz");
    if (mic === "granted") return;
    const granted = await requestMicrophone();
    setMic(granted ? "granted" : "denied");
    if (!granted) setMode("texto");
  };

  const canStart = Boolean(setup.data?.premium && setup.data.available) && !createDebate.isPending;

  const start = async () => {
    if (!canStart) return;
    let startMode = mode;
    if (mode === "voz" && mic !== "granted") {
      const granted = await requestMicrophone();
      setMic(granted ? "granted" : "denied");
      // Sin micrófono se queda en la intro para que lea el aviso antes de empezar.
      if (!granted) {
        setMode("texto");
        return;
      }
      startMode = "voz";
    }
    createDebate.mutate(difficulty, {
      onSuccess: (session) => router.push(`/debate/${session.debateId}?modo=${startMode}`),
    });
  };

  useGameHotkeys({ enter: () => void start() }, { enabled: canStart });

  const micNotice = !dictationSupported
    ? copy.debate.intro.noDictation
    : mic === "denied"
      ? copy.debate.intro.micDenied
      : null;

  return (
    <div className="min-h-dvh bg-(image:--gradient-surface) px-4 py-8 md:px-6 lg:px-8 lg:py-12">
      <main className="mx-auto grid w-full max-w-300 gap-6 lg:grid-cols-12 lg:gap-8">
        <section className="flex flex-col gap-6 lg:col-span-7">
          <div className="flex items-center gap-4">
            <CuyFrontal expresion="invitando" size="md" />
            <div className="flex flex-col gap-1">
              <p className="type-overline text-reward">{copy.debate.intro.overline}</p>
              <h1 className="type-h1 text-text">{copy.debate.intro.title}</h1>
              <p className="max-w-prose type-body text-text-secondary">{copy.debate.intro.subtitle}</p>
            </div>
          </div>

          <Card className="flex flex-col gap-3">
            <h2 className="type-h3 text-text">{copy.debate.intro.topics}</h2>
            {setup.isPending ? (
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-8 w-28 rounded-full" />
                <Skeleton className="h-8 w-36 rounded-full" />
                <Skeleton className="h-8 w-24 rounded-full" />
              </div>
            ) : setup.isError ? (
              <p role="alert" className="type-body text-text-secondary">
                {errorMessage(setup.error)}
              </p>
            ) : !setup.data.available ? (
              <p className="type-body text-text-secondary">
                {copy.debate.levels.notEnough(setup.data.requiredTopics)}
              </p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {setup.data.topics.map((topic) => (
                  <li
                    key={topic.id}
                    className="inline-flex h-8 items-center gap-2 rounded-full border border-border bg-surface-raised px-3 type-label text-text"
                  >
                    {topic.nombre}
                    <span className="type-caption text-text-secondary">
                      {copy.debate.intro.topicWeek(topic.semana)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="flex flex-col gap-3">
            <h2 className="flex items-center gap-2 type-h3 text-text">
              <ShieldCheck aria-hidden className="size-5 text-info" />
              {copy.debate.intro.rulesTitle}
            </h2>
            <ul className="flex flex-col gap-2 type-body text-text-secondary">
              {copy.debate.intro.rules.map((rule) => (
                <li key={rule} className="flex gap-2">
                  <span aria-hidden className="text-text-muted">
                    ·
                  </span>
                  {rule}
                </li>
              ))}
            </ul>
          </Card>
        </section>

        <Card className="flex flex-col gap-6 self-start lg:col-span-5">
          <LevelPicker value={difficulty} onChange={setDifficulty} />

          <div className="flex flex-col gap-2">
            <p id={modeLabelId} className="type-label text-text">
              {copy.debate.intro.mode}
            </p>
            <div role="radiogroup" aria-labelledby={modeLabelId} className="grid grid-cols-2 gap-2">
              <ModeOption
                selected={mode === "voz"}
                disabled={!dictationSupported || mic === "denied"}
                onSelect={() => void chooseVoice()}
                icon={<Mic aria-hidden />}
                label={copy.debate.intro.modeVoice}
              />
              <ModeOption
                selected={mode === "texto"}
                onSelect={() => setMode("texto")}
                icon={<Keyboard aria-hidden />}
                label={copy.debate.intro.modeText}
              />
            </div>
            {micNotice ? (
              <p role="status" className="type-caption text-warning">
                {micNotice}
              </p>
            ) : (
              <p className="type-caption text-text-muted">{copy.debate.intro.modeHint}</p>
            )}
            {mode === "voz" && <p className="type-caption text-text-muted">{copy.debate.intro.privacy}</p>}
          </div>

          {createDebate.isError && (
            <p role="alert" className="type-body text-text-secondary">
              {errorMessage(createDebate.error)}
            </p>
          )}

          <div className="flex flex-col gap-3">
            <Button
              size="lg"
              className="w-full"
              disabled={!canStart}
              loading={createDebate.isPending || createDebate.isSuccess}
              onClick={() => void start()}
            >
              {copy.debate.intro.start}
              <Kbd>⏎</Kbd>
            </Button>
            <Link
              href={`/cursos/${courseId}/jugar`}
              className={cn(buttonVariants({ variant: "ghost" }), "w-full")}
            >
              {copy.debate.intro.back}
            </Link>
          </div>
          <Badge className="self-center">{copy.debate.card.unlimited}</Badge>
        </Card>
      </main>
    </div>
  );
}

interface ModeOptionProps {
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
  icon: ReactNode;
  label: string;
}

function ModeOption({ selected, disabled, onSelect, icon, label }: ModeOptionProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "flex h-14 items-center justify-center gap-2 rounded-md border type-label transition-colors duration-(--duration-fast) focus-visible:shadow-glow-primary disabled:opacity-40 [&_svg]:size-5",
        selected
          ? "border-primary bg-primary-soft text-text"
          : "border-border text-text-secondary hover:border-border-strong",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
