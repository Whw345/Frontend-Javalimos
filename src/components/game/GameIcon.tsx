import { cva } from "class-variance-authority";
import type { AnyGameDefinition } from "@/games/registry";
import type { GameAccent } from "@/games/types";
import { cn } from "@/lib/utils/cn";

// Clases completas (no interpoladas) para que Tailwind las detecte.
const accentClasses: Record<GameAccent, string> = {
  "cat-1": "bg-cat-1/15 text-cat-1",
  "cat-2": "bg-cat-2/15 text-cat-2",
  "cat-3": "bg-cat-3/15 text-cat-3",
  "cat-4": "bg-cat-4/15 text-cat-4",
  "cat-5": "bg-cat-5/15 text-cat-5",
};

const containerVariants = cva("inline-flex shrink-0 items-center justify-center", {
  variants: {
    size: {
      sm: "size-8 rounded-sm [&_svg]:size-4",
      lg: "size-12 rounded-md [&_svg]:size-6",
    },
  },
  defaultVariants: { size: "lg" },
});

interface GameIconProps {
  definition: AnyGameDefinition;
  size?: "sm" | "lg";
  className?: string;
}

/** Ícono del minijuego en su contenedor con el color de acento fijo (§8.2). */
export function GameIcon({ definition, size, className }: GameIconProps) {
  const Icon = definition.icon;
  return (
    <span
      aria-hidden
      className={cn(containerVariants({ size }), accentClasses[definition.accent], className)}
    >
      <Icon />
    </span>
  );
}

export const accentTextClasses: Record<GameAccent, string> = {
  "cat-1": "text-cat-1",
  "cat-2": "text-cat-2",
  "cat-3": "text-cat-3",
  "cat-4": "text-cat-4",
  "cat-5": "text-cat-5",
};
