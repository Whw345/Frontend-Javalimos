import { copy } from "@/content/copy";
import type { GameShortcut } from "@/games/types";

interface ShortcutLegendProps {
  shortcuts: GameShortcut[];
  hintAvailable: boolean;
}

/** Leyenda de una línea con los atajos del juego actual. Solo en ≥1024 px (§11.5). */
export function ShortcutLegend({ shortcuts, hintAvailable }: ShortcutLegendProps) {
  const items = [
    ...shortcuts.map((shortcut) => shortcut.label),
    ...(hintAvailable ? [copy.shell.shortcuts.hint] : []),
    copy.shell.shortcuts.exit,
  ];

  return (
    <p
      aria-hidden
      className="hidden shrink-0 pb-4 text-center short:pb-1 type-caption text-text-muted lg:block"
    >
      {copy.shell.shortcuts.title} {items.join(" · ")}
    </p>
  );
}
