"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { copy } from "@/content/copy";
import { API_MOCKING_ENABLED } from "@/lib/config";
import type { AnyGameDefinition } from "@/games/registry";
import { errorMessage } from "@/lib/api/client";
import { useCourseProgress, useRevealHint, useSaveOutcome, useSubmitAnswer } from "@/lib/api/queries";
import { useCountdown } from "@/lib/hooks/useCountdown";
import { useGameHotkeys } from "@/lib/hooks/useGameHotkeys";
import { useVisibilityGuard } from "@/lib/hooks/useVisibilityGuard";
import { useGameSession, useGameSessionStore } from "@/stores/GameSessionProvider";
import { FeedbackSheet } from "./FeedbackSheet";
import { GameFooter } from "./GameFooter";
import { GameHeader } from "./GameHeader";
import { GamePrompt } from "./GamePrompt";
import { GameTimer } from "./GameTimer";
import { ShortcutLegend } from "./ShortcutLegend";

interface GameShellProps {
  definition: AnyGameDefinition;
  /** Payload ya validado con `definition.payloadSchema`. */
  payload: unknown;
}

/**
 * Marco común de todos los minijuegos (§11.2). Es el único que habla con el API,
 * lleva el tiempo, la pista, el envío y el feedback; el juego solo implementa el área central.
 */
export function GameShell({ definition, payload }: GameShellProps) {
  const router = useRouter();
  const store = useGameSessionStore();
  const session = useGameSession((s) => s.session);
  const status = useGameSession((s) => s.status);
  const hint = useGameSession((s) => s.hint);
  const hintData = useGameSession((s) => s.hintData);
  const round = useGameSession((s) => s.round);
  const roundStartedAt = useGameSession((s) => s.roundStartedAt);
  const isComplete = useGameSession((s) => s.isComplete);
  const answer = useGameSession((s) => s.answer);
  const result = useGameSession((s) => s.result);
  const submitError = useGameSession((s) => s.submitError);
  const actions = useGameSession((s) => s.actions);

  const [exitOpen, setExitOpen] = useState(false);
  const progress = useCourseProgress(session.courseId);
  const submitMutation = useSubmitAnswer(session);
  const hintMutation = useRevealHint(session.sessionId);
  const saveOutcome = useSaveOutcome();

  const timing = definition.getRounds?.(payload);
  const sessionStart = Date.parse(session.startedAt);
  const sessionDeadline = Date.parse(session.deadline);
  const totalMs = timing ? timing.secondsPerRound * 1000 : sessionDeadline - sessionStart;
  const deadline = timing ? roundStartedAt + totalMs : sessionDeadline;
  const isPlaying = status === "playing";

  const sendAnswer = useCallback(() => {
    const state = store.getState();
    const parsed = definition.answerSchema.safeParse(state.answer);
    state.actions.clearSubmitError();
    submitMutation.mutate(parsed.success ? parsed.data : null, {
      onSuccess: (challengeResult) => {
        const { elapsedMs, hint: hintState } = store.getState();
        saveOutcome({
          session,
          result: challengeResult,
          hintUsed: hintState === "revealed",
          elapsedMs,
          totalMs: timing ? timing.rounds * totalMs : totalMs,
        });
        store.getState().actions.finish(challengeResult);
      },
      onError: (error) => store.getState().actions.failSubmit(errorMessage(error)),
    });
  }, [definition, session, store, submitMutation, saveOutcome, timing, totalMs]);

  const submit = useCallback(() => {
    if (store.getState().actions.startSubmit()) sendAnswer();
  }, [store, sendAnswer]);

  const handleExpire = () => {
    // Por rondas: la carta queda sin respuesta y pasa la siguiente. Si no, se envía lo que haya (§11.2).
    if (timing) actions.completeRound();
    else submit();
  };

  const handleRoundComplete = () => {
    actions.completeRound();
  };

  // Juegos "auto": envían su respuesta final directamente.
  const handleGameSubmit = (finalAnswer: unknown) => {
    actions.setAnswer(finalAnswer, true);
    submit();
  };

  const remainingMs = useCountdown(deadline, {
    clockOffsetMs: session.clockOffsetMs,
    paused: !isPlaying,
    onExpire: handleExpire,
  });

  // Juegos por rondas: al terminar la última ronda el reto se envía solo.
  const allRoundsDone = timing !== undefined && isPlaying && round >= timing.rounds;
  useEffect(() => {
    if (allRoundsDone) submit();
  }, [allRoundsDone, submit]);

  const confirmHint = () => {
    actions.startHint();
    hintMutation.mutate(undefined, {
      onSuccess: (response) => actions.revealHint(response.hint ?? null),
      onError: () => actions.failHint(),
    });
  };

  const goToResult = () => router.push(`/reto/${session.sessionId}/resultado`);
  const leave = () =>
    router.push(`/cursos/${session.courseId}/${API_MOCKING_ENABLED ? "jugar" : "practicar"}`);

  useGameHotkeys(
    {
      escape: () => (status === "feedback" ? leave() : setExitOpen(true)),
      h: () => {
        if (!isPlaying || !session.hintAvailable) return;
        if (hint === "idle") actions.armHint();
        else if (hint === "armed") confirmHint();
      },
      enter: () => {
        if (status === "feedback") goToResult();
        else if (hint === "armed") confirmHint();
        else if (isPlaying && definition.submitMode === "button" && isComplete) submit();
      },
    },
    { enabled: !exitOpen },
  );

  useVisibilityGuard({ enabled: isPlaying });

  const solution = result ? definition.solutionSchema.safeParse(result.correctAnswer) : null;
  const ResultDetail = definition.ResultDetail;
  const showReview = status === "feedback" && ResultDetail && solution?.success;
  const Game = definition.Component;

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-bg">
      <GameHeader
        definition={definition}
        week={session.week}
        difficulty={session.difficulty}
        progress={progress.data}
        onExit={() => (status === "feedback" ? leave() : setExitOpen(true))}
      />
      <GameTimer remainingMs={status === "feedback" ? 0 : remainingMs} totalMs={totalMs} />

      <main className="mx-auto flex min-h-0 w-full max-w-240 flex-1 flex-col px-4 md:px-6 lg:px-8">
        <GamePrompt>{definition.instruction}</GamePrompt>

        <section aria-label={copy.shell.gameArea} className="relative min-h-0 flex-1">
          {showReview ? (
            <ResultDetail payload={payload} answer={answer} solution={solution.data} />
          ) : (
            <Game
              payload={payload}
              difficulty={session.difficulty}
              disabled={!isPlaying}
              hintRevealed={hint === "revealed"}
              hint={hintData}
              onAnswerChange={actions.setAnswer}
              onSubmit={handleGameSubmit}
              round={round}
              onRoundComplete={handleRoundComplete}
            />
          )}
        </section>

        {status === "feedback" && result ? (
          <FeedbackSheet result={result} week={session.week} onContinue={goToResult} />
        ) : (
          <GameFooter
            hintAvailable={session.hintAvailable}
            hint={hint}
            onArmHint={actions.armHint}
            onConfirmHint={confirmHint}
            onCancelHint={actions.cancelHint}
            showSubmit={definition.submitMode === "button"}
            canSubmit={isPlaying && isComplete}
            submitting={status === "submitting" && !submitError}
            submittingLabel={copy.shell.submitting}
            onSubmit={submit}
            submitError={submitError}
            onRetrySubmit={sendAnswer}
          />
        )}
      </main>

      {status !== "feedback" && (
        <ShortcutLegend shortcuts={definition.shortcuts(payload)} hintAvailable={session.hintAvailable} />
      )}

      <ConfirmDialog
        open={exitOpen}
        onOpenChange={setExitOpen}
        title={copy.shell.exitDialog.title}
        description={copy.shell.exitDialog.description}
        confirmLabel={copy.shell.exitDialog.confirm}
        cancelLabel={copy.shell.exitDialog.cancel}
        onConfirm={leave}
      />
    </div>
  );
}
