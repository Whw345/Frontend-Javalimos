import { Medal, Sparkles } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { copy } from "@/content/copy";
import type { LeaderboardEntry } from "@/lib/api/teacher";
import { cn } from "@/lib/utils/cn";
import { formatNumber } from "@/lib/utils/format";

const t = copy.teacher.admin.ranking;

/** Posición, avatar, nombre y puntos. Top 3 con medalla; top 5 con borde de recompensa (§10). */
export function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  const scored = entry.points > 0;
  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-lg border bg-surface p-3",
        scored && entry.rank <= 5 ? "border-reward" : "border-border",
      )}
    >
      <span
        aria-label={t.rank(entry.rank)}
        className="flex w-10 shrink-0 items-center gap-1 type-label text-text-secondary tabular-nums"
      >
        {entry.rank}
        {scored && entry.rank <= 3 && <Medal aria-hidden className="size-4 text-reward" />}
      </span>
      <Avatar name={entry.name} />
      <div className="min-w-0 flex-1">
        <p className="truncate type-body text-text">{entry.name}</p>
        <p className="type-caption text-text-muted">{t.played(entry.played)}</p>
      </div>
      <span className="inline-flex items-center gap-1 type-label text-reward tabular-nums">
        <Sparkles aria-hidden className="size-4" />
        {copy.common.points(formatNumber(entry.points))}
      </span>
    </li>
  );
}
