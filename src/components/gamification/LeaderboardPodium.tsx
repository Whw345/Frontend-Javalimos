import { Medal } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { copy } from "@/content/copy";
import type { LeaderboardEntry } from "@/lib/api/teacher";
import { cn } from "@/lib/utils/cn";
import { formatNumber } from "@/lib/utils/format";

/** El primero va al centro, por encima de los otros dos. */
const steps = ["order-2 min-h-56", "order-1 min-h-48", "order-3 min-h-44"];

/** Top 3 sobre la lista (§10). Repite lo que ya dice la lista, así que se oculta a lectores. */
export function LeaderboardPodium({ entries }: { entries: LeaderboardEntry[] }) {
  return (
    <div aria-hidden className="hidden grid-cols-3 items-end gap-4 md:grid">
      {entries.map((entry, index) => (
        <div
          key={entry.userId}
          className={cn(
            "flex flex-col items-center justify-end gap-2 rounded-lg border border-border bg-surface p-4 text-center",
            index === 0 && "border-reward",
            steps[index],
          )}
        >
          <Medal className="size-6 text-reward" />
          <Avatar name={entry.name} size={index === 0 ? 64 : 40} />
          <p className="w-full truncate type-label text-text">{entry.name}</p>
          <p className="type-h3 text-reward tabular-nums">{copy.common.points(formatNumber(entry.points))}</p>
        </div>
      ))}
    </div>
  );
}
