"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { TextHint } from "@/components/game/TextHint";
import { Kbd } from "@/components/ui/Kbd";
import { copy } from "@/content/copy";
import { useGameHotkeys } from "@/lib/hooks/useGameHotkeys";
import { cn } from "@/lib/utils/cn";
import { DURATION, EASE } from "@/styles/motion";
import type { GameProps } from "../types";
import { createAnswer, isAnswerComplete, recordChoice } from "./logic";
import type { CualMayorAnswer, CualMayorPayload, Side } from "./schema";

const t = copy.games.cualMayor;

/** ¿Cuál es mayor?: dos tarjetas por ronda (lado a lado en desktop, apiladas en móvil). */
export function CualMayor({
  payload,
  disabled,
  hint,
  onAnswerChange,
  round,
  onRoundComplete,
}: GameProps<CualMayorPayload, CualMayorAnswer>) {
  const reduceMotion = useReducedMotion();
  const [answer, setAnswer] = useState(() => createAnswer(payload));
  const decidedRound = useRef(-1);
  const current = payload.rounds[round];

  useEffect(() => {
    onAnswerChange(createAnswer(payload), false);
  }, [payload, onAnswerChange]);

  const decide = (side: Side) => {
    if (disabled || !current || decidedRound.current === round) return;
    decidedRound.current = round;
    const next = recordChoice(answer, current.id, side);
    setAnswer(next);
    onAnswerChange(next, isAnswerComplete(next));
    onRoundComplete();
  };

  useGameHotkeys(
    { arrowleft: () => decide("left"), arrowright: () => decide("right") },
    { enabled: !disabled },
  );

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 py-2">
      <TextHint hint={hint} className="self-start" />
      <p className="type-caption text-text-muted tabular-nums">
        {t.progress(Math.min(round + 1, payload.rounds.length), payload.rounds.length)}
      </p>
      <AnimatePresence mode="wait" initial={false}>
        {current && (
          <motion.div
            key={current.id}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -12, filter: "blur(4px)" }}
            transition={{ duration: DURATION.fast, ease: EASE.out }}
            className="flex w-full flex-col items-center gap-4"
          >
            <h2 className="type-h2 text-text" aria-live="polite">
              {current.question}
            </h2>
            <div className="grid w-full gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-center md:gap-6">
              <CompareCard
                label={current.left.label}
                shortcut="←"
                disabled={disabled}
                onChoose={() => decide("left")}
              />
              <span aria-hidden className="text-center type-label text-text-muted">
                {t.or}
              </span>
              <CompareCard
                label={current.right.label}
                shortcut="→"
                disabled={disabled}
                onChoose={() => decide("right")}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface CompareCardProps {
  label: string;
  shortcut: string;
  disabled: boolean;
  onChoose: () => void;
}

function CompareCard({ label, shortcut, disabled, onChoose }: CompareCardProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onChoose}
      className={cn(
        "flex min-h-24 w-full flex-col items-center justify-center gap-3 rounded-lg border border-border bg-surface-raised p-5 text-center shadow-md md:min-h-48",
        "[-webkit-tap-highlight-color:transparent] transition-[border-color,box-shadow,scale] duration-(--duration-fast) ease-out",
        "focus-visible:shadow-glow-primary enabled:hover:border-border-strong motion-safe:enabled:active:scale-[0.97] disabled:opacity-50",
      )}
    >
      <span className="type-h3 text-text text-balance">{label}</span>
      <Kbd>{shortcut}</Kbd>
    </button>
  );
}
