import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

const badgeVariants = cva(
  "inline-flex shrink-0 items-center gap-1 rounded-sm px-2 py-0.5 type-caption [&_svg]:size-3.5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        neutral: "bg-surface-raised text-text-secondary",
        primary: "bg-primary-soft text-text",
        reward: "bg-reward-soft text-reward",
        success: "bg-success-soft text-success",
        error: "bg-error-soft text-error",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

/** Etiqueta corta (§9.3): `radius-sm`, texto `caption`. */
export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
