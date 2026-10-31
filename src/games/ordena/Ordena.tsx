"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronUp, GripVertical, Lightbulb } from "lucide-react";
import { Fragment, useEffect, useEffectEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { copy } from "@/content/copy";
import { cn } from "@/lib/utils/cn";
import type { GameProps } from "../types";
import { initialOrder, moveStep } from "./logic";
import { ordenaHintSchema, type OrdenaAnswer, type OrdenaPayload, type OrdenaStep } from "./schema";

const t = copy.games.ordena;

/**
 * Ordena: los números de la izquierda son fijos y los pasos se reordenan a su lado.
 * Arrastre (mouse/táctil), teclado (Espacio + flechas, KeyboardSensor) o botones ↑ ↓.
 */
export function Ordena({ payload, disabled, hint, onAnswerChange }: GameProps<OrdenaPayload, OrdenaAnswer>) {
  const [order, setOrder] = useState(() => initialOrder(payload));
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const report = useEffectEvent((current: string[]) => onAnswerChange({ order: current }, true));
  useEffect(() => report(order), [order]);

  const stepById = (id: string) => payload.steps.find((step) => step.id === id);
  const textOf = (id: string | number) => stepById(String(id))?.text ?? "";
  const positionOf = (id: string | number) => order.indexOf(String(id)) + 1;

  const parsedHint = ordenaHintSchema.safeParse(hint);
  const hintStep = parsedHint.success ? stepById(parsedHint.data.stepId) : undefined;

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    setOrder((current) =>
      moveStep(current, current.indexOf(String(active.id)), current.indexOf(String(over.id))),
    );
  };

  const move = (from: number, to: number) => {
    if (!disabled) setOrder((current) => moveStep(current, from, to));
  };

  const announcements: Announcements = {
    onDragStart: ({ active }) => t.announce.start(textOf(active.id)),
    onDragOver: ({ active, over }) =>
      over ? t.announce.over(textOf(active.id), positionOf(over.id)) : undefined,
    onDragEnd: ({ active, over }) =>
      over ? t.announce.end(textOf(active.id), positionOf(over.id)) : t.announce.cancel(textOf(active.id)),
    onDragCancel: ({ active }) => t.announce.cancel(textOf(active.id)),
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 py-2">
      {hintStep && parsedHint.success && (
        <p className="flex items-center gap-2 type-body text-info">
          <Lightbulb aria-hidden className="size-4 shrink-0" />
          {t.hintText(hintStep.text, parsedHint.data.position)}
        </p>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        accessibility={{ announcements, screenReaderInstructions: { draggable: t.dndInstructions } }}
      >
        <SortableContext items={order} strategy={verticalListSortingStrategy} disabled={disabled}>
          {/*
           * Una sola grilla: cada fila = número fijo + paso. La fila toma el alto del paso,
           * así el texto nunca se corta y el número siempre queda alineado con su paso.
           */}
          <div
            role="list"
            aria-label={t.listLabel}
            className="grid min-h-0 flex-1 grid-cols-[1.5rem_minmax(0,1fr)] content-start gap-x-2 gap-y-2 overflow-y-auto overscroll-contain lg:grid-cols-[2.5rem_minmax(0,1fr)] lg:gap-x-3"
          >
            {order.map((id, index) => {
              const step = stepById(id);
              return step ? (
                <Fragment key={id}>
                  <span
                    aria-hidden
                    className="flex items-center justify-center type-h3 text-text-muted tabular-nums"
                  >
                    {index + 1}
                  </span>
                  <SortableStep
                    step={step}
                    index={index}
                    total={order.length}
                    disabled={disabled}
                    onMove={move}
                  />
                </Fragment>
              ) : null;
            })}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

interface SortableStepProps {
  step: OrdenaStep;
  index: number;
  total: number;
  disabled: boolean;
  onMove: (from: number, to: number) => void;
}

function SortableStep({ step, index, total, disabled, onMove }: SortableStepProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: step.id, disabled });

  return (
    <div
      ref={setNodeRef}
      role="listitem"
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "relative flex min-h-16 items-center gap-1 rounded-lg border border-border bg-surface-raised p-1 short:min-h-14",
        isDragging && "z-(--z-sticky) border-primary shadow-lg motion-safe:scale-[1.03] motion-safe:rotate-2",
        disabled && "opacity-50",
      )}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        aria-label={t.dragHandle(step.text)}
        disabled={disabled}
        className="flex min-h-11 flex-1 cursor-grab items-center gap-3 rounded-md px-3 text-left [-webkit-tap-highlight-color:transparent] focus-visible:shadow-glow-primary active:cursor-grabbing disabled:cursor-default"
        {...attributes}
        {...listeners}
      >
        <GripVertical aria-hidden className="size-5 shrink-0 text-text-muted" />
        <span className="py-1 type-body-lg text-text">{step.text}</span>
      </button>
      {/* En móvil, ↑ ↓ apilados para dejarle ancho al texto. */}
      <div className="flex shrink-0 flex-col sm:flex-row">
        <Button
          variant="ghost"
          size="icon"
          aria-label={t.moveUp(step.text)}
          disabled={disabled || index === 0}
          onClick={() => onMove(index, index - 1)}
        >
          <ChevronUp aria-hidden />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t.moveDown(step.text)}
          disabled={disabled || index === total - 1}
          onClick={() => onMove(index, index + 1)}
        >
          <ChevronDown aria-hidden />
        </Button>
      </div>
    </div>
  );
}
