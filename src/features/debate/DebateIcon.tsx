import { MessagesSquare } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/** Ícono del Modo Debate con su acento fijo `cat-4` (§6.5 del spec). */
export function DebateIcon({ size = "lg", className }: { size?: "sm" | "lg"; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center bg-cat-4/15 text-cat-4",
        size === "sm" ? "size-8 rounded-sm [&_svg]:size-4" : "size-12 rounded-md [&_svg]:size-6",
        className,
      )}
    >
      <MessagesSquare />
    </span>
  );
}
