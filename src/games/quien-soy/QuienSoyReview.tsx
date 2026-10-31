import { ReviewList, ReviewRow } from "@/components/game/ReviewList";
import { copy } from "@/content/copy";
import type { ResultDetailProps } from "../types";
import { buildReview } from "./logic";
import type { QuienSoyAnswer, QuienSoyPayload, QuienSoySolution } from "./schema";

const t = copy.games.quienSoy;

export function QuienSoyReview({
  payload,
  answer,
  solution,
}: ResultDetailProps<QuienSoyPayload, QuienSoyAnswer, QuienSoySolution>) {
  const review = buildReview(payload, answer, solution);

  return (
    <ReviewList title={t.review.answer(review.answerText)}>
      <ReviewRow
        correct={review.isCorrect}
        detail={t.review.cluesSeen(review.cluesSeen, payload.clues.length)}
        explanation={solution.explanation}
      >
        {review.given ? t.review.youAnswered(review.given) : t.review.noAnswer}
      </ReviewRow>
      {payload.clues.map((clue, index) => (
        <ReviewRow
          key={index}
          correct={null}
          leading={<span className="type-caption text-info">{t.clue(index + 1)}</span>}
        >
          {clue}
        </ReviewRow>
      ))}
    </ReviewList>
  );
}
