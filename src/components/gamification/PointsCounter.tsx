"use client";

import { animate, useReducedMotion } from "motion/react";
import { Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { copy } from "@/content/copy";
import { cn } from "@/lib/utils/cn";
import { formatNumber } from "@/lib/utils/format";
import { DURATION, EASE } from "@/styles/motion";

interface PointsCounterProps {
  points: number;
  className?: string;
}

/** Puntos del estudiante; anima el incremento contando (§10). */
export function PointsCounter({ points, className }: PointsCounterProps) {
  const reduceMotion = useReducedMotion();
  const [displayed, setDisplayed] = useState(points);
  const previous = useRef(points);

  useEffect(() => {
    const from = previous.current;
    previous.current = points;
    if (from === points) return;
    // Con movimiento reducido el número cambia de golpe (duración 0).
    const controls = animate(from, points, {
      duration: reduceMotion ? 0 : DURATION.slow,
      ease: EASE.out,
      onUpdate: (value) => setDisplayed(Math.round(value)),
    });
    return () => controls.stop();
  }, [points, reduceMotion]);

  const formatted = formatNumber(displayed);

  return (
    <span
      className={cn("inline-flex items-center gap-1 type-label text-reward tabular-nums", className)}
      aria-label={copy.common.pointsAria(formatNumber(points))}
    >
      <Sparkles aria-hidden className="size-4" />
      {formatted}
    </span>
  );
}
