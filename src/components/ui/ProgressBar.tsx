import { cn } from "@/lib/utils/cn";

const fillClasses = {
  primary: "bg-primary",
  reward: "bg-reward",
  success: "bg-success",
  warning: "bg-warning",
  error: "bg-error",
} as const;

interface ProgressBarProps {
  value: number;
  max: number;
  variant?: keyof typeof fillClasses;
  label: string;
  /** Texto para lectores de pantalla, p. ej. "3 de 4". */
  valueText?: string;
  className?: string;
}

/** Barra de 8 px, `radius-full`, fondo `surface-sunken` (§9.3). */
export function ProgressBar({
  value,
  max,
  variant = "primary",
  label,
  valueText,
  className,
}: ProgressBarProps) {
  const ratio = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={valueText}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-surface-sunken", className)}
    >
      <div
        className={cn("h-full w-full origin-left rounded-full", fillClasses[variant])}
        style={{ transform: `scaleX(${ratio})` }}
      />
    </div>
  );
}
