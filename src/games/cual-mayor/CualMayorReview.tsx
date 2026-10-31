import { ReviewList, ReviewRow } from "@/components/game/ReviewList";
import { copy } from "@/content/copy";
import { cn } from "@/lib/utils/cn";
import type { ResultDetailProps } from "../types";
import { buildReview, countCorrect } from "./logic";
import type { CualMayorAnswer, CualMayorPayload, CualMayorSolution, Side } from "./schema";

const t = copy.games.cualMayor;

export function CualMayorReview({
  payload,
  answer,
  solution,
}: ResultDetailProps<CualMayorPayload, CualMayorAnswer, CualMayorSolution>) {
  const items = buildReview(payload, answer, solution);

  return (
    <ReviewList title={t.review.title(countCorrect(items), items.length)}>
      {items.map((item) => {
        const option = (side: Side, label: string, value: string) => (
          <span className={cn(item.expected === side ? "font-semibold text-success" : "text-text-secondary")}>
            {label} ({value})
          </span>
        );
        return (
          <ReviewRow
            key={item.round.id}
            correct={item.isCorrect}
            detail={item.chosen === null ? t.review.noAnswer : item.round.question}
          >
            {option("left", item.round.left.label, item.leftValue)} {t.or}{" "}
            {option("right", item.round.right.label, item.rightValue)}
          </ReviewRow>
        );
      })}
    </ReviewList>
  );
}
