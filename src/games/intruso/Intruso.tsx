"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { GameTile } from "@/components/game/GameTile";
import { TextHint } from "@/components/game/TextHint";
import { copy } from "@/content/copy";
import { useGameHotkeys, type HotkeyMap } from "@/lib/hooks/useGameHotkeys";
import { DURATION } from "@/styles/motion";
import type { GameProps } from "../types";
import type { IntrusoAnswer, IntrusoPayload } from "./schema";

const t = copy.games.intruso;
const AUTO_SUBMIT_DELAY_MS = DURATION.slow * 1000;

/** El intruso: 4 fichas (en fila en desktop, 2 × 2 en móvil); se toca la que no pertenece. */
export function Intruso({
  payload,
  disabled,
  hint,
  onAnswerChange,
  onSubmit,
}: GameProps<IntrusoPayload, IntrusoAnswer>) {
  const [chosen, setChosen] = useState<string | null>(null);

  const report = useEffectEvent((itemId: string | null) => onAnswerChange({ itemId }, itemId !== null));
  const submit = useEffectEvent((itemId: string) => onSubmit({ itemId }));

  useEffect(() => {
    report(chosen);
    if (!chosen) return;
    const id = window.setTimeout(() => submit(chosen), AUTO_SUBMIT_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [chosen]);

  const choose = (itemId: string) => {
    if (!disabled && !chosen) setChosen(itemId);
  };

  const hotkeys: HotkeyMap = {};
  payload.items.forEach((item, index) => {
    hotkeys[String(index + 1)] = () => choose(item.id);
  });
  useGameHotkeys(hotkeys, { enabled: !disabled });

  return (
    <div className="flex h-full flex-col justify-center gap-4 py-2">
      <TextHint hint={hint} />
      <ul aria-label={t.gridLabel} className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
        {payload.items.map((item, index) => (
          <li key={item.id}>
            <GameTile
              state={chosen === item.id ? "selected" : "idle"}
              shortcut={String(index + 1)}
              disabled={disabled || (chosen !== null && chosen !== item.id)}
              onClick={() => choose(item.id)}
              className="min-h-24 justify-center text-center lg:min-h-32"
            >
              {item.text}
            </GameTile>
          </li>
        ))}
      </ul>
    </div>
  );
}
