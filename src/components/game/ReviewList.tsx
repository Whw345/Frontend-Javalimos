import { CircleCheck, CircleX } from "lucide-react";
import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

interface ReviewListProps {
  title: string;
  children: ReactNode;
  /** Contenido extra entre el título y la lista (p. ej. la oración completa en Hueco). */
  intro?: ReactNode;
}

/** Contenedor de la revisión que el shell muestra en lugar del área de juego tras responder. */
export function ReviewList({ title, intro, children }: ReviewListProps) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className="flex h-full min-h-0 flex-col gap-3 py-2">
      <h3 id={titleId} className="type-h3 text-text">
        {title}
      </h3>
      {intro}
      <ol className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain pr-1">
        {children}
      </ol>
    </section>
  );
}

interface ReviewRowProps {
  /** Correcto/incorrecto con ícono + borde (nunca solo color). `null` = fila neutra. */
  correct: boolean | null;
  children: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  /** Línea secundaria (qué eligió el estudiante). */
  detail?: ReactNode;
  explanation?: string;
}

export function ReviewRow({ correct, children, leading, trailing, detail, explanation }: ReviewRowProps) {
  const Icon = correct ? CircleCheck : CircleX;
  return (
    <li
      className={cn(
        "flex items-start gap-3 rounded-lg border bg-surface-raised px-4 py-3",
        correct === null ? "border-border" : correct ? "border-success/60" : "border-error/60",
      )}
    >
      {correct !== null && (
        <Icon aria-hidden className={cn("mt-0.5 size-5 shrink-0", correct ? "text-success" : "text-error")} />
      )}
      {leading && <span className="mt-0.5 shrink-0">{leading}</span>}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="type-body text-text">{children}</div>
        {detail && <p className="type-caption text-text-muted">{detail}</p>}
        {explanation && <p className="type-body text-text-secondary">{explanation}</p>}
      </div>
      {trailing && <span className="shrink-0">{trailing}</span>}
    </li>
  );
}
