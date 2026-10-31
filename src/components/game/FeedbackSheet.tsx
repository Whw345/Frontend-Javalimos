"use client";

import { motion, useReducedMotion } from "motion/react";
import { CircleCheck, CircleX, CornerDownLeft, FileText, Sparkles, Timer } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Kbd } from "@/components/ui/Kbd";
import { copy } from "@/content/copy";
import type { ChallengeResult } from "@/lib/api/schemas";
import { cn } from "@/lib/utils/cn";
import { DURATION, EASE } from "@/styles/motion";

interface FeedbackSheetProps {
  result: ChallengeResult;
  week: number;
  onContinue: () => void;
}

/**
 * Reemplaza al GameFooter tras responder (§11.2, §13). En desktop vive dentro del área
 * de 960 px; en móvil se pega abajo como bottom sheet, sin tapar la revisión.
 */
export function FeedbackSheet({ result, week, onContinue }: FeedbackSheetProps) {
  const reduceMotion = useReducedMotion();
  const { correct, timedOut, pointsAwarded } = result;

  const title = correct ? copy.feedback.correct : timedOut ? copy.feedback.timedOut : copy.feedback.incorrect;
  const Icon = correct ? CircleCheck : timedOut ? Timer : CircleX;

  return (
    <motion.section
      aria-live="polite"
      aria-labelledby="feedback-title"
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION.base, ease: EASE.out }}
      className={cn(
        "sticky bottom-0 -mx-4 shrink-0 rounded-t-xl border border-b-0 bg-surface-raised p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-lg",
        "md:-mx-6 lg:static lg:mx-0 lg:mb-4 lg:rounded-xl lg:border-b lg:p-6",
        correct ? "border-success/60 shadow-glow-success" : "border-border",
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-8">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex items-center gap-3">
            <Icon
              aria-hidden
              className={cn("size-7 shrink-0", correct ? "text-success" : "text-text-secondary")}
            />
            <h2 id="feedback-title" className="type-h2 text-text">
              {title}
            </h2>
            <EarnedPoints points={pointsAwarded} />
          </div>
          <p className="max-w-prose type-body text-text-secondary">{result.explanation}</p>
          <p className="flex items-center gap-1 type-caption text-text-muted">
            <FileText aria-hidden className="size-4" />
            {copy.feedback.source(week, result.source.documento, result.source.pagina)}
          </p>
        </div>

        <Button size="lg" className="w-full lg:w-auto lg:min-w-60" onClick={onContinue} autoFocus>
          {copy.feedback.continue}
          <Kbd className="border-transparent bg-text-on-primary/15 text-text-on-primary">
            <CornerDownLeft aria-hidden className="size-3!" />
          </Kbd>
        </Button>
      </div>
    </motion.section>
  );
}

function EarnedPoints({ points }: { points: number }) {
  const reduceMotion = useReducedMotion();

  if (points === 0) {
    return <span className="ml-auto type-label text-text-muted lg:ml-2">{copy.feedback.zeroPoints}</span>;
  }

  return (
    <motion.span
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION.base, ease: EASE.spring, delay: DURATION.fast }}
      className="ml-auto inline-flex items-center gap-1 rounded-sm bg-reward-soft px-2 py-0.5 type-label text-reward tabular-nums lg:ml-2"
    >
      {copy.feedback.earned(points)}
      <Sparkles aria-hidden className="size-4" />
    </motion.span>
  );
}
