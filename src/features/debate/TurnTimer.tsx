import { copy } from "@/content/copy";
import { cn } from "@/lib/utils/cn";
import { formatClock } from "@/lib/utils/format";

const CRITICAL_RATIO = 0.2;
const LAST_SECONDS = 10;

interface TurnTimerProps {
  remainingMs: number;
  totalMs: number;
  /** El reloj global ya anuncia: este calla para no solapar anuncios (§6.6 del spec). */
  muteAnnouncements: boolean;
}

/** Tope del turno: barra fina dentro del área central, bajo el compositor. */
export function TurnTimer({ remainingMs, totalMs, muteAnnouncements }: TurnTimerProps) {
  const ratio = totalMs > 0 ? Math.min(1, remainingMs / totalMs) : 0;
  const critical = ratio <= CRITICAL_RATIO || remainingMs <= LAST_SECONDS * 1000;
  const announcement = critical && !muteAnnouncements ? copy.debate.screen.turnAnnounce(LAST_SECONDS) : "";

  return (
    <div className="flex items-center gap-3">
      <div
        role="progressbar"
        aria-label={copy.debate.screen.turnTimer}
        aria-valuemin={0}
        aria-valuemax={Math.round(totalMs / 1000)}
        aria-valuenow={Math.ceil(remainingMs / 1000)}
        // Color fijo `timer`; la urgencia se comunica con grosor, pulso y anuncio (§11.2).
        className={cn(
          "flex-1 overflow-hidden rounded-full bg-surface-sunken transition-[height] duration-(--duration-fast)",
          critical ? "h-2" : "h-1.5",
        )}
      >
        <div
          className="h-full w-full origin-left rounded-full bg-timer motion-safe:transition-transform motion-safe:duration-(--duration-instant) motion-safe:ease-linear"
          style={{ transform: `scaleX(${ratio})` }}
        />
      </div>
      <span
        className={cn(
          "w-12 text-right type-caption tabular-nums",
          "text-timer",
          critical && "motion-safe:animate-timer-pulse",
        )}
      >
        {formatClock(remainingMs)}
      </span>
      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
    </div>
  );
}
