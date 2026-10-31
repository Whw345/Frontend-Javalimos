"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useEffectEvent, useState, type RefObject } from "react";
import { categoryAt } from "@/components/game/CategoryMark";
import { cn } from "@/lib/utils/cn";
import { DURATION, EASE } from "@/styles/motion";
import type { Pair } from "./schema";

interface Line {
  key: string;
  path: string;
  categoryIndex: number;
  start: { x: number; y: number };
  end: { x: number; y: number };
}

interface MatchConnectorsProps {
  containerRef: RefObject<HTMLElement | null>;
  pairs: Pair[];
  /** Busca el nodo de una ficha por id (lo registra Parejas con refs). */
  getTile: (side: "concept" | "definition", id: string) => HTMLElement | undefined;
  categoryFor: (conceptId: string) => number;
}

/**
 * Conector visual entre pares formados (§12, Parejas). Solo en ≥768 px,
 * donde las columnas están lado a lado; en móvil la forma + número basta.
 */
export function MatchConnectors({ containerRef, pairs, getTile, categoryFor }: MatchConnectorsProps) {
  const reduceMotion = useReducedMotion();
  const [lines, setLines] = useState<Line[]>([]);

  const measure = useEffectEvent(() => {
    const container = containerRef.current;
    if (!container) return;
    const box = container.getBoundingClientRect();

    const next = pairs.flatMap((pair): Line[] => {
      const concept = getTile("concept", pair.conceptId)?.getBoundingClientRect();
      const definition = getTile("definition", pair.definitionId)?.getBoundingClientRect();
      if (!concept || !definition) return [];
      const start = { x: concept.right - box.left, y: concept.top + concept.height / 2 - box.top };
      const end = { x: definition.left - box.left, y: definition.top + definition.height / 2 - box.top };
      const bend = (end.x - start.x) / 2;
      return [
        {
          key: `${pair.conceptId}:${pair.definitionId}`,
          path: `M ${start.x} ${start.y} C ${start.x + bend} ${start.y}, ${end.x - bend} ${end.y}, ${end.x} ${end.y}`,
          categoryIndex: categoryFor(pair.conceptId),
          start,
          end,
        },
      ];
    });
    setLines(next);
  });

  useEffect(() => {
    const frame = requestAnimationFrame(() => measure());
    return () => cancelAnimationFrame(frame);
  }, [pairs]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(container);
    return () => observer.disconnect();
  }, [containerRef]);

  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 hidden size-full overflow-visible md:block"
    >
      {lines.map((line) => {
        const { stroke } = categoryAt(line.categoryIndex);
        return (
          <g key={line.key} className={cn(stroke, "fill-none")}>
            <motion.path
              d={line.path}
              strokeWidth={2}
              strokeLinecap="round"
              initial={reduceMotion ? { opacity: 0 } : { pathLength: 0 }}
              animate={reduceMotion ? { opacity: 1 } : { pathLength: 1 }}
              transition={{ duration: DURATION.base, ease: EASE.out }}
            />
            <circle cx={line.start.x} cy={line.start.y} r={4} className="fill-bg" strokeWidth={2} />
            <circle cx={line.end.x} cy={line.end.y} r={4} className="fill-bg" strokeWidth={2} />
          </g>
        );
      })}
    </svg>
  );
}
