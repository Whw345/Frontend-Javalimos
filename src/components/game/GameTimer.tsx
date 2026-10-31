import { Timer } from "lucide-react";
import { copy } from "@/content/copy";
import { cn } from "@/lib/utils/cn";
import { formatClock } from "@/lib/utils/format";

type TimerStage = "normal" | "warning" | "critical";

const WARNING_RATIO = 0.5;
const CRITICAL_RATIO = 0.2;

function stageFor(ratio: number): TimerStage {
  if (ratio > WARNING_RATIO) return "normal";
  if (ratio > CRITICAL_RATIO) return "warning";
  return "critical";
}

interface GameTimerProps {
  remainingMs: number;
  totalMs: number;
}

/**
 * Barra de ancho completo + número (§11.2). El color es fijo (`timer`) para reconocerlo
 * de un vistazo; la urgencia final se comunica con barra más gruesa, pulso y anuncio.
 */
export function GameTimer({ remainingMs, totalMs }: GameTimerProps) {
  const ratio = totalMs > 0 ? Math.min(1, remainingMs / totalMs) : 0;
  const stage = stageFor(ratio);

  // Texto constante por umbral: el lector de pantalla lo anuncia una vez al cruzarlo, no cada segundo.
  const announcement =
    stage === "normal"
      ? ""
      : copy.shell.timer.announce(
          Math.ceil((totalMs * (stage === "warning" ? WARNING_RATIO : CRITICAL_RATIO)) / 1000),
        );

  return (
    <div className="flex shrink-0 items-center gap-3 px-4 lg:px-8">
      <div
        role="progressbar"
        aria-label={copy.shell.timer.label}
        aria-valuemin={0}
        aria-valuemax={Math.round(totalMs / 1000)}
        aria-valuenow={Math.ceil(remainingMs / 1000)}
        className={cn(
          "flex-1 overflow-hidden rounded-full bg-surface-sunken transition-[height] duration-(--duration-fast)",
          stage === "critical" ? "h-3" : "h-2.5",
        )}
      >
        <div
          className="h-full w-full origin-left rounded-full bg-timer motion-safe:transition-transform motion-safe:duration-(--duration-instant) motion-safe:ease-linear"
          style={{ transform: `scaleX(${ratio})` }}
        />
      </div>
      <span
        className={cn(
          "flex w-16 items-center justify-end gap-1 type-label text-timer tabular-nums",
          stage === "critical" && "motion-safe:animate-timer-pulse",
        )}
      >
        <Timer aria-hidden className="size-4" />
        {formatClock(remainingMs)}
      </span>
      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
    </div>
  );
}
