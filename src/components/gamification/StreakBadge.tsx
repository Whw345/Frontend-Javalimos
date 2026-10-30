import { Flame } from "lucide-react";
import { copy } from "@/content/copy";
import { cn } from "@/lib/utils/cn";

interface StreakBadgeProps {
  streakDays: number;
  className?: string;
}

export function StreakBadge({ streakDays, className }: StreakBadgeProps) {
  const active = streakDays > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 type-label tabular-nums",
        active ? "bg-reward-soft text-reward shadow-glow-reward" : "text-text-muted",
        className,
      )}
      aria-label={copy.common.streakAria(streakDays)}
    >
      <Flame aria-hidden className="size-4" />
      {streakDays}
    </span>
  );
}
