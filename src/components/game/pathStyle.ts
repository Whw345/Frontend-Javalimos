import type { GameAccent } from "@/games/types";

/** Curva del camino (px desde el centro). */
export const CURVE = [0, -52, -84, -52, 0, 52, 84, 52];

export const nodeFills: Record<GameAccent, string> = {
  "cat-1": "bg-cat-1",
  "cat-2": "bg-cat-2",
  "cat-3": "bg-cat-3",
  "cat-4": "bg-cat-4",
  "cat-5": "bg-cat-5",
};

export const nodeAccents: Record<GameAccent, string> = {
  "cat-1": "bg-cat-1 shadow-[0_6px_0_color-mix(in_srgb,var(--color-cat-1)_55%,var(--color-bg))]",
  "cat-2": "bg-cat-2 shadow-[0_6px_0_color-mix(in_srgb,var(--color-cat-2)_55%,var(--color-bg))]",
  "cat-3": "bg-cat-3 shadow-[0_6px_0_color-mix(in_srgb,var(--color-cat-3)_55%,var(--color-bg))]",
  "cat-4": "bg-cat-4 shadow-[0_6px_0_color-mix(in_srgb,var(--color-cat-4)_55%,var(--color-bg))]",
  "cat-5": "bg-cat-5 shadow-[0_6px_0_color-mix(in_srgb,var(--color-cat-5)_55%,var(--color-bg))]",
};

/** Dónde retoma la curva cada semana, según cuántas casillas tuvo la anterior. */
export function pathOffsets(nodesPerWeek: number[]) {
  return nodesPerWeek.reduce<number[]>(
    (result, nodes, index) => [...result, result[index]! + Math.max(nodes, 3)],
    [0],
  );
}
