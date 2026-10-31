"use client";

import { useEffect, useRef } from "react";

interface VisibilityGuardOptions {
  enabled: boolean;
  onLeave?: () => void;
}

/**
 * Detecta cuando el estudiante sale de la pestaña durante un reto.
 * La acción se ejecuta una sola vez por evento de salida; el componente decide
 * si eso significa fallar la pregunta o avanzar la ronda.
 */
export function useVisibilityGuard({ enabled, onLeave }: VisibilityGuardOptions): void {
  const onLeaveRef = useRef(onLeave);

  useEffect(() => {
    onLeaveRef.current = onLeave;
  });

  useEffect(() => {
    if (!enabled) return;
    const away = { current: false };

    const handleLeave = (reason: "hidden" | "blur") => {
      if (away.current) return;
      away.current = true;
      console.info("[visibility-guard]", reason, new Date().toISOString());
      onLeaveRef.current?.();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") handleLeave("hidden");
      else away.current = false;
    };
    const onBlur = () => handleLeave("blur");
    const onFocus = () => {
      away.current = false;
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
    };
  }, [enabled]);
}
