import { Zap } from "lucide-react";
import { copy } from "@/content/copy";
import { cn } from "@/lib/utils/cn";

interface WeeklyQuotaProps {
  played: number;
  limit: number;
  className?: string;
}

/** Un segmento por reto semanal; llenos los ya jugados (§10). */
export function WeeklyQuota({ played, limit, className }: WeeklyQuotaProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <p className="flex items-center gap-1 type-label text-text-secondary">
        <Zap aria-hidden className="size-4 text-reward" />
        {copy.picker.weeklyQuota(played, limit)}
      </p>
      <div aria-hidden className="flex gap-1">
        {Array.from({ length: limit }, (_, index) => (
          <span
            key={index}
            className={cn("h-2 flex-1 rounded-full", index < played ? "bg-reward" : "bg-surface-sunken")}
          />
        ))}
      </div>
    </div>
  );
}
