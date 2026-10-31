import { ReviewList, ReviewRow } from "@/components/game/ReviewList";
import { copy } from "@/content/copy";
import type { ResultDetailProps } from "../types";
import type { ExplicaloAnswer, ExplicaloPayload, ExplicaloSolution } from "./schema";

const t = copy.games.explicalo;

function Chips({ items, tone }: { items: string[]; tone: "success" | "muted" }) {
  return (
    <span className="mt-1 flex flex-wrap gap-1">
      {items.map((item) => (
        <span
          key={item}
          className={
            tone === "success"
              ? "rounded-sm bg-success-soft px-2 py-0.5 type-caption text-success"
              : "rounded-sm bg-surface-sunken px-2 py-0.5 type-caption text-text-secondary"
          }
        >
          {item}
        </span>
      ))}
    </span>
  );
}

export function ExplicaloReview({
  payload,
  answer,
  solution,
}: ResultDetailProps<ExplicaloPayload, ExplicaloAnswer, ExplicaloSolution>) {
  const text = answer?.text.trim();

  return (
    <ReviewList title={payload.concept}>
      <ReviewRow
        correct={null}
        leading={<span className="type-caption text-text-muted">{t.review.yours}</span>}
        detail={
          solution.matched.length > 0 ? (
            <>
              {t.review.matched}
              <Chips items={solution.matched} tone="success" />
            </>
          ) : undefined
        }
      >
        {text || t.review.empty}
      </ReviewRow>
      <ReviewRow
        correct={null}
        leading={<span className="type-caption text-success">{t.review.reference}</span>}
        detail={
          solution.missing.length > 0 ? (
            <>
              {t.review.missing}
              <Chips items={solution.missing} tone="muted" />
            </>
          ) : undefined
        }
      >
        {solution.reference}
      </ReviewRow>
    </ReviewList>
  );
}
