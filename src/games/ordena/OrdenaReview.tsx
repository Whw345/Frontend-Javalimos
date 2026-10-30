import { copy } from "@/content/copy";
import { ReviewList, ReviewRow } from "@/components/game/ReviewList";
import type { ResultDetailProps } from "../types";
import { buildReview, countCorrect } from "./logic";
import type { OrdenaAnswer, OrdenaPayload, OrdenaSolution } from "./schema";

const t = copy.games.ordena;

export function OrdenaReview({
  payload,
  answer,
  solution,
}: ResultDetailProps<OrdenaPayload, OrdenaAnswer, OrdenaSolution>) {
  const items = buildReview(payload, answer, solution);

  return (
    <ReviewList title={t.review.title(countCorrect(items), items.length)}>
      {items.map((item) => (
        <ReviewRow
          key={item.step.id}
          correct={item.isCorrect}
          leading={<span className="type-label text-text-muted tabular-nums">{item.position}.</span>}
          detail={!item.isCorrect && item.chosenPosition ? t.review.wasAt(item.chosenPosition) : undefined}
        >
          {item.step.text}
        </ReviewRow>
      ))}
    </ReviewList>
  );
}
