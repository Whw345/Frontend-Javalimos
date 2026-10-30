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
import { useEffect, useEffectEvent, useState } from "react";
import { GameTile } from "@/components/game/GameTile";
import { TextHint } from "@/components/game/TextHint";
import { copy } from "@/content/copy";
import { useGameHotkeys, type HotkeyMap } from "@/lib/hooks/useGameHotkeys";
import { cn } from "@/lib/utils/cn";
import { DURATION } from "@/styles/motion";
import type { GameProps } from "../types";
import { optionText } from "./logic";
import type { HuecoAnswer, HuecoPayload } from "./schema";

const t = copy.games.hueco;
const BLANK_ID = "blank";
/** Pausa para que se vea la ficha en el hueco antes de enviarse sola. */
const AUTO_SUBMIT_DELAY_MS = DURATION.slow * 1000;

/** Hueco: se toca una ficha (o se arrastra al hueco) y el reto se envía solo. */
export function Hueco({
  payload,
  disabled,
  hint,
  onAnswerChange,
  onSubmit,
}: GameProps<HuecoPayload, HuecoAnswer>) {
  const [chosen, setChosen] = useState<string | null>(null);
  // Sin KeyboardSensor: con teclado, Enter/Espacio sobre la ficha la elige (y están los atajos 1–4).
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const submit = useEffectEvent((optionId: string) => onSubmit({ optionId }));
  const report = useEffectEvent((optionId: string | null) => onAnswerChange({ optionId }, optionId !== null));

  useEffect(() => {
    report(chosen);
    if (!chosen) return;
    const id = window.setTimeout(() => submit(chosen), AUTO_SUBMIT_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [chosen]);

  const choose = (optionId: string) => {
    if (!disabled && !chosen) setChosen(optionId);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (over?.id === BLANK_ID) choose(String(active.id));
  };

  const hotkeys: HotkeyMap = {};
  payload.options.forEach((option, index) => {
    hotkeys[String(index + 1)] = () => choose(option.id);
  });
  useGameHotkeys(hotkeys, { enabled: !disabled });

  const locked = disabled || chosen !== null;

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex h-full flex-col justify-center gap-6 py-2 lg:gap-8">
        <TextHint hint={hint} />
        <p className="type-prompt text-text">
          {payload.before}
          <Blank text={optionText(payload, chosen)} />
          {payload.after}
        </p>
        <ul
          aria-label={t.optionsLabel}
          className="grid gap-3 sm:grid-cols-2 lg:auto-cols-fr lg:grid-flow-col"
        >
          {payload.options.map((option, index) => (
            <li key={option.id}>
              <DraggableOption
                id={option.id}
                text={option.text}
                shortcut={String(index + 1)}
                selected={chosen === option.id}
                disabled={locked && chosen !== option.id}
                onChoose={() => choose(option.id)}
              />
            </li>
          ))}
        </ul>
      </div>
    </DndContext>
  );
}

function Blank({ text }: { text: string | null }) {
  const { setNodeRef, isOver } = useDroppable({ id: BLANK_ID });
  return (
    <span
      ref={setNodeRef}
      aria-label={text ?? t.blankAria}
      className={cn(
        "mx-1 inline-flex min-w-32 items-center justify-center rounded-md border-2 px-3 align-baseline transition-[border-color,background-color] duration-(--duration-fast)",
        text
          ? "border-primary bg-primary-soft text-text"
          : "border-dashed border-border-strong text-text-muted",
        isOver && "border-primary bg-primary-soft",
      )}
    >
      {text ?? " "}
    </span>
  );
}

interface DraggableOptionProps {
  id: string;
  text: string;
  shortcut: string;
  selected: boolean;
  disabled: boolean;
  onChoose: () => void;
}

function DraggableOption({ id, text, shortcut, selected, disabled, onChoose }: DraggableOptionProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id, disabled });
  return (
    <GameTile
      ref={setNodeRef}
      state={selected ? "selected" : "idle"}
      shortcut={shortcut}
      disabled={disabled}
      onClick={onChoose}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn("touch-none", isDragging && "z-(--z-sticky) shadow-lg")}
      {...attributes}
      {...listeners}
    >
      {text}
    </GameTile>
  );
}
