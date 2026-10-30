"use client";

import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { CategoryMark } from "@/components/game/CategoryMark";
import { TextHint } from "@/components/game/TextHint";
import { Kbd } from "@/components/ui/Kbd";
import { copy } from "@/content/copy";
import { useGameHotkeys } from "@/lib/hooks/useGameHotkeys";
import { cn } from "@/lib/utils/cn";
import { DURATION, EASE } from "@/styles/motion";
import type { GameProps } from "../types";
import { createAnswer, isAnswerComplete, recordBox } from "./logic";
import { boxSchema, type Box, type DosCajasAnswer, type DosCajasCard, type DosCajasPayload } from "./schema";

const t = copy.games.dosCajas;
const BOX_CATEGORY: Record<Box, number> = { a: 0, b: 1 };

/**
 * Dos cajas: una tarjeta por ronda (el shell lleva el tiempo de cada una).
 * Se arrastra a la caja A o B, se toca la caja, o se usa ← / →.
 */
export function DosCajas({
  payload,
  disabled,
  hint,
  onAnswerChange,
  round,
  onRoundComplete,
}: GameProps<DosCajasPayload, DosCajasAnswer>) {
  const [answer, setAnswer] = useState(() => createAnswer(payload));
  const decidedRound = useRef(-1);
  // Sin KeyboardSensor: con teclado se usan ← / → o los botones de cada caja.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const current = payload.cards[round];

  useEffect(() => {
    onAnswerChange(createAnswer(payload), false);
  }, [payload, onAnswerChange]);

  const decide = (box: Box) => {
    if (disabled || !current || decidedRound.current === round) return;
    decidedRound.current = round;
    const next = recordBox(answer, current.id, box);
    setAnswer(next);
    onAnswerChange(next, isAnswerComplete(next));
    onRoundComplete();
  };

  const handleDragEnd = ({ over }: DragEndEvent) => {
    const box = boxSchema.safeParse(over?.id);
    if (box.success) decide(box.data);
  };

  useGameHotkeys({ arrowleft: () => decide("a"), arrowright: () => decide("b") }, { enabled: !disabled });

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex h-full flex-col items-center justify-center gap-4 py-2">
        <TextHint hint={hint} className="self-start" />
        <p className="type-caption text-text-muted tabular-nums" aria-live="polite">
          {t.progress(Math.min(round + 1, payload.cards.length), payload.cards.length)}
        </p>
        <div className="grid w-full grid-cols-2 items-stretch gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1fr)] md:gap-6">
          <div className="col-span-2 flex h-44 items-center justify-center md:order-2 md:col-span-1 md:h-64">
            {current && <DraggableCard key={current.id} card={current} disabled={disabled} />}
          </div>
          <DropZone
            box="a"
            label={payload.boxes.a}
            disabled={disabled}
            onChoose={decide}
            className="md:order-1"
          />
          <DropZone
            box="b"
            label={payload.boxes.b}
            disabled={disabled}
            onChoose={decide}
            className="md:order-3"
          />
        </div>
      </div>
    </DndContext>
  );
}

function DraggableCard({ card, disabled }: { card: DosCajasCard; disabled: boolean }) {
  const reduceMotion = useReducedMotion();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.id,
    disabled,
  });

  return (
    <motion.div
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION.base, ease: EASE.out }}
      className="w-full"
    >
      <div
        ref={setNodeRef}
        style={{ transform: CSS.Translate.toString(transform) }}
        className={cn(
          "flex min-h-32 w-full touch-none items-center justify-center rounded-lg border border-border bg-surface-raised p-5 text-center shadow-md select-none [-webkit-tap-highlight-color:transparent] focus-visible:shadow-glow-primary",
          disabled ? "opacity-50" : "cursor-grab active:cursor-grabbing",
          isDragging && "z-(--z-sticky) shadow-lg motion-safe:rotate-2",
        )}
        {...attributes}
        {...listeners}
      >
        <p className="type-prompt text-text text-balance">{card.text}</p>
      </div>
    </motion.div>
  );
}

interface DropZoneProps {
  box: Box;
  label: string;
  disabled: boolean;
  onChoose: (box: Box) => void;
  className?: string;
}

function DropZone({ box, label, disabled, onChoose, className }: DropZoneProps) {
  const { setNodeRef, isOver } = useDroppable({ id: box, disabled });
  const letter = box.toUpperCase();

  return (
    <button
      ref={setNodeRef}
      type="button"
      disabled={disabled}
      aria-label={t.boxAria(letter, label)}
      onClick={() => onChoose(box)}
      className={cn(
        "flex min-h-14 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed bg-surface p-3 [-webkit-tap-highlight-color:transparent] md:min-h-64",
        "transition-[border-color,background-color] duration-(--duration-fast) focus-visible:shadow-glow-primary disabled:opacity-50",
        box === "a"
          ? "border-cat-1/60 enabled:hover:border-cat-1"
          : "border-cat-2/60 enabled:hover:border-cat-2",
        isOver && (box === "a" ? "border-cat-1 bg-cat-1/15" : "border-cat-2 bg-cat-2/15"),
        className,
      )}
    >
      <CategoryMark index={BOX_CATEGORY[box]} />
      <span className="type-h3 text-text">{label}</span>
      <Kbd>{box === "a" ? "←" : "→"}</Kbd>
    </button>
  );
}
