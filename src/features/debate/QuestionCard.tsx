import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Kbd } from "@/components/ui/Kbd";
import { Skeleton } from "@/components/ui/Skeleton";
import { copy } from "@/content/copy";
import { InterviewerAvatar } from "./InterviewerAvatar";
import type { DebateQuestion } from "./schema";

interface QuestionCardProps {
  question: DebateQuestion;
  index: number;
  thinking: boolean;
  speaking: boolean;
  canSpeak: boolean;
  onRepeat: () => void;
}

/** Pregunta actual, grande y al centro (§6.1 del spec). Siempre escrita, aunque también se lea en voz alta. */
export function QuestionCard({ question, index, thinking, speaking, canSpeak, onRepeat }: QuestionCardProps) {
  return (
    <section className="flex shrink-0 flex-col gap-4 rounded-lg border border-border bg-surface p-4 short:gap-3 lg:p-6 short:lg:p-4">
      <div className="flex items-center justify-between gap-3">
        <InterviewerAvatar state={thinking ? "thinking" : speaking ? "speaking" : "idle"} />
        {!thinking && (
          <p className="type-caption text-text-muted">
            {copy.debate.screen.questionMeta(index, question.kind)}
          </p>
        )}
      </div>

      {thinking ? (
        <div aria-hidden className="flex flex-col gap-2">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-2/3" />
        </div>
      ) : (
        <p aria-live="polite" className="max-w-prose type-prompt text-text">
          {question.text}
        </p>
      )}

      {canSpeak && !thinking && (
        <Button
          variant="ghost"
          size="md"
          className="-ml-2 self-start"
          onClick={onRepeat}
          aria-label={copy.debate.screen.repeatAria}
        >
          <RotateCcw aria-hidden />
          {copy.debate.screen.repeat}
          <Kbd>L</Kbd>
        </Button>
      )}
    </section>
  );
}
