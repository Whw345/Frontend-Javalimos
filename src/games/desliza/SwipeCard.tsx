"use client";

import { motion, useMotionValue, useReducedMotion, useTransform, type PanInfo } from "motion/react";
import { Lightbulb } from "lucide-react";
import { useLayoutEffect, useRef } from "react";
import { copy } from "@/content/copy";
import { cn } from "@/lib/utils/cn";
import { DURATION, EASE } from "@/styles/motion";
import { resolveSwipe, swipeProgress, tiltForOffset } from "./logic";
import type { DeslizaStatement } from "./schema";

const t = copy.games.desliza;

/** Dirección en la que sale la tarjeta: 1 derecha, −1 izquierda, 0 sin respuesta (tiempo). */
export type ExitDirection = 1 | -1 | 0;

/**
 * `custom` de las variantes. AnimatePresence lo reemplaza al salir, así la tarjeta
 * que se va conoce la dirección de la respuesta aunque ya no esté en el árbol.
 */
export interface CardMotionContext {
  direction: ExitDirection;
  reduceMotion: boolean;
}

const EXIT_DISTANCE_PX = 640;

const cardVariants = {
  enter: ({ reduceMotion }: CardMotionContext) =>
    reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 12 },
  center: { opacity: 1, scale: 1, y: 0, transition: { duration: DURATION.base, ease: EASE.out } },
  exit: ({ direction, reduceMotion }: CardMotionContext) => {
    if (reduceMotion) return { opacity: 0, transition: { duration: DURATION.fast } };
    // Sin respuesta (tiempo): salida corta; la dirección no comunica nada.
    if (direction === 0) {
      return {
        opacity: 0,
        y: -12,
        filter: "blur(4px)",
        transition: { duration: DURATION.fast, ease: EASE.out },
      };
    }
    return {
      x: direction * EXIT_DISTANCE_PX,
      rotate: direction * 24,
      opacity: 0,
      transition: { duration: DURATION.base, ease: EASE.in },
    };
  },
};

interface SwipeCardProps {
  statement: DeslizaStatement;
  position: number;
  total: number;
  hintRevealed: boolean;
  disabled: boolean;
  onDecide: (verdict: boolean) => void;
}

export function SwipeCard({ statement, position, total, hintRevealed, disabled, onDecide }: SwipeCardProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const cardRef = useRef<HTMLDivElement>(null);
  const widthRef = useRef(0);
  const x = useMotionValue(0);
  const enterContext: CardMotionContext = { direction: 0, reduceMotion };

  useLayoutEffect(() => {
    const node = cardRef.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) widthRef.current = entry.contentRect.width;
    });
    observer.observe(node);
    widthRef.current = node.offsetWidth;
    return () => observer.disconnect();
  }, []);

  const rotate = useTransform(x, (value) => (reduceMotion ? 0 : tiltForOffset(value, widthRef.current)));
  const trueOpacity = useTransform(x, (value) => Math.max(0, swipeProgress(value, widthRef.current)));
  const falseOpacity = useTransform(x, (value) => Math.max(0, -swipeProgress(value, widthRef.current)));

  const handleDragEnd = (_event: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
    const verdict = resolveSwipe(info.offset.x, widthRef.current, info.velocity.x);
    if (verdict !== null) onDecide(verdict);
  };

  return (
    <motion.div
      ref={cardRef}
      role="group"
      aria-roledescription="tarjeta"
      aria-label={t.cardAria(position, total)}
      custom={enterContext}
      variants={cardVariants}
      initial="enter"
      animate="center"
      exit="exit"
      drag={disabled ? false : "x"}
      dragSnapToOrigin
      dragElastic={0.9}
      onDragEnd={handleDragEnd}
      whileDrag={reduceMotion ? undefined : { scale: 1.03 }}
      style={{ x, rotate }}
      className={cn(
        "absolute inset-0 flex flex-col rounded-lg border border-border bg-surface-raised p-5 shadow-md lg:p-8",
        "touch-pan-y select-none [-webkit-tap-highlight-color:transparent]",
        disabled ? "opacity-50" : "cursor-grab active:cursor-grabbing active:shadow-lg",
      )}
    >
      <div className="flex min-h-7 items-start justify-between gap-3">
        <motion.span
          aria-hidden
          style={{ opacity: falseOpacity }}
          className="-rotate-6 rounded-sm border-2 border-error px-2 py-0.5 type-overline text-error"
        >
          {t.stampFalse}
        </motion.span>
        <motion.span
          aria-hidden
          style={{ opacity: trueOpacity }}
          className="rotate-6 rounded-sm border-2 border-success px-2 py-0.5 type-overline text-success"
        >
          {t.stampTrue}
        </motion.span>
      </div>

      <p className="flex flex-1 items-center justify-center text-center type-prompt text-text text-balance">
        {statement.text}
      </p>

      <div className="flex min-h-7 items-end justify-center">
        {hintRevealed && (
          <span className="inline-flex items-center gap-1 rounded-full bg-surface-sunken px-3 py-1 type-caption text-info">
            <Lightbulb aria-hidden className="size-4" />
            {t.hintTopic(statement.concepto)}
          </span>
        )}
      </div>
    </motion.div>
  );
}
