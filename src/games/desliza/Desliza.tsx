"use client";

import { AnimatePresence, useReducedMotion } from "motion/react";
import { CircleCheck, CircleX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Kbd } from "@/components/ui/Kbd";
import { copy } from "@/content/copy";
import { useGameHotkeys } from "@/lib/hooks/useGameHotkeys";
import { cn } from "@/lib/utils/cn";
import type { GameProps } from "../types";
import { createAnswer, isAnswerComplete, recordVerdict } from "./logic";
import type { DeslizaAnswer, DeslizaPayload } from "./schema";
import { SwipeCard, type CardMotionContext, type ExitDirection } from "./SwipeCard";

const t = copy.games.desliza;

interface Decision {
  statementId: string;
  direction: ExitDirection;
}

/**
 * Desliza: una afirmación por ronda; derecha = verdadera, izquierda = falsa.
 * El shell controla `round` y el tiempo de cada carta; este componente solo
 * registra la respuesta y avisa con `onRoundComplete`.
 */
export function Desliza({
  payload,
  disabled,
  hintRevealed,
  onAnswerChange,
  round,
  onRoundComplete,
}: GameProps<DeslizaPayload, DeslizaAnswer>) {
  const reduceMotion = useReducedMotion() ?? false;
  const [answer, setAnswer] = useState(() => createAnswer(payload));
  const [lastDecision, setLastDecision] = useState<Decision | null>(null);
  const roundStartedAt = useRef(0);
  const decidedRound = useRef(-1);

  const total = payload.statements.length;
  const current = payload.statements[round];
  const previous = payload.statements[round - 1];

  // El shell siempre tiene una respuesta con la forma correcta, aunque el tiempo se acabe sin tocar nada.
  useEffect(() => {
    onAnswerChange(createAnswer(payload), false);
  }, [payload, onAnswerChange]);

  useEffect(() => {
    roundStartedAt.current = performance.now();
  }, [round]);

  const decide = (verdict: boolean) => {
    // Evita que un arrastre y una tecla en el mismo instante respondan dos rondas.
    if (disabled || !current || decidedRound.current === round) return;
    decidedRound.current = round;

    const next = recordVerdict(answer, current.id, verdict, performance.now() - roundStartedAt.current);
    setAnswer(next);
    setLastDecision({ statementId: current.id, direction: verdict ? 1 : -1 });
    onAnswerChange(next, isAnswerComplete(next));
    onRoundComplete();
  };

  useGameHotkeys(
    {
      arrowleft: () => decide(false),
      arrowright: () => decide(true),
    },
    { enabled: !disabled },
  );

  // Si la ronda anterior terminó por tiempo, la tarjeta sale sin dirección.
  const exitContext: CardMotionContext = {
    direction: previous && lastDecision?.statementId === previous.id ? lastDecision.direction : 0,
    reduceMotion,
  };

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 py-2 lg:gap-6">
      <RoundProgress answer={answer} round={round} total={total} />

      <div className="grid w-full max-w-3xl grid-cols-2 items-center gap-3 md:flex md:gap-6">
        <div className="relative col-span-2 h-64 w-full md:order-2 md:flex-1 lg:h-76">
          <AnimatePresence initial={false} custom={exitContext}>
            {current && (
              <SwipeCard
                key={current.id}
                statement={current}
                position={round + 1}
                total={total}
                hintRevealed={hintRevealed}
                disabled={disabled}
                onDecide={decide}
              />
            )}
          </AnimatePresence>
        </div>

        <VerdictButton verdict={false} disabled={disabled || !current} onClick={() => decide(false)} />
        <VerdictButton verdict={true} disabled={disabled || !current} onClick={() => decide(true)} />
      </div>
    </div>
  );
}

interface RoundProgressProps {
  answer: DeslizaAnswer;
  round: number;
  total: number;
}

function RoundProgress({ answer, round, total }: RoundProgressProps) {
  const position = Math.min(round + 1, total);
  return (
    <div className="flex flex-col items-center gap-2">
      <p className="type-caption text-text-muted tabular-nums" aria-live="polite">
        {t.progress(position, total)}
      </p>
      <ol aria-hidden className="flex gap-1.5">
        {answer.responses.map((response, index) => (
          <li
            key={response.statementId}
            className={cn(
              "h-1.5 w-6 rounded-full transition-colors duration-(--duration-fast)",
              index === round && "bg-primary shadow-glow-primary",
              index < round && (response.verdict === null ? "bg-border-strong" : "bg-primary/60"),
              index > round && "bg-surface-sunken",
            )}
          />
        ))}
      </ol>
    </div>
  );
}

interface VerdictButtonProps {
  verdict: boolean;
  disabled: boolean;
  onClick: () => void;
}

function VerdictButton({ verdict, disabled, onClick }: VerdictButtonProps) {
  const Icon = verdict ? CircleCheck : CircleX;
  return (
    <Button
      variant="secondary"
      size="lg"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "w-full md:h-28 md:w-28 md:flex-col md:gap-1",
        verdict
          ? "md:order-3 hover:border-success [&_svg]:text-success"
          : "md:order-1 hover:border-error [&_svg]:text-error",
      )}
    >
      <Icon aria-hidden className="md:size-7!" />
      {verdict ? t.trueLabel : t.falseLabel}
      <Kbd>{verdict ? "→" : "←"}</Kbd>
    </Button>
  );
}
