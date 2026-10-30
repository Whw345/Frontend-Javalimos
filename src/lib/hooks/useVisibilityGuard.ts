"use client";

import { useEffect, useRef } from "react";
import { ENABLE_TAB_GUARD } from "@/lib/config";

interface VisibilityGuardOptions {
  enabled: boolean;
  /** Solo se llama si el feature flag ENABLE_TAB_GUARD está activo. */
  onLeave?: () => void;
}

/**
 * §13: detecta cuando el estudiante sale de la pestaña durante un reto.
 * En v1 (flag apagado) solo registra el evento para analítica.
 */
export function useVisibilityGuard({ enabled, onLeave }: VisibilityGuardOptions): void {
  const onLeaveRef = useRef(onLeave);

  useEffect(() => {
    onLeaveRef.current = onLeave;
  });

  useEffect(() => {
    if (!enabled) return;

    const handleLeave = (reason: "hidden" | "blur") => {
      // TODO(analítica): reemplazar por el cliente de eventos cuando exista.
      console.info("[visibility-guard]", reason, new Date().toISOString());
      if (ENABLE_TAB_GUARD) onLeaveRef.current?.();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") handleLeave("hidden");
    };
    const onBlur = () => handleLeave("blur");

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onBlur);
    };
  }, [enabled]);
}
