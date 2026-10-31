import { ReviewList, ReviewRow } from "@/components/game/ReviewList";
import { copy } from "@/content/copy";
import type { ResultDetailProps } from "../types";
import { buildReview } from "./logic";
import type { IntrusoAnswer, IntrusoPayload, IntrusoSolution } from "./schema";

const t = copy.games.intruso;

export function IntrusoReview({
  payload,
  answer,
  solution,
}: ResultDetailProps<IntrusoPayload, IntrusoAnswer, IntrusoSolution>) {
  const review = buildReview(payload, answer, solution);
  return (
    <ReviewList title={t.review.intruder(review.intruderText)}>
      <ReviewRow
        correct={review.isCorrect}
        detail={review.chosenText ? t.review.youChose(review.chosenText) : t.review.noAnswer}
        explanation={solution.explanation}
      >
        {payload.items.map((item) => item.text).join(" · ")}
      </ReviewRow>
    </ReviewList>
  );
}
