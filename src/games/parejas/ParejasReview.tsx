import { CircleCheck, CircleX } from "lucide-react";
import { CategoryMark } from "@/components/game/CategoryMark";
import { copy } from "@/content/copy";
import { cn } from "@/lib/utils/cn";
import type { ResultDetailProps } from "../types";
import { buildReview, countCorrect } from "./logic";
import type { ParejasAnswer, ParejasPayload, ParejasSolution } from "./schema";

const t = copy.games.parejas;

/** Revisión par por par que el shell muestra en lugar del tablero tras responder. */
export function ParejasReview({
  payload,
  answer,
  solution,
}: ResultDetailProps<ParejasPayload, ParejasAnswer, ParejasSolution>) {
  const items = buildReview(payload, answer, solution);

  return (
    <section aria-labelledby="parejas-review-title" className="flex h-full min-h-0 flex-col gap-3 py-2">
      <h3 id="parejas-review-title" className="type-h3 text-text">
        {t.review.title(countCorrect(items), items.length)}
      </h3>
      <ol className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain pr-1">
        {items.map((item) => {
          const Icon = item.isCorrect ? CircleCheck : CircleX;
          return (
            <li
              key={item.conceptText}
              className={cn(
                "flex items-start gap-3 rounded-lg border bg-surface-raised px-4 py-3",
                item.isCorrect ? "border-success/60" : "border-error/60",
              )}
            >
              <Icon
                aria-hidden
                className={cn("mt-0.5 size-5 shrink-0", item.isCorrect ? "text-success" : "text-error")}
              />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="flex items-center gap-2 type-label text-text">
                  <CategoryMark index={item.categoryIndex} label={String(item.categoryIndex + 1)} />
                  {item.conceptText}
                </p>
                {/* Tras responder ya no hay nada que ocultar: se muestra la definición completa. */}
                <p className="type-body text-text-secondary">{item.explanation}</p>
                {!item.isCorrect && (
                  <p className="type-caption text-text-muted">
                    {item.chosenDefinition ? t.review.youMatched(item.chosenDefinition) : t.review.notMatched}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
