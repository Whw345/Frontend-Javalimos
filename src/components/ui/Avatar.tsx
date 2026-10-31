import { cn } from "@/lib/utils/cn";

const sizes = { 32: "size-8", 40: "size-10", 64: "size-16 type-h3" } as const;

function initials(name: string) {
  const words = name.trim().split(/\s+/);
  return `${words[0]?.[0] ?? ""}${words.length > 1 ? words[words.length - 1]![0] : ""}`.toUpperCase();
}

/** Iniciales del nombre (§9.3). El nombre siempre aparece junto al avatar: es decorativo. */
export function Avatar({
  name,
  size = 40,
  className,
}: {
  name: string;
  size?: keyof typeof sizes;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-surface-raised type-label text-text-secondary",
        sizes[size],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
