import { ReviewList, ReviewRow } from "@/components/game/ReviewList";
import { copy } from "@/content/copy";
import type { ResultDetailProps } from "../types";
import { buildReview } from "./logic";
import type { HuecoAnswer, HuecoPayload, HuecoSolution } from "./schema";

const t = copy.games.hueco;

export function HuecoReview({
  payload,
  answer,
  solution,
}: ResultDetailProps<HuecoPayload, HuecoAnswer, HuecoSolution>) {
  const review = buildReview(payload, answer, solution);
  const detail = review.isCorrect
    ? t.review.correct
    : review.chosenText
      ? t.review.youChose(review.chosenText)
      : t.review.noAnswer;

  return (
    <ReviewList title={review.correctText}>
      <ReviewRow correct={review.isCorrect} detail={detail} explanation={solution.explanation}>
        <span className="type-body-lg">{review.fullSentence}</span>
      </ReviewRow>
    </ReviewList>
  );
}
