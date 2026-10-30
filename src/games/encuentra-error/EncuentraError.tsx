"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { TextHint } from "@/components/game/TextHint";
import { Kbd } from "@/components/ui/Kbd";
import { copy } from "@/content/copy";
import { useGameHotkeys, type HotkeyMap } from "@/lib/hooks/useGameHotkeys";
import { cn } from "@/lib/utils/cn";
import { DURATION } from "@/styles/motion";
import type { GameProps } from "../types";
import type { EncuentraErrorAnswer, EncuentraErrorPayload } from "./schema";

const t = copy.games.encuentraError;
const AUTO_SUBMIT_DELAY_MS = DURATION.slow * 1000;

/** Encuentra el error: líneas numeradas tipo editor; se toca la incorrecta y se envía sola. */
export function EncuentraError({
  payload,
  disabled,
  hint,
  onAnswerChange,
  onSubmit,
}: GameProps<EncuentraErrorPayload, EncuentraErrorAnswer>) {
  const [chosen, setChosen] = useState<string | null>(null);

  const report = useEffectEvent((lineId: string | null) => onAnswerChange({ lineId }, lineId !== null));
  const submit = useEffectEvent((lineId: string) => onSubmit({ lineId }));

  useEffect(() => {
    report(chosen);
    if (!chosen) return;
    const id = window.setTimeout(() => submit(chosen), AUTO_SUBMIT_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [chosen]);

  const choose = (lineId: string) => {
    if (!disabled && !chosen) setChosen(lineId);
  };

  const hotkeys: HotkeyMap = {};
  payload.lines.forEach((line, index) => {
    hotkeys[String(index + 1)] = () => choose(line.id);
  });
  useGameHotkeys(hotkeys, { enabled: !disabled });

  return (
    <div className="flex h-full min-h-0 flex-col justify-center gap-3 py-2">
      <TextHint hint={hint} />
      <ol
        aria-label={t.linesLabel}
        className="flex min-h-0 flex-col overflow-y-auto overscroll-contain rounded-lg border border-border bg-surface-sunken p-2"
      >
        {payload.lines.map((line, index) => {
          const selected = chosen === line.id;
          return (
            <li key={line.id}>
              <button
                type="button"
                disabled={disabled || (chosen !== null && !selected)}
                onClick={() => choose(line.id)}
                className={cn(
                  "flex min-h-12 w-full items-center gap-4 rounded-md border border-transparent px-3 py-2 text-left [-webkit-tap-highlight-color:transparent] lg:min-h-14",
                  "transition-[background-color,border-color,box-shadow] duration-(--duration-fast) focus-visible:shadow-glow-primary",
                  "enabled:hover:bg-surface-raised disabled:opacity-50",
                  selected && "border-primary bg-primary-soft shadow-glow-primary disabled:opacity-100",
                )}
              >
                <span aria-hidden className="w-6 shrink-0 text-right type-code text-text-muted tabular-nums">
                  {index + 1}
                </span>
                <span
                  className={cn("min-w-0 flex-1 text-text", payload.monospace ? "type-code" : "type-body-lg")}
                >
                  {line.text}
                </span>
                <Kbd>{index + 1}</Kbd>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
