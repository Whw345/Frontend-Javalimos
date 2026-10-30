import type { Ref, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";
import { fieldClasses } from "./Input";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  ref?: Ref<HTMLTextAreaElement>;
  /** Muestra "usados / máximo" bajo el campo (§9.3). Requiere `maxLength`. */
  showCount?: boolean;
  counterLabel?: (used: number, max: number) => string;
}

export function Textarea({ className, showCount, counterLabel, maxLength, value, ...props }: TextareaProps) {
  const used = typeof value === "string" ? value.length : 0;
  const nearLimit = maxLength !== undefined && used >= maxLength * 0.9;

  return (
    <div className="flex flex-col gap-1">
      <textarea
        className={cn(fieldClasses, "min-h-32 resize-none py-3", className)}
        maxLength={maxLength}
        value={value}
        {...props}
      />
      {showCount && maxLength !== undefined && (
        <p
          aria-live="polite"
          className={cn("self-end type-caption tabular-nums", nearLimit ? "text-warning" : "text-text-muted")}
        >
          {counterLabel ? counterLabel(used, maxLength) : `${used} / ${maxLength}`}
        </p>
      )}
    </div>
  );
}
