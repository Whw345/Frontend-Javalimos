import { cva } from "class-variance-authority";
import { CircleCheck, CircleX } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";
import { Kbd } from "@/components/ui/Kbd";
import { cn } from "@/lib/utils/cn";
import { categoryAt } from "./CategoryMark";

export type GameTileState = "idle" | "selected" | "matched" | "correct" | "incorrect";

const tileVariants = cva(
  [
    "group relative flex min-h-12 w-full items-center gap-3 rounded-lg border bg-surface-raised px-4 py-3 text-left lg:min-h-16 lg:px-5 lg:py-4",
    "[-webkit-tap-highlight-color:transparent] select-none",
    "transition-[border-color,background-color,box-shadow] duration-(--duration-fast) ease-out",
    "focus-visible:shadow-glow-primary disabled:cursor-default disabled:opacity-50",
  ],
  {
    variants: {
      // Los estados de 2 px suman un ring inset al borde de 1 px: así la ficha no cambia de tamaño.
      state: {
        idle: "border-border enabled:hover:border-border-strong",
        selected: "border-primary bg-primary-soft shadow-glow-primary ring-1 ring-primary ring-inset",
        matched: "ring-1 ring-inset",
        correct: "border-success ring-1 ring-success ring-inset",
        incorrect: "border-error ring-1 ring-error ring-inset",
      },
    },
    defaultVariants: { state: "idle" },
  },
);

export interface GameTileProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  ref?: Ref<HTMLButtonElement>;
  state?: GameTileState;
  /** Para `matched`: índice de categoría que da el color del borde. */
  category?: number;
  shortcut?: string;
  /** Elemento al inicio (p. ej. `CategoryMark`). */
  leading?: ReactNode;
  children: string;
}

/** Ficha de juego compartida (§11.4). El texto se corta a 3 líneas; el completo queda en `title`. */
export function GameTile({
  state = "idle",
  category,
  shortcut,
  leading,
  children,
  className,
  type = "button",
  ...props
}: GameTileProps) {
  const matchedBorder =
    state === "matched" && category !== undefined ? categoryAt(category).border : undefined;

  return (
    <button
      type={type}
      title={children}
      className={cn(tileVariants({ state }), matchedBorder, className)}
      {...props}
    >
      {leading}
      <span className="line-clamp-3 min-w-0 flex-1 type-body-lg text-text">{children}</span>
      {state === "correct" && <CircleCheck aria-hidden className="size-5 shrink-0 text-success" />}
      {state === "incorrect" && <CircleX aria-hidden className="size-5 shrink-0 text-error" />}
      {shortcut && <Kbd className="shrink-0 self-start">{shortcut}</Kbd>}
    </button>
  );
}
