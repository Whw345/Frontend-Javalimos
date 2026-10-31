"use client";

import { Gavel, History, Square, Volume2, VolumeX, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { GameTimer } from "@/components/game/GameTimer";
import { Button, buttonVariants } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Kbd } from "@/components/ui/Kbd";
import { Sheet } from "@/components/ui/Sheet";
import { Skeleton } from "@/components/ui/Skeleton";
import { Toast, type ToastMessage } from "@/components/ui/Toast";
import { copy } from "@/content/copy";
import { ApiError, errorMessage } from "@/lib/api/client";
import {
  discardDebate,
  finishDebate,
  rephraseDebateQuestion,
  sendDebateEvents,
  submitDebateTurn,
} from "@/lib/api/debate";
import { useDebateSession } from "@/lib/api/debateQueries";
import { DEBATE_SEND_AUDIO } from "@/lib/config";
import { useCountdown } from "@/lib/hooks/useCountdown";
import { useDebateHotkeys } from "@/lib/hooks/useDebateHotkeys";
import { useDictation } from "@/lib/hooks/useDictation";
import { useSpeech } from "@/lib/hooks/useSpeech";
import { cn } from "@/lib/utils/cn";
import { AnswerComposer } from "./AnswerComposer";
import { DebateHistory } from "./DebateHistory";
import { DebateIcon } from "./DebateIcon";
import { MAX_ANSWER_CHARS } from "./levels";
import {
  answeredCount,
  buildTurnRequest,
  debateReducer,
  initialDebateState,
  insertDictation,
  type DebateState,
} from "./logic";
import { QuestionCard } from "./QuestionCard";
import type { DebateFinishReason, DebateSession, InputMode } from "./schema";
import { TurnTimer } from "./TurnTimer";

const WIDE_QUERY = "(min-width: 80rem)";
const TABLET_QUERY = "(min-width: 48rem)";

/** Carga la sesión del debate y monta la pantalla. */
export function DebateScreen({ debateId, initialMode }: { debateId: string; initialMode: InputMode }) {
  const query = useDebateSession(debateId);

  if (query.isPending) return <DebateSkeleton />;
  if (query.isError) {
    const closed = query.error instanceof ApiError && query.error.code === "DEBATE_CLOSED";
    return (
      <div className="flex h-dvh items-center justify-center bg-bg px-4">
        <EmptyState
          title={closed ? copy.debate.screen.closedTitle : errorMessage(query.error)}
          action={
            <Link
              href={closed ? `/debate/${debateId}/informe` : "/"}
              className={buttonVariants({ variant: "primary" })}
            >
              {closed ? copy.debate.screen.seeReport : copy.common.backToChallenges}
            </Link>
          }
        />
      </div>
    );
  }
  return <ActiveDebate key={debateId} session={query.data} initialMode={initialMode} />;
}

function ActiveDebate({ session, initialMode }: { session: DebateSession; initialMode: InputMode }) {
  const router = useRouter();
  const { debateId, courseId } = session;
  const [state, dispatch] = useReducer(debateReducer, session, (s) => initialDebateState(s, Date.now()));
  const stateRef = useRef<DebateState>(state);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const closingRef = useRef(false);

  const [muted, setMuted] = useState(false);
  const [confirmingPass, setConfirmingPass] = useState(false);
  const [rephrasing, setRephrasing] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [exitOpen, setExitOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [historySheet, setHistorySheet] = useState<"right" | "bottom" | null>(null);
  const [closeError, setCloseError] = useState<DebateFinishReason | null>(null);

  useEffect(() => {
    stateRef.current = state;
  });

  const { speak, cancel: cancelSpeech, speaking, supported: speechSupported } = useSpeech();

  const onFinal = useCallback((fragment: string) => {
    const current = stateRef.current;
    if (current.phase !== "answering") return;
    const textarea = textareaRef.current;
    const cursor =
      textarea && document.activeElement === textarea
        ? textarea.selectionStart
        : current.composer.text.length;
    const result = insertDictation(current.composer.text, cursor, fragment);
    if (result.inserted === 0) return;
    dispatch({ type: "dictated", text: result.text, inserted: result.inserted });
    requestAnimationFrame(() => textareaRef.current?.setSelectionRange(result.cursor, result.cursor));
  }, []);

  const showNotice = useCallback(
    (text: string) => setToast((current) => ({ id: (current?.id ?? 0) + 1, text })),
    [],
  );

  const dictation = useDictation({
    onFinal,
    onDenied: () => showNotice(copy.debate.intro.micDenied),
    recordAudio: DEBATE_SEND_AUDIO,
  });
  const { stop: stopDictation, takeAudio } = dictation;

  const reportEvent = useCallback(
    (type: "paste_blocked" | "tab_hidden") => {
      const event = { type, questionId: stateRef.current.question.id, at: new Date().toISOString() };
      void sendDebateEvents(debateId, [event]).catch(() => undefined);
    },
    [debateId],
  );

  // ── Cierre ────────────────────────────────────────────────────────────────

  const close = useCallback(
    async (reason: DebateFinishReason) => {
      if (closingRef.current) return;
      closingRef.current = true;
      setCloseError(null);
      stopDictation();
      cancelSpeech();

      const current = stateRef.current;
      dispatch({ type: "closing" });
      // Lo que estaba escrito o dictado se envía como última respuesta (§3.2 del spec).
      if (current.phase === "answering" && current.composer.text.trim()) {
        const request = buildTurnRequest(current, {
          intent: "answer",
          timedOut: reason === "timeout",
          now: Date.now(),
        });
        await submitDebateTurn(debateId, request).catch(() => undefined);
      }
      try {
        await finishDebate(debateId, reason);
        router.replace(`/debate/${debateId}/informe`);
      } catch (error) {
        // Ya cerrado por el servidor: el informe existe igual.
        if (error instanceof ApiError && error.code === "DEBATE_CLOSED") {
          router.replace(`/debate/${debateId}/informe`);
          return;
        }
        closingRef.current = false;
        setCloseError(reason);
      }
    },
    [cancelSpeech, debateId, router, stopDictation],
  );

  // ── Turnos ────────────────────────────────────────────────────────────────

  const sendTurn = useCallback(
    async (intent: "answer" | "pass", timedOut: boolean) => {
      const current = stateRef.current;
      if (current.phase !== "answering" || closingRef.current) return;
      stopDictation();
      cancelSpeech();
      setConfirmingPass(false);

      const request = buildTurnRequest(current, { intent, timedOut, now: Date.now() });
      dispatch({ type: "submitStarted" });
      try {
        const audio = DEBATE_SEND_AUDIO && request.action === "answer" ? takeAudio() : null;
        const response = await submitDebateTurn(debateId, request, audio);
        dispatch({
          type: "turnSent",
          sentAnswer: request.action === "answer" ? request.text : null,
          response,
          now: Date.now(),
        });
        if (response.status === "closed") void close("timeout");
      } catch (error) {
        if (error instanceof ApiError && error.code === "DEBATE_CLOSED") {
          void close("timeout");
          return;
        }
        dispatch({ type: "submitFailed" });
        showNotice(copy.debate.screen.sendError);
      }
    },
    [cancelSpeech, close, debateId, showNotice, stopDictation, takeAudio],
  );

  const answering = state.phase === "answering";
  const thinking = state.phase === "thinking";
  const isLive = state.phase !== "closing";

  const globalRemaining = useCountdown(state.deadline, {
    clockOffsetMs: state.clockOffsetMs,
    paused: !answering,
    onExpire: () => void close("timeout"),
  });
  const turnTotalMs = session.turnSeconds * 1000;
  const turnRemaining = useCountdown(state.turnStartedAt + turnTotalMs, {
    clockOffsetMs: 0,
    paused: !answering,
    onExpire: () => {
      // Si el reloj global vence antes, manda el cierre.
      if (globalRemaining <= 0) return;
      showNotice(copy.debate.screen.turnEnded);
      void sendTurn("answer", true);
    },
  });

  // ── Voz del entrevistador ─────────────────────────────────────────────────

  const questionText = state.question.text;
  useEffect(() => {
    if (!answering || muted) return;
    speak(questionText);
  }, [answering, muted, questionText, speak]);

  const toggleMute = () => {
    if (!muted) cancelSpeech();
    setMuted((value) => !value);
  };

  const toggleDictation = () => {
    if (!answering) return;
    // Que el micrófono no capte la voz del entrevistador.
    cancelSpeech();
    dictation.toggle();
  };

  // ── Pestaña e integridad ──────────────────────────────────────────────────

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== "hidden") return;
      stopDictation();
      reportEvent("tab_hidden");
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [reportEvent, stopDictation]);

  const onPasteBlocked = () => {
    dispatch({ type: "pasteBlocked" });
    reportEvent("paste_blocked");
    showNotice(copy.debate.screen.pasteBlocked);
  };

  // ── Acciones ──────────────────────────────────────────────────────────────

  const requestRephrase = async () => {
    if (!answering || rephrasing || !state.question.canRephrase) return;
    setRephrasing(true);
    try {
      const response = await rephraseDebateQuestion(debateId);
      dispatch({ type: "rephrased", ...response, now: Date.now() });
    } catch (error) {
      showNotice(errorMessage(error));
    } finally {
      setRephrasing(false);
    }
  };

  const requestPass = () => {
    if (!answering) return;
    if (confirmingPass) void sendTurn("pass", false);
    else setConfirmingPass(true);
  };

  const discard = async () => {
    closingRef.current = true;
    stopDictation();
    cancelSpeech();
    await discardDebate(debateId).catch(() => undefined);
    router.push(`/cursos/${courseId}/jugar`);
  };

  const openHistory = () => {
    if (window.matchMedia(WIDE_QUERY).matches) setHistoryOpen((open) => !open);
    else setHistorySheet(window.matchMedia(TABLET_QUERY).matches ? "right" : "bottom");
  };

  useDebateHotkeys(
    {
      " ": toggleDictation,
      p: requestPass,
      r: () => void requestRephrase(),
      l: () => speak(state.question.text),
      enter: () => {
        if (confirmingPass) void sendTurn("pass", false);
      },
      escape: () => setExitOpen(true),
    },
    {
      submit: () => void sendTurn("answer", false),
      dictate: toggleDictation,
      exit: () => setExitOpen(true),
    },
    { enabled: isLive && !exitOpen },
  );

  const hasAnswers = answeredCount(state.history, state.composer.text) > 0;
  const questionIndex = state.history.length + 1;
  const topicNames = session.topics.map((topic) => topic.nombre).join(" · ");

  return (
    <div className="flex h-dvh flex-col bg-bg">
      <header className="grid h-14 shrink-0 grid-cols-[auto_1fr_auto] items-center gap-3 px-4 lg:h-16 lg:px-8">
        <Button
          variant="ghost"
          size="md"
          onClick={() => setExitOpen(true)}
          aria-label={copy.shell.exitAria}
          className="-ml-2"
        >
          <X aria-hidden />
          <span className="hidden lg:inline">{copy.shell.exit}</span>
          <Kbd>Esc</Kbd>
        </Button>

        <div className="flex min-w-0 items-center justify-center gap-2">
          <DebateIcon size="sm" />
          <p className="truncate type-label text-text">
            {copy.debate.name}
            <span className="hidden text-text-muted sm:inline"> · {topicNames}</span>
          </p>
        </div>

        <div className="flex items-center justify-end gap-1">
          {speechSupported && (
            <Button
              variant="ghost"
              size="icon"
              aria-pressed={muted}
              aria-label={muted ? copy.debate.screen.unmute : copy.debate.screen.mute}
              onClick={toggleMute}
            >
              {muted ? <VolumeX aria-hidden /> : <Volume2 aria-hidden />}
            </Button>
          )}
          <Button
            variant="ghost"
            size="md"
            onClick={openHistory}
            aria-label={copy.debate.screen.historyToggle(state.history.length)}
          >
            <History aria-hidden />
            <span className="hidden md:inline">{copy.debate.screen.historyToggle(state.history.length)}</span>
          </Button>
          <Button
            variant="secondary"
            size="md"
            onClick={() => setExitOpen(true)}
            aria-label={copy.debate.screen.finishAria}
            className="hidden sm:inline-flex"
          >
            <Square aria-hidden />
            {copy.debate.screen.finish}
          </Button>
        </div>
      </header>

      <GameTimer remainingMs={globalRemaining} totalMs={session.totalSeconds * 1000} />

      <div className="flex min-h-0 flex-1 gap-6 px-4 py-4 short:py-2 lg:px-8">
        <main className="mx-auto flex min-h-0 w-full max-w-240 min-w-0 flex-1 flex-col gap-4 short:gap-2">
          <QuestionCard
            question={state.question}
            index={questionIndex}
            thinking={thinking}
            speaking={speaking}
            canSpeak={speechSupported}
            onRepeat={() => speak(state.question.text)}
          />

          {state.phase === "closing" ? (
            <ClosingPanel error={closeError} onRetry={() => closeError && void close(closeError)} />
          ) : (
            <AnswerComposer
              textareaRef={textareaRef}
              text={state.composer.text}
              maxChars={MAX_ANSWER_CHARS}
              preferredMode={initialMode}
              disabled={!answering}
              onTextChange={(text) => dispatch({ type: "typed", text })}
              onPasteBlocked={onPasteBlocked}
              dictation={{
                supported: dictation.supported && dictation.error !== "denied",
                listening: dictation.listening,
                interim: dictation.interim,
                onToggle: toggleDictation,
              }}
              onClear={() => {
                stopDictation();
                dispatch({ type: "cleared" });
                textareaRef.current?.focus();
              }}
              pass={{
                confirming: confirmingPass,
                onRequest: requestPass,
                onConfirm: () => void sendTurn("pass", false),
                onCancel: () => setConfirmingPass(false),
              }}
              rephrase={{
                available: state.question.canRephrase,
                pending: rephrasing,
                onRequest: () => void requestRephrase(),
              }}
              submit={{ pending: thinking, onSubmit: () => void sendTurn("answer", false) }}
              timer={
                <TurnTimer
                  remainingMs={turnRemaining}
                  totalMs={turnTotalMs}
                  muteAnnouncements={globalRemaining <= turnRemaining}
                />
              }
            />
          )}
        </main>

        <aside
          aria-label={copy.debate.screen.historyTitle}
          className={cn("hidden w-70 shrink-0 flex-col gap-3 overflow-y-auto", historyOpen && "xl:flex")}
        >
          <h2 className="type-label text-text-secondary">{copy.debate.screen.historyTitle}</h2>
          <DebateHistory items={state.history} />
        </aside>
      </div>

      <footer className="hidden shrink-0 items-center justify-center gap-3 pb-4 short:pb-1 type-caption text-text-muted lg:flex">
        <span className="inline-flex items-center gap-1">
          <Gavel aria-hidden className="size-3.5" />
          {copy.debate.screen.mediatorNote}
        </span>
        <span aria-hidden>·</span>
        <span aria-hidden>
          {copy.shell.shortcuts.title} {Object.values(copy.debate.screen.shortcuts).join(" · ")}
        </span>
      </footer>

      {/* Desktop: sobre la columna del historial (xl) o encima de los botones (lg), nunca sobre "Responder". */}
      <Toast
        message={toast}
        onDismiss={() => setToast(null)}
        closeLabel={copy.common.close}
        viewportClassName="lg:bottom-36 xl:right-8 xl:bottom-6 xl:w-70"
      />

      <Sheet
        open={historySheet !== null}
        onOpenChange={(open) => !open && setHistorySheet(null)}
        title={copy.debate.screen.historyTitle}
        closeLabel={copy.common.close}
        side={historySheet ?? "bottom"}
      >
        <DebateHistory items={state.history} />
      </Sheet>

      <ConfirmDialog
        open={exitOpen}
        onOpenChange={setExitOpen}
        title={copy.debate.screen.exitDialog.title}
        description={
          hasAnswers
            ? copy.debate.screen.exitDialog.description
            : copy.debate.screen.exitDialog.descriptionEmpty
        }
        cancelLabel={copy.debate.screen.exitDialog.cancel}
        {...(hasAnswers
          ? {
              confirmLabel: copy.debate.screen.exitDialog.evaluate,
              confirmVariant: "primary" as const,
              onConfirm: () => void close("user_finished"),
              secondaryLabel: copy.debate.screen.exitDialog.discard,
              onSecondary: () => void discard(),
            }
          : {
              confirmLabel: copy.debate.screen.exitDialog.discard,
              onConfirm: () => void discard(),
            })}
      />
    </div>
  );
}

function ClosingPanel({ error, onRetry }: { error: DebateFinishReason | null; onRetry: () => void }) {
  return (
    <section
      aria-live="polite"
      className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-border bg-surface p-6 text-center"
    >
      <p className="type-h3 text-text">{copy.debate.screen.closing}</p>
      {error ? (
        <>
          <p className="type-body text-text-secondary">{copy.errors.UNKNOWN}</p>
          <Button onClick={onRetry}>{copy.common.retry}</Button>
        </>
      ) : (
        <Skeleton className="h-2 w-40 rounded-full" />
      )}
    </section>
  );
}

function DebateSkeleton() {
  return (
    <div className="flex h-dvh flex-col bg-bg" aria-busy>
      <div className="flex h-14 items-center justify-between px-4 lg:h-16 lg:px-8">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="px-4 lg:px-8">
        <Skeleton className="h-2 w-full rounded-full" />
      </div>
      <main className="mx-auto flex w-full max-w-240 flex-1 flex-col gap-4 px-4 py-4 lg:px-8">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="w-full flex-1" />
      </main>
    </div>
  );
}
