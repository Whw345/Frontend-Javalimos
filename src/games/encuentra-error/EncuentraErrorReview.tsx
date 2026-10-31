import { ReviewList, ReviewRow } from "@/components/game/ReviewList";
import { copy } from "@/content/copy";
import { cn } from "@/lib/utils/cn";
import type { ResultDetailProps } from "../types";
import { buildReview } from "./logic";
import type { EncuentraErrorAnswer, EncuentraErrorPayload, EncuentraErrorSolution } from "./schema";

const t = copy.games.encuentraError;

export function EncuentraErrorReview({
  payload,
  answer,
  solution,
}: ResultDetailProps<EncuentraErrorPayload, EncuentraErrorAnswer, EncuentraErrorSolution>) {
  const review = buildReview(payload, answer, solution);
  const textClass = payload.monospace ? "type-code" : "type-body";

  return (
    <ReviewList title={t.review.title}>
      <ReviewRow
        correct={review.isCorrect}
        leading={<span className="type-code text-text-muted">{review.wrongLine}</span>}
        detail={
          review.isCorrect
            ? undefined
            : review.chosenLine
              ? t.review.youChose(review.chosenLine)
              : t.review.noAnswer
        }
      >
        <span className={cn(textClass, "line-through decoration-error")}>{review.wrongText}</span>
      </ReviewRow>
      <ReviewRow
        correct={null}
        leading={<span className="type-caption text-success">{t.review.correctVersion}</span>}
      >
        <span className={textClass}>{review.correctText}</span>
      </ReviewRow>
    </ReviewList>
  );
}
