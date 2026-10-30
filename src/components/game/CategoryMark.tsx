import { cn } from "@/lib/utils/cn";

export type CategoryIndex = 0 | 1 | 2 | 3 | 4;

/** §4.1: cada categoría tiene color + forma + letra. Clases completas para que Tailwind las detecte. */
export const CATEGORIES = [
  {
    shape: "●",
    letter: "A",
    text: "text-cat-1",
    border: "border-cat-1 ring-cat-1",
    stroke: "stroke-cat-1",
    soft: "bg-cat-1/15",
  },
  {
    shape: "■",
    letter: "B",
    text: "text-cat-2",
    border: "border-cat-2 ring-cat-2",
    stroke: "stroke-cat-2",
    soft: "bg-cat-2/15",
  },
  {
    shape: "▲",
    letter: "C",
    text: "text-cat-3",
    border: "border-cat-3 ring-cat-3",
    stroke: "stroke-cat-3",
    soft: "bg-cat-3/15",
  },
  {
    shape: "◆",
    letter: "D",
    text: "text-cat-4",
    border: "border-cat-4 ring-cat-4",
    stroke: "stroke-cat-4",
    soft: "bg-cat-4/15",
  },
  {
    shape: "★",
    letter: "E",
    text: "text-cat-5",
    border: "border-cat-5 ring-cat-5",
    stroke: "stroke-cat-5",
    soft: "bg-cat-5/15",
  },
] as const;

export function categoryAt(index: number) {
  return CATEGORIES[index % CATEGORIES.length]!;
}

interface CategoryMarkProps {
  index: number;
  /** Texto junto a la forma; por defecto la letra de la categoría. */
  label?: string;
  className?: string;
}

/** Marca de categoría: forma + texto con el color de la categoría (nunca solo color). */
export function CategoryMark({ index, label, className }: CategoryMarkProps) {
  const category = categoryAt(index);
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex h-6 min-w-6 shrink-0 items-center justify-center gap-1 rounded-sm px-1.5 type-caption",
        category.soft,
        category.text,
        className,
      )}
    >
      <span className="text-[0.625rem] leading-none">{category.shape}</span>
      {label ?? category.letter}
    </span>
  );
}
