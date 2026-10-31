import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

/** Obligatorio en toda carga: nunca una pantalla vacía (§9.3). */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div aria-hidden className={cn("animate-pulse rounded-lg bg-surface-raised", className)} {...props} />
  );
}
