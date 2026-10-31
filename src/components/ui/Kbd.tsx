import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

/** Etiqueta de atajo de teclado. Solo visible en ≥1024 px (§9.3). */
export function Kbd({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      aria-hidden
      className={cn(
        "hidden min-w-6 items-center justify-center rounded-sm border border-border bg-surface-sunken px-1.5 py-0.5 type-kbd text-text-muted lg:inline-flex",
        className,
      )}
      {...props}
    />
  );
}
