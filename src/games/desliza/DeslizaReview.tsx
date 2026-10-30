import { CircleCheck, CircleX } from "lucide-react";
import { copy } from "@/content/copy";
import { cn } from "@/lib/utils/cn";
import type { ResultDetailProps } from "../types";
import { buildReview, countCorrect } from "./logic";
import type { DeslizaAnswer, DeslizaPayload, DeslizaSolution } from "./schema";

const t = copy.games.desliza;

/** Revisión carta por carta que el shell muestra en lugar del área de juego tras responder. */
export function DeslizaReview({
  payload,
  answer,
  solution,
}: ResultDetailProps<DeslizaPayload, DeslizaAnswer, DeslizaSolution>) {
  const items = buildReview(payload, answer, solution);

  return (
    <section aria-labelledby="desliza-review-title" className="flex h-full min-h-0 flex-col gap-3 py-2">
      <h3 id="desliza-review-title" className="type-h3 text-text">
        {t.review.title(countCorrect(items), items.length)}
      </h3>
      <ol className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain pr-1">
        {items.map((item) => {
          const Icon = item.isCorrect ? CircleCheck : CircleX;
          const verdictLabel = (value: boolean) => (value ? t.trueLabel : t.falseLabel);
          return (
            <li
              key={item.statement.id}
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
                <p className="type-body text-text">{item.statement.text}</p>
                {!item.isCorrect && (
                  <>
                    <p className="type-caption text-text-muted">
                      {item.verdict === null
                        ? t.review.noAnswer
                        : t.review.youAnswered(verdictLabel(item.verdict))}
                    </p>
                    <p className="type-body text-text-secondary">{item.explanation}</p>
                  </>
                )}
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-sm px-2 py-0.5 type-caption",
                  item.isTrue ? "bg-success-soft text-success" : "bg-error-soft text-error",
                )}
              >
                {item.isTrue ? t.review.isTrue : t.review.isFalse}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
