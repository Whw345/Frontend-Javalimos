"use client";

import { useEffect, useRef } from "react";

/** Clave = `KeyboardEvent.key` en minúsculas ("arrowleft", "enter", "escape", "h", "1"…). */
export type HotkeyMap = Partial<Record<string, (event: KeyboardEvent) => void>>;

function shouldIgnore(event: KeyboardEvent): boolean {
  if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) return true;

  const target = event.target;
  if (!(target instanceof HTMLElement)) return false;

  // Nunca mientras se escribe (§11.5).
  if (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return true;

  // Con un diálogo abierto (p. ej. "¿Salir del reto?") el teclado le pertenece al diálogo.
  if (target.closest('[role="dialog"], [role="alertdialog"]')) return true;

  // Enter/Espacio sobre un botón o link ya lo activa el navegador: evitamos el doble disparo.
  const isActivationKey = event.key === "Enter" || event.key === " ";
  if (isActivationKey && target.closest("button, a")) return true;

  return false;
}

/**
 * Único hook de atajos de teclado para el shell y los juegos (§11.5).
 * Solo está activo mientras `enabled` sea true (reto en curso).
 */
export function useGameHotkeys(hotkeys: HotkeyMap, { enabled }: { enabled: boolean }): void {
  const hotkeysRef = useRef(hotkeys);

  useEffect(() => {
    hotkeysRef.current = hotkeys;
  });

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (shouldIgnore(event)) return;
      const handler = hotkeysRef.current[event.key.toLowerCase()];
      if (!handler) return;
      event.preventDefault();
      handler(event);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}
