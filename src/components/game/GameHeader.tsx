import { X } from "lucide-react";
import { PointsCounter } from "@/components/gamification/PointsCounter";
import { StreakBadge } from "@/components/gamification/StreakBadge";
import { Button } from "@/components/ui/Button";
import { Kbd } from "@/components/ui/Kbd";
import { copy } from "@/content/copy";
import type { AnyGameDefinition } from "@/games/registry";
import type { Difficulty } from "@/games/types";
import type { ProgressTotals } from "@/lib/api/schemas";
import { GameIcon } from "./GameIcon";

interface GameHeaderProps {
  definition: AnyGameDefinition;
  week: number;
  difficulty: Difficulty;
  progress: ProgressTotals | undefined;
  onExit: () => void;
}

export function GameHeader({ definition, week, difficulty, progress, onExit }: GameHeaderProps) {
  return (
    <header className="grid h-14 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 lg:h-16 lg:px-8">
      <div>
        <Button variant="ghost" size="sm" onClick={onExit} aria-label={copy.shell.exitAria} className="-ml-2">
          <X aria-hidden />
          <span className="hidden lg:inline">{copy.shell.exit}</span>
          <Kbd>Esc</Kbd>
        </Button>
      </div>

      <div className="flex min-w-0 items-center gap-2">
        <GameIcon definition={definition} size="sm" />
        <p className="truncate type-label text-text">
          {definition.name}
          <span className="hidden text-text-muted sm:inline"> · {copy.shell.meta(week, difficulty)}</span>
        </p>
      </div>

      <div className="flex items-center justify-end gap-3">
        {progress && (
          <>
            <PointsCounter points={progress.points} />
            <StreakBadge streakDays={progress.streakDays} className="hidden sm:inline-flex" />
          </>
        )}
      </div>
    </header>
  );
}
