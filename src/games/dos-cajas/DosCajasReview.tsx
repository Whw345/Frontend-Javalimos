import { CategoryMark } from "@/components/game/CategoryMark";
import { ReviewList, ReviewRow } from "@/components/game/ReviewList";
import { copy } from "@/content/copy";
import type { ResultDetailProps } from "../types";
import { buildReview, countCorrect } from "./logic";
import type { DosCajasAnswer, DosCajasPayload, DosCajasSolution } from "./schema";

const t = copy.games.dosCajas;

export function DosCajasReview({
  payload,
  answer,
  solution,
}: ResultDetailProps<DosCajasPayload, DosCajasAnswer, DosCajasSolution>) {
  const items = buildReview(payload, answer, solution);

  return (
    <ReviewList title={t.review.title(countCorrect(items), items.length)}>
      {items.map((item) => (
        <ReviewRow
          key={item.card.id}
          correct={item.isCorrect}
          trailing={
            <CategoryMark index={item.expected === "a" ? 0 : 1} label={payload.boxes[item.expected]} />
          }
          detail={
            item.isCorrect
              ? undefined
              : item.chosen
                ? t.review.youChose(payload.boxes[item.chosen])
                : t.review.noAnswer
          }
          explanation={item.isCorrect ? undefined : item.explanation}
        >
          {item.card.text}
        </ReviewRow>
      ))}
    </ReviewList>
  );
}
