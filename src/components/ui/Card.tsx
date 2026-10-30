import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export const cardVariants = cva("rounded-lg border border-border bg-surface p-4 lg:p-6", {
  variants: {
    interactive: {
      true: "transition-[border-color,translate] duration-(--duration-fast) ease-out motion-safe:hover:-translate-y-0.5 hover:border-border-strong focus-within:border-border-strong",
      false: "",
    },
  },
  defaultVariants: { interactive: false },
});

export interface CardProps extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {}

export function Card({ className, interactive, ...props }: CardProps) {
  return <div className={cn(cardVariants({ interactive }), className)} {...props} />;
}
