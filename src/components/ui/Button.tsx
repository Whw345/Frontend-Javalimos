import { cva, type VariantProps } from "class-variance-authority";
import { LoaderCircle } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export const buttonVariants = cva(
  [
    "relative inline-flex shrink-0 select-none items-center justify-center gap-2 rounded-md type-label",
    // Borde transparente: en forced-colors el ring de foco (box-shadow) desaparece y el borde queda.
    "border border-transparent [-webkit-tap-highlight-color:transparent]",
    "transition-[background-color,border-color,color,box-shadow,scale] duration-(--duration-fast) ease-out",
    "motion-safe:enabled:active:scale-[0.97] active:duration-(--duration-instant)",
    "focus-visible:shadow-glow-primary disabled:pointer-events-none disabled:opacity-40",
    "[&_svg]:size-5 [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        primary: "bg-primary text-text-on-primary shadow-sm hover:bg-primary-hover",
        secondary: "border-border-strong bg-surface-raised text-text hover:border-primary",
        ghost: "bg-transparent text-text-secondary hover:bg-surface-raised hover:text-text",
        reward: "bg-(image:--gradient-reward) text-text-on-reward shadow-sm",
        danger: "bg-error-soft text-error hover:bg-error/25",
      },
      size: {
        sm: "h-9 px-3",
        md: "h-11 px-4",
        lg: "h-13 px-6 text-base",
        icon: "size-11",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export function Button({
  className,
  variant,
  size,
  loading = false,
  disabled,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <LoaderCircle aria-hidden className="animate-spin" />}
      {children}
    </button>
  );
}
