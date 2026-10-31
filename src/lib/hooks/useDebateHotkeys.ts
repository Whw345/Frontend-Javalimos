"use client";

import { useEffect, useRef } from "react";
import { useGameHotkeys, type HotkeyMap } from "./useGameHotkeys";

interface ModifierHotkeys {
  /** Ctrl/⌘ + Enter. */
  submit: () => void;
  /** Ctrl/⌘ + M. */
  dictate: () => void;
  /** Esc con el foco en el campo de respuesta (fuera de él lo atiende `useGameHotkeys`). */
  exit: () => void;
}

/**
 * Atajos del Debate (§12.1 del spec). Las teclas sueltas (Espacio, P, R, L, Esc) usan el hook
 * común y se ignoran mientras se escribe; Ctrl/⌘+Enter y Ctrl/⌘+M funcionan también en el campo.
 */
export function useDebateHotkeys(
  hotkeys: HotkeyMap,
  modifiers: ModifierHotkeys,
  { enabled }: { enabled: boolean },
): void {
  useGameHotkeys(hotkeys, { enabled });
  const modifiersRef = useRef(modifiers);

  useEffect(() => {
    modifiersRef.current = modifiers;
  });

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (target?.closest('[role="dialog"], [role="alertdialog"]')) return;

      const withModifier = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      if (withModifier && key === "enter") {
        event.preventDefault();
        modifiersRef.current.submit();
      } else if (withModifier && key === "m") {
        event.preventDefault();
        modifiersRef.current.dictate();
      } else if (key === "escape" && target?.tagName === "TEXTAREA") {
        event.preventDefault();
        target.blur();
        modifiersRef.current.exit();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}
