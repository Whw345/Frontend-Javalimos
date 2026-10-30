import type { InputHTMLAttributes, Ref } from "react";
import { cn } from "@/lib/utils/cn";

export const fieldClasses = [
  "w-full rounded-md border border-border bg-surface-sunken px-4 type-body-lg text-text placeholder:text-text-muted",
  "transition-[border-color,box-shadow] duration-(--duration-fast) ease-out",
  "focus-visible:border-primary focus-visible:shadow-glow-primary disabled:opacity-50",
];

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  ref?: Ref<HTMLInputElement>;
}

/** Campo de texto (§9.3): 44 px de alto, fondo `surface-sunken`, borde `primary` en foco. */
export function Input({ className, ...props }: InputProps) {
  return <input className={cn(fieldClasses, "h-11", className)} {...props} />;
}
