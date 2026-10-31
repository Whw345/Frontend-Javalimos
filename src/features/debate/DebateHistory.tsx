import { CircleCheck, Repeat2, SkipForward } from "lucide-react";
import { copy } from "@/content/copy";
import type { DebateHistoryItem } from "./schema";

/**
 * Turnos anteriores durante el debate (§6.1 del spec). Sin marcas de calidad: solo si se
 * respondió, se pasó o se reformuló, para no dar pistas.
 */
export function DebateHistory({ items }: { items: DebateHistoryItem[] }) {
  if (items.length === 0) {
    return <p className="type-body text-text-secondary">{copy.debate.screen.historyEmpty}</p>;
  }

  return (
    <ol className="flex flex-col gap-3">
      {items.map((item, index) => (
        <li
          key={item.question.id}
          className="flex flex-col gap-1 rounded-md border border-border bg-surface p-3"
        >
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 type-caption text-text-muted">
            <span className="tabular-nums">P{index + 1}</span>
            {item.answer === null ? (
              <span className="inline-flex items-center gap-1">
                <SkipForward aria-hidden className="size-3.5" />
                {copy.debate.screen.historyPassed}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <CircleCheck aria-hidden className="size-3.5" />
                {copy.debate.screen.historyAnswered}
              </span>
            )}
            {item.rephrased && (
              <span className="inline-flex items-center gap-1">
                <Repeat2 aria-hidden className="size-3.5" />
                {copy.debate.screen.historyRephrased}
              </span>
            )}
          </p>
          <details className="group">
            <summary className="cursor-pointer list-none rounded-sm type-body-lg text-text-secondary focus-visible:shadow-glow-primary">
              <span className="line-clamp-2 group-open:line-clamp-none">{item.question.text}</span>
            </summary>
            {item.answer !== null && (
              <p className="mt-2 type-body-lg text-text">
                <span className="text-text-muted">{copy.debate.screen.historyYou} </span>
                {item.answer}
              </p>
            )}
          </details>
        </li>
      ))}
    </ol>
  );
}
